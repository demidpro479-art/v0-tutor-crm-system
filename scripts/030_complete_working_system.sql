-- Полная рабочая система CRM для репетиторов
-- Исправляет все ошибки и добавляет улучшенный функционал

-- Удаляем старые триггеры и функции
DROP TRIGGER IF EXISTS trigger_calculate_tutor_earning ON lessons;
DROP TRIGGER IF EXISTS trigger_add_manager_sale ON transactions;
DROP TRIGGER IF EXISTS trigger_record_lesson_earning ON lessons;
DROP FUNCTION IF EXISTS calculate_tutor_earning();
DROP FUNCTION IF EXISTS add_manager_sale();
DROP FUNCTION IF EXISTS record_lesson_earning();
DROP FUNCTION IF EXISTS update_salary_payment_status(UUID, TEXT, UUID, TEXT);
DROP FUNCTION IF EXISTS cancel_lesson_earning(UUID, UUID, TEXT);

-- Создаем таблицу earnings если не существует
CREATE TABLE IF NOT EXISTS earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  total_amount NUMERIC(10, 2) DEFAULT 0,
  paid_amount NUMERIC(10, 2) DEFAULT 0,
  pending_amount NUMERIC(10, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, week_start)
);

CREATE INDEX IF NOT EXISTS idx_earnings_user_id ON earnings(user_id);
CREATE INDEX IF NOT EXISTS idx_earnings_week_start ON earnings(week_start);

-- Обновляем таблицу salary_payments
ALTER TABLE salary_payments 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'rejected')),
ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS processed_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ;

-- Создаем таблицу истории транзакций
CREATE TABLE IF NOT EXISTS transaction_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('earning', 'payment', 'commission', 'refund', 'adjustment')),
  amount NUMERIC(10, 2) NOT NULL,
  description TEXT,
  related_lesson_id UUID REFERENCES lessons(id) ON DELETE SET NULL,
  related_transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
  related_salary_payment_id UUID REFERENCES salary_payments(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'cancelled')),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_transaction_history_user_id ON transaction_history(user_id);
CREATE INDEX IF NOT EXISTS idx_transaction_history_type ON transaction_history(transaction_type);
CREATE INDEX IF NOT EXISTS idx_transaction_history_created_at ON transaction_history(created_at);

-- Функция для начисления заработка репетитору
CREATE OR REPLACE FUNCTION record_tutor_earning()
RETURNS TRIGGER AS $$
DECLARE
  v_tutor_id UUID;
  v_rate NUMERIC(10, 2);
  v_week_start DATE;
  v_week_end DATE;
BEGIN
  -- Только для completed уроков
  IF NEW.status = 'completed' AND (OLD IS NULL OR OLD.status != 'completed') THEN
    -- Получаем репетитора и ставку
    SELECT s.tutor_id, COALESCE(ts.rate_per_lesson, 0)
    INTO v_tutor_id, v_rate
    FROM students s
    LEFT JOIN tutor_settings ts ON s.tutor_id = ts.user_id
    WHERE s.id = NEW.student_id;
    
    IF v_tutor_id IS NOT NULL AND v_rate > 0 THEN
      v_week_start := DATE_TRUNC('week', NEW.scheduled_at)::DATE;
      v_week_end := v_week_start + INTERVAL '6 days';
      
      -- Обновляем earnings
      INSERT INTO earnings (user_id, week_start, week_end, total_amount, pending_amount)
      VALUES (v_tutor_id, v_week_start, v_week_end, v_rate, v_rate)
      ON CONFLICT (user_id, week_start)
      DO UPDATE SET
        total_amount = earnings.total_amount + v_rate,
        pending_amount = earnings.pending_amount + v_rate,
        updated_at = NOW();
      
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

-- Создаем триггер
CREATE TRIGGER trigger_record_tutor_earning
  AFTER INSERT OR UPDATE ON lessons
  FOR EACH ROW
  EXECUTE FUNCTION record_tutor_earning();

-- Функция для добавления продажи менеджеру
CREATE OR REPLACE FUNCTION record_manager_commission()
RETURNS TRIGGER AS $$
DECLARE
  v_week_start DATE;
  v_week_end DATE;
  v_commission NUMERIC(10, 2);
BEGIN
  IF NEW.manager_id IS NOT NULL THEN
    v_week_start := DATE_TRUNC('week', NEW.created_at)::DATE;
    v_week_end := v_week_start + INTERVAL '6 days';
    v_commission := NEW.amount * 0.05; -- 5% комиссия
    
    -- Добавляем запись о продаже
    INSERT INTO manager_sales (manager_id, transaction_id, amount, week_start)
    VALUES (NEW.manager_id, NEW.id, NEW.amount, v_week_start);
    
    -- Обновляем earnings менеджера
    INSERT INTO earnings (user_id, week_start, week_end, total_amount, pending_amount)
    VALUES (NEW.manager_id, v_week_start, v_week_end, v_commission, v_commission)
    ON CONFLICT (user_id, week_start)
    DO UPDATE SET
      total_amount = earnings.total_amount + v_commission,
      pending_amount = earnings.pending_amount + v_commission,
      updated_at = NOW();
    
    -- Добавляем в историю транзакций
    INSERT INTO transaction_history (
      user_id, transaction_type, amount, description,
      related_transaction_id, status
    ) VALUES (
      NEW.manager_id, 'commission', v_commission,
      'Комиссия 5% от продажи',
      NEW.id, 'completed'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Создаем триггер для комиссии менеджера
CREATE TRIGGER trigger_record_manager_commission
  AFTER INSERT ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION record_manager_commission();

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
BEGIN
  -- Получаем информацию о выплате
  SELECT * INTO v_payment FROM salary_payments WHERE id = p_payment_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Payment not found');
  END IF;
  
  -- Обновляем статус выплаты
  UPDATE salary_payments
  SET 
    status = p_status,
    processed_by = p_processed_by,
    processed_at = NOW(),
    rejection_reason = p_rejection_reason,
    paid_at = CASE WHEN p_status = 'paid' THEN NOW() ELSE NULL END
  WHERE id = p_payment_id;
  
  -- Если выплата одобрена
  IF p_status = 'paid' THEN
    UPDATE earnings
    SET 
      paid_amount = paid_amount + v_payment.amount,
      pending_amount = GREATEST(pending_amount - v_payment.amount, 0),
      updated_at = NOW()
    WHERE user_id = v_payment.user_id 
      AND week_start = v_payment.period_start;
    
    INSERT INTO transaction_history (
      user_id, transaction_type, amount, description, 
      related_salary_payment_id, created_by, status
    ) VALUES (
      v_payment.user_id, 'payment', v_payment.amount, 
      'Выплата зарплаты за период ' || v_payment.period_start::TEXT || ' - ' || v_payment.period_end::TEXT,
      p_payment_id, p_processed_by, 'completed'
    );
  
  -- Если выплата отклонена
  ELSIF p_status = 'rejected' THEN
    UPDATE earnings
    SET 
      pending_amount = GREATEST(pending_amount - v_payment.amount, 0),
      updated_at = NOW()
    WHERE user_id = v_payment.user_id 
      AND week_start = v_payment.period_start;
    
    INSERT INTO transaction_history (
      user_id, transaction_type, amount, description, 
      related_salary_payment_id, created_by, status
    ) VALUES (
      v_payment.user_id, 'payment', v_payment.amount, 
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
  v_earning_amount NUMERIC(10, 2);
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
  v_week_start := DATE_TRUNC('week', v_lesson.scheduled_at)::DATE;
  
  -- Уменьшаем заработок репетитора
  UPDATE earnings
  SET 
    total_amount = GREATEST(total_amount - v_earning_amount, 0),
    pending_amount = GREATEST(pending_amount - v_earning_amount, 0),
    updated_at = NOW()
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

-- Функция для получения статистики выплат
CREATE OR REPLACE FUNCTION get_payment_stats(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_total_earned NUMERIC(10, 2);
  v_total_paid NUMERIC(10, 2);
  v_total_pending NUMERIC(10, 2);
  v_total_rejected NUMERIC(10, 2);
BEGIN
  SELECT 
    COALESCE(SUM(total_amount), 0),
    COALESCE(SUM(paid_amount), 0),
    COALESCE(SUM(pending_amount), 0)
  INTO v_total_earned, v_total_paid, v_total_pending
  FROM earnings
  WHERE user_id = p_user_id;
  
  SELECT COALESCE(SUM(amount), 0)
  INTO v_total_rejected
  FROM salary_payments
  WHERE user_id = p_user_id AND status = 'rejected';
  
  RETURN json_build_object(
    'total_earned', v_total_earned,
    'total_paid', v_total_paid,
    'total_pending', v_total_pending,
    'total_rejected', v_total_rejected,
    'balance', v_total_earned - v_total_paid
  );
END;
$$ LANGUAGE plpgsql;

-- Функция для улучшенного обновления регулярного расписания
CREATE OR REPLACE FUNCTION update_recurring_schedule_and_future_lessons(
  p_schedule_id UUID,
  p_new_time TIME,
  p_new_day_of_week INTEGER
)
RETURNS JSON AS $$
DECLARE
  v_schedule RECORD;
  v_deleted_count INTEGER;
  v_created_count INTEGER;
BEGIN
  -- Получаем текущее расписание
  SELECT * INTO v_schedule FROM recurring_schedules WHERE id = p_schedule_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Schedule not found');
  END IF;
  
  -- Удаляем все будущие уроки по этому расписанию
  DELETE FROM lessons
  WHERE student_id = v_schedule.student_id
    AND day_of_week = v_schedule.day_of_week
    AND time_of_day = v_schedule.time_of_day
    AND scheduled_at > NOW()
    AND status = 'scheduled';
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  -- Обновляем расписание
  UPDATE recurring_schedules
  SET 
    time_of_day = p_new_time,
    day_of_week = p_new_day_of_week,
    updated_at = NOW()
  WHERE id = p_schedule_id;
  
  -- Создаем новые уроки на следующие 3 месяца
  INSERT INTO lessons (student_id, scheduled_at, status, day_of_week, time_of_day, tutor_id)
  SELECT 
    v_schedule.student_id,
    generate_series(
      DATE_TRUNC('week', NOW()) + (p_new_day_of_week || ' days')::INTERVAL + p_new_time::TIME,
      NOW() + INTERVAL '3 months',
      '1 week'::INTERVAL
    ) AS scheduled_at,
    'scheduled',
    p_new_day_of_week,
    p_new_time,
    (SELECT tutor_id FROM students WHERE id = v_schedule.student_id)
  WHERE generate_series >= NOW();
  
  GET DIAGNOSTICS v_created_count = ROW_COUNT;
  
  RETURN json_build_object(
    'success', true,
    'deleted_lessons', v_deleted_count,
    'created_lessons', v_created_count
  );
END;
$$ LANGUAGE plpgsql;

-- Обновляем существующие данные
UPDATE earnings SET pending_amount = total_amount - COALESCE(paid_amount, 0) WHERE pending_amount IS NULL;

COMMENT ON FUNCTION record_tutor_earning IS 'Начисляет заработок репетитору при проведении урока';
COMMENT ON FUNCTION record_manager_commission IS 'Начисляет комиссию менеджеру от продажи';
COMMENT ON FUNCTION update_salary_payment_status IS 'Обновляет статус выплаты (одобрить/отклонить)';
COMMENT ON FUNCTION cancel_lesson_earning IS 'Отменяет начисление за урок';
COMMENT ON FUNCTION get_payment_stats IS 'Получает статистику выплат пользователя';
COMMENT ON FUNCTION update_recurring_schedule_and_future_lessons IS 'Обновляет регулярное расписание и все будущие уроки';
