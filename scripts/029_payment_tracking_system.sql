-- Система отслеживания выплат и улучшений
-- Добавляет статусы выплат, историю транзакций, и возможность отмены начислений

-- Добавляем статусы к выплатам зарплат
ALTER TABLE salary_payments 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'rejected')),
ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS processed_by UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ;

-- Создаем таблицу истории транзакций для полного аудита
CREATE TABLE IF NOT EXISTS transaction_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('earning', 'payment', 'commission', 'refund', 'adjustment')),
  amount DECIMAL(10, 2) NOT NULL,
  description TEXT,
  related_lesson_id UUID REFERENCES lessons(id) ON DELETE SET NULL,
  related_payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  related_salary_payment_id UUID REFERENCES salary_payments(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'cancelled')),
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT
);

-- Создаем индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_transaction_history_user_id ON transaction_history(user_id);
CREATE INDEX IF NOT EXISTS idx_transaction_history_type ON transaction_history(transaction_type);
CREATE INDEX IF NOT EXISTS idx_transaction_history_status ON transaction_history(status);
CREATE INDEX IF NOT EXISTS idx_transaction_history_created_at ON transaction_history(created_at);

-- Добавляем поля для отслеживания выплат в earnings
ALTER TABLE earnings
ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS pending_amount DECIMAL(10, 2) DEFAULT 0;

-- Функция для обновления статуса выплаты
CREATE OR REPLACE FUNCTION update_salary_payment_status(
  p_payment_id UUID,
  p_status TEXT,
  p_processed_by UUID,
  p_rejection_reason TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_payment RECORD;
  v_user_id UUID;
  v_amount DECIMAL(10, 2);
BEGIN
  -- Получаем информацию о выплате
  SELECT * INTO v_payment FROM salary_payments WHERE id = p_payment_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Payment not found');
  END IF;
  
  v_user_id := v_payment.user_id;
  v_amount := v_payment.amount;
  
  -- Обновляем статус выплаты
  UPDATE salary_payments
  SET 
    status = p_status,
    processed_by = p_processed_by,
    processed_at = NOW(),
    rejection_reason = p_rejection_reason
  WHERE id = p_payment_id;
  
  -- Если выплата одобрена
  IF p_status = 'paid' THEN
    -- Обновляем earnings
    UPDATE earnings
    SET 
      paid_amount = paid_amount + v_amount,
      pending_amount = GREATEST(pending_amount - v_amount, 0)
    WHERE user_id = v_user_id 
      AND week_start = v_payment.period_start;
    
    -- Добавляем в историю транзакций
    INSERT INTO transaction_history (
      user_id, transaction_type, amount, description, 
      related_salary_payment_id, created_by, status
    ) VALUES (
      v_user_id, 'payment', v_amount, 
      'Выплата зарплаты за период ' || v_payment.period_start::TEXT || ' - ' || v_payment.period_end::TEXT,
      p_payment_id, p_processed_by, 'completed'
    );
  
  -- Если выплата отклонена
  ELSIF p_status = 'rejected' THEN
    -- Обнуляем pending_amount
    UPDATE earnings
    SET pending_amount = GREATEST(pending_amount - v_amount, 0)
    WHERE user_id = v_user_id 
      AND week_start = v_payment.period_start;
    
    -- Добавляем в историю транзакций
    INSERT INTO transaction_history (
      user_id, transaction_type, amount, description, 
      related_salary_payment_id, created_by, status
    ) VALUES (
      v_user_id, 'payment', v_amount, 
      'Отклонена выплата: ' || COALESCE(p_rejection_reason, 'Не указана причина'),
      p_payment_id, p_processed_by, 'cancelled'
    );
  END IF;
  
  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql;

-- Функция для отмены начисления за урок
CREATE OR REPLACE FUNCTION cancel_lesson_earning(
  p_lesson_id UUID,
  p_cancelled_by UUID,
  p_reason TEXT
)
RETURNS JSON AS $$
DECLARE
  v_lesson RECORD;
  v_tutor_id UUID;
  v_earning_amount DECIMAL(10, 2);
  v_week_start DATE;
BEGIN
  -- Получаем информацию об уроке
  SELECT l.*, s.tutor_id, ts.rate_per_lesson
  INTO v_lesson
  FROM lessons l
  JOIN students s ON l.student_id = s.id
  LEFT JOIN tutor_settings ts ON s.tutor_id = ts.user_id
  WHERE l.id = p_lesson_id AND l.status = 'completed';
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Lesson not found or not completed');
  END IF;
  
  v_tutor_id := v_lesson.tutor_id;
  v_earning_amount := COALESCE(v_lesson.rate_per_lesson, 0);
  v_week_start := date_trunc('week', v_lesson.scheduled_at)::DATE;
  
  -- Уменьшаем заработок репетитора
  UPDATE earnings
  SET 
    total_amount = GREATEST(total_amount - v_earning_amount, 0),
    pending_amount = GREATEST(pending_amount - v_earning_amount, 0)
  WHERE user_id = v_tutor_id AND week_start = v_week_start;
  
  -- Добавляем в историю транзакций
  INSERT INTO transaction_history (
    user_id, transaction_type, amount, description,
    related_lesson_id, created_by, status
  ) VALUES (
    v_tutor_id, 'refund', -v_earning_amount,
    'Отмена начисления за урок: ' || p_reason,
    p_lesson_id, p_cancelled_by, 'completed'
  );
  
  RETURN json_build_object('success', true, 'refunded_amount', v_earning_amount);
END;
$$ LANGUAGE plpgsql;

-- Функция для получения статистики выплат репетитора
CREATE OR REPLACE FUNCTION get_tutor_payment_stats(p_tutor_id UUID)
RETURNS JSON AS $$
DECLARE
  v_total_earned DECIMAL(10, 2);
  v_total_paid DECIMAL(10, 2);
  v_total_pending DECIMAL(10, 2);
  v_total_rejected DECIMAL(10, 2);
BEGIN
  -- Общий заработок
  SELECT COALESCE(SUM(total_amount), 0)
  INTO v_total_earned
  FROM earnings
  WHERE user_id = p_tutor_id;
  
  -- Выплачено
  SELECT COALESCE(SUM(amount), 0)
  INTO v_total_paid
  FROM salary_payments
  WHERE user_id = p_tutor_id AND status = 'paid';
  
  -- В ожидании
  SELECT COALESCE(SUM(amount), 0)
  INTO v_total_pending
  FROM salary_payments
  WHERE user_id = p_tutor_id AND status = 'pending';
  
  -- Отклонено
  SELECT COALESCE(SUM(amount), 0)
  INTO v_total_rejected
  FROM salary_payments
  WHERE user_id = p_tutor_id AND status = 'rejected';
  
  RETURN json_build_object(
    'total_earned', v_total_earned,
    'total_paid', v_total_paid,
    'total_pending', v_total_pending,
    'total_rejected', v_total_rejected,
    'balance', v_total_earned - v_total_paid
  );
END;
$$ LANGUAGE plpgsql;

-- Обновляем триггер начисления заработка для добавления в историю
CREATE OR REPLACE FUNCTION record_lesson_earning()
RETURNS TRIGGER AS $$
DECLARE
  v_tutor_id UUID;
  v_rate DECIMAL(10, 2);
  v_week_start DATE;
BEGIN
  -- Только для completed уроков
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Получаем репетитора и ставку
    SELECT s.tutor_id, COALESCE(ts.rate_per_lesson, 0)
    INTO v_tutor_id, v_rate
    FROM students s
    LEFT JOIN tutor_settings ts ON s.tutor_id = ts.user_id
    WHERE s.id = NEW.student_id;
    
    IF v_tutor_id IS NOT NULL AND v_rate > 0 THEN
      v_week_start := date_trunc('week', NEW.scheduled_at)::DATE;
      
      -- Обновляем earnings
      INSERT INTO earnings (user_id, week_start, week_end, total_amount, pending_amount)
      VALUES (
        v_tutor_id,
        v_week_start,
        v_week_start + INTERVAL '6 days',
        v_rate,
        v_rate
      )
      ON CONFLICT (user_id, week_start)
      DO UPDATE SET
        total_amount = earnings.total_amount + v_rate,
        pending_amount = earnings.pending_amount + v_rate;
      
      -- Добавляем в историю транзакций
      INSERT INTO transaction_history (
        user_id, transaction_type, amount, description,
        related_lesson_id, status
      ) VALUES (
        v_tutor_id, 'earning', v_rate,
        'Начисление за проведенный урок',
        NEW.id, 'completed'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Пересоздаем триггер
DROP TRIGGER IF EXISTS trigger_record_lesson_earning ON lessons;
CREATE TRIGGER trigger_record_lesson_earning
  AFTER INSERT OR UPDATE ON lessons
  FOR EACH ROW
  EXECUTE FUNCTION record_lesson_earning();

-- Обновляем существующие данные
UPDATE earnings SET pending_amount = total_amount - COALESCE(paid_amount, 0) WHERE pending_amount IS NULL;

COMMENT ON TABLE transaction_history IS 'История всех финансовых транзакций для полного аудита';
COMMENT ON FUNCTION update_salary_payment_status IS 'Обновляет статус выплаты зарплаты (одобрить/отклонить)';
COMMENT ON FUNCTION cancel_lesson_earning IS 'Отменяет начисление за урок';
COMMENT ON FUNCTION get_tutor_payment_stats IS 'Получает статистику выплат репетитора';
