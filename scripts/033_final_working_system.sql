-- =====================================================
-- ФИНАЛЬНАЯ РАБОЧАЯ СИСТЕМА С РОЛЯМИ
-- =====================================================
-- Этот скрипт создает полную систему управления с 4 ролями:
-- 1. Главный Администратор (admin)
-- 2. Репетиторы (tutor)
-- 3. Менеджеры (manager)
-- 4. Ученики (student)

-- =====================================================
-- 1. ОБНОВЛЕНИЕ ТАБЛИЦЫ USERS (добавление ролей)
-- =====================================================

-- Добавляем колонку role если её нет
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'role'
  ) THEN
    ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'student' CHECK (role IN ('admin', 'tutor', 'manager', 'student'));
  END IF;
END $$;

-- Добавляем колонку full_name если её нет
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'full_name'
  ) THEN
    ALTER TABLE users ADD COLUMN full_name TEXT;
  END IF;
END $$;

-- Добавляем колонку avatar_url если её нет
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'avatar_url'
  ) THEN
    ALTER TABLE users ADD COLUMN avatar_url TEXT;
  END IF;
END $$;

-- =====================================================
-- 2. ТАБЛИЦА НАСТРОЕК РЕПЕТИТОРОВ
-- =====================================================

CREATE TABLE IF NOT EXISTS tutor_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  rate_per_lesson DECIMAL(10, 2) DEFAULT 0, -- Сколько репетитор получает за урок
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 3. ТАБЛИЦА ЗАРАБОТКА РЕПЕТИТОРОВ
-- =====================================================

CREATE TABLE IF NOT EXISTS tutor_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id UUID REFERENCES users(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'paid')),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(lesson_id) -- Один урок = одно начисление
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_tutor_earnings_tutor ON tutor_earnings(tutor_id);
CREATE INDEX IF NOT EXISTS idx_tutor_earnings_status ON tutor_earnings(status);
CREATE INDEX IF NOT EXISTS idx_tutor_earnings_created ON tutor_earnings(created_at);

-- =====================================================
-- 4. ТАБЛИЦА КОМИССИЙ МЕНЕДЖЕРОВ
-- =====================================================

CREATE TABLE IF NOT EXISTS manager_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id UUID REFERENCES users(id) ON DELETE CASCADE,
  payment_id UUID REFERENCES payments(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL, -- 5% от платежа
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'paid')),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(payment_id) -- Один платеж = одна комиссия
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_manager_commissions_manager ON manager_commissions(manager_id);
CREATE INDEX IF NOT EXISTS idx_manager_commissions_status ON manager_commissions(status);
CREATE INDEX IF NOT EXISTS idx_manager_commissions_created ON manager_commissions(created_at);

-- =====================================================
-- 5. ТАБЛИЦА ИСТОРИИ ТРАНЗАКЦИЙ
-- =====================================================

CREATE TABLE IF NOT EXISTS transaction_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('earning', 'commission', 'payment', 'deduction')),
  amount DECIMAL(10, 2) NOT NULL,
  description TEXT,
  reference_id UUID, -- ID связанной записи (lesson_id, payment_id и т.д.)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_transaction_history_user ON transaction_history(user_id);
CREATE INDEX IF NOT EXISTS idx_transaction_history_type ON transaction_history(transaction_type);
CREATE INDEX IF NOT EXISTS idx_transaction_history_created ON transaction_history(created_at);

-- =====================================================
-- 6. ФУНКЦИЯ: Начисление заработка репетитору за урок
-- =====================================================

CREATE OR REPLACE FUNCTION calculate_tutor_earning()
RETURNS TRIGGER AS $$
DECLARE
  tutor_rate DECIMAL(10, 2);
  tutor_user_id UUID;
BEGIN
  -- Проверяем что урок завершен
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    
    -- Получаем ID репетитора из урока
    tutor_user_id := NEW.tutor_id;
    
    -- Если tutor_id не указан, получаем из студента
    IF tutor_user_id IS NULL THEN
      SELECT tutor_id INTO tutor_user_id 
      FROM students 
      WHERE id = NEW.student_id;
    END IF;
    
    -- Получаем ставку репетитора
    SELECT rate_per_lesson INTO tutor_rate
    FROM tutor_settings
    WHERE user_id = tutor_user_id;
    
    -- Если ставка найдена, создаем начисление
    IF tutor_rate IS NOT NULL AND tutor_rate > 0 THEN
      INSERT INTO tutor_earnings (tutor_id, lesson_id, amount, status)
      VALUES (tutor_user_id, NEW.id, tutor_rate, 'pending')
      ON CONFLICT (lesson_id) DO NOTHING;
      
      -- Добавляем в историю транзакций
      INSERT INTO transaction_history (user_id, transaction_type, amount, description, reference_id)
      VALUES (tutor_user_id, 'earning', tutor_rate, 'Заработок за урок', NEW.id);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для автоматического начисления
DROP TRIGGER IF EXISTS trigger_calculate_tutor_earning ON lessons;
CREATE TRIGGER trigger_calculate_tutor_earning
  AFTER INSERT OR UPDATE OF status ON lessons
  FOR EACH ROW
  EXECUTE FUNCTION calculate_tutor_earning();

-- =====================================================
-- 7. ФУНКЦИЯ: Начисление комиссии менеджеру
-- =====================================================

CREATE OR REPLACE FUNCTION calculate_manager_commission()
RETURNS TRIGGER AS $$
DECLARE
  commission_amount DECIMAL(10, 2);
  manager_user_id UUID;
BEGIN
  -- Получаем ID менеджера из платежа или студента
  manager_user_id := NEW.created_by;
  
  IF manager_user_id IS NULL THEN
    SELECT manager_id INTO manager_user_id 
    FROM students 
    WHERE id = NEW.student_id;
  END IF;
  
  -- Проверяем что пользователь - менеджер
  IF EXISTS (SELECT 1 FROM users WHERE id = manager_user_id AND role = 'manager') THEN
    -- Рассчитываем 5% комиссию
    commission_amount := NEW.amount * 0.05;
    
    -- Создаем начисление комиссии
    INSERT INTO manager_commissions (manager_id, payment_id, amount, status)
    VALUES (manager_user_id, NEW.id, commission_amount, 'pending')
    ON CONFLICT (payment_id) DO NOTHING;
    
    -- Добавляем в историю транзакций
    INSERT INTO transaction_history (user_id, transaction_type, amount, description, reference_id)
    VALUES (manager_user_id, 'commission', commission_amount, 'Комиссия 5% от платежа', NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для автоматического начисления комиссии
DROP TRIGGER IF EXISTS trigger_calculate_manager_commission ON payments;
CREATE TRIGGER trigger_calculate_manager_commission
  AFTER INSERT ON payments
  FOR EACH ROW
  EXECUTE FUNCTION calculate_manager_commission();

-- =====================================================
-- 8. ФУНКЦИЯ: Одобрение выплаты
-- =====================================================

CREATE OR REPLACE FUNCTION approve_payment(
  payment_type TEXT, -- 'earning' или 'commission'
  payment_id UUID
)
RETURNS VOID AS $$
BEGIN
  IF payment_type = 'earning' THEN
    UPDATE tutor_earnings
    SET status = 'approved'
    WHERE id = payment_id AND status = 'pending';
  ELSIF payment_type = 'commission' THEN
    UPDATE manager_commissions
    SET status = 'approved'
    WHERE id = payment_id AND status = 'pending';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 9. ФУНКЦИЯ: Отклонение выплаты
-- =====================================================

CREATE OR REPLACE FUNCTION reject_payment(
  payment_type TEXT, -- 'earning' или 'commission'
  payment_id UUID
)
RETURNS VOID AS $$
BEGIN
  IF payment_type = 'earning' THEN
    UPDATE tutor_earnings
    SET status = 'rejected'
    WHERE id = payment_id AND status IN ('pending', 'approved');
  ELSIF payment_type = 'commission' THEN
    UPDATE manager_commissions
    SET status = 'rejected'
    WHERE id = payment_id AND status IN ('pending', 'approved');
  END IF;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 10. ФУНКЦИЯ: Отметка выплаты как оплаченной
-- =====================================================

CREATE OR REPLACE FUNCTION mark_as_paid(
  payment_type TEXT, -- 'earning' или 'commission'
  payment_id UUID
)
RETURNS VOID AS $$
BEGIN
  IF payment_type = 'earning' THEN
    UPDATE tutor_earnings
    SET status = 'paid', paid_at = NOW()
    WHERE id = payment_id AND status = 'approved';
  ELSIF payment_type = 'commission' THEN
    UPDATE manager_commissions
    SET status = 'paid', paid_at = NOW()
    WHERE id = payment_id AND status = 'approved';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 11. ФУНКЦИЯ: Отмена начисления за урок
-- =====================================================

CREATE OR REPLACE FUNCTION cancel_lesson_earning_by_lesson(
  p_lesson_id UUID
)
RETURNS VOID AS $$
DECLARE
  earning_record RECORD;
BEGIN
  -- Находим начисление
  SELECT * INTO earning_record
  FROM tutor_earnings
  WHERE lesson_id = p_lesson_id;
  
  IF FOUND THEN
    -- Удаляем начисление
    DELETE FROM tutor_earnings WHERE lesson_id = p_lesson_id;
    
    -- Добавляем в историю транзакций
    INSERT INTO transaction_history (user_id, transaction_type, amount, description, reference_id)
    VALUES (earning_record.tutor_id, 'deduction', -earning_record.amount, 'Отмена начисления за урок', p_lesson_id);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 12. ФУНКЦИЯ: Получить статистику заработка репетитора
-- =====================================================

CREATE OR REPLACE FUNCTION get_tutor_earnings_stats(
  p_tutor_id UUID,
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE(
  total_earned DECIMAL(10, 2),
  total_pending DECIMAL(10, 2),
  total_approved DECIMAL(10, 2),
  total_paid DECIMAL(10, 2),
  total_rejected DECIMAL(10, 2),
  lessons_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(amount), 0) as total_earned,
    COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as total_pending,
    COALESCE(SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END), 0) as total_approved,
    COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) as total_paid,
    COALESCE(SUM(CASE WHEN status = 'rejected' THEN amount ELSE 0 END), 0) as total_rejected,
    COUNT(*)::INTEGER as lessons_count
  FROM tutor_earnings
  WHERE tutor_id = p_tutor_id
    AND (p_start_date IS NULL OR created_at >= p_start_date)
    AND created_at <= p_end_date;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 13. ФУНКЦИЯ: Получить статистику комиссий менеджера
-- =====================================================

CREATE OR REPLACE FUNCTION get_manager_commissions_stats(
  p_manager_id UUID,
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE(
  total_earned DECIMAL(10, 2),
  total_pending DECIMAL(10, 2),
  total_approved DECIMAL(10, 2),
  total_paid DECIMAL(10, 2),
  total_rejected DECIMAL(10, 2),
  base_salary DECIMAL(10, 2),
  total_with_base DECIMAL(10, 2)
) AS $$
DECLARE
  base_amount DECIMAL(10, 2) := 500.00;
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(amount), 0) as total_earned,
    COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as total_pending,
    COALESCE(SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END), 0) as total_approved,
    COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) as total_paid,
    COALESCE(SUM(CASE WHEN status = 'rejected' THEN amount ELSE 0 END), 0) as total_rejected,
    base_amount as base_salary,
    base_amount + COALESCE(SUM(amount), 0) as total_with_base
  FROM manager_commissions
  WHERE manager_id = p_manager_id
    AND (p_start_date IS NULL OR created_at >= p_start_date)
    AND created_at <= p_end_date;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 14. ФУНКЦИЯ: Обновление регулярного расписания
-- =====================================================

CREATE OR REPLACE FUNCTION update_recurring_schedule_time_fixed(
  p_schedule_id UUID,
  p_new_time TIME,
  p_new_day_of_week INTEGER
)
RETURNS VOID AS $$
DECLARE
  student_record RECORD;
BEGIN
  -- Получаем информацию о студенте
  SELECT * INTO student_record
  FROM recurring_schedules
  WHERE id = p_schedule_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Расписание не найдено';
  END IF;
  
  -- Удаляем все будущие уроки этого расписания
  DELETE FROM lessons
  WHERE student_id = student_record.student_id
    AND status = 'scheduled'
    AND scheduled_at > NOW();
  
  -- Обновляем расписание
  UPDATE recurring_schedules
  SET 
    time_of_day = p_new_time,
    day_of_week = p_new_day_of_week,
    updated_at = NOW()
  WHERE id = p_schedule_id;
  
  -- Создаем новые уроки на следующие 12 недель
  INSERT INTO lessons (student_id, tutor_id, scheduled_at, status, lesson_link, created_by)
  SELECT 
    student_record.student_id,
    (SELECT tutor_id FROM students WHERE id = student_record.student_id),
    generate_series(
      date_trunc('week', NOW()) + (p_new_day_of_week || ' days')::INTERVAL + p_new_time,
      date_trunc('week', NOW()) + INTERVAL '12 weeks' + (p_new_day_of_week || ' days')::INTERVAL + p_new_time,
      '1 week'::INTERVAL
    ) as scheduled_at,
    'scheduled',
    (SELECT lesson_link FROM students WHERE id = student_record.student_id),
    (SELECT created_by FROM students WHERE id = student_record.student_id)
  WHERE generate_series(
    date_trunc('week', NOW()) + (p_new_day_of_week || ' days')::INTERVAL + p_new_time,
    date_trunc('week', NOW()) + INTERVAL '12 weeks' + (p_new_day_of_week || ' days')::INTERVAL + p_new_time,
    '1 week'::INTERVAL
  ) > NOW();
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 15. RLS ПОЛИТИКИ
-- =====================================================

-- Включаем RLS для всех таблиц
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tutor_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE tutor_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE manager_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_history ENABLE ROW LEVEL SECURITY;

-- Политики для users
DROP POLICY IF EXISTS "Users can view all users" ON users;
CREATE POLICY "Users can view all users" ON users FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage users" ON users;
CREATE POLICY "Admins can manage users" ON users FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- Политики для tutor_settings
DROP POLICY IF EXISTS "Tutors can view own settings" ON tutor_settings;
CREATE POLICY "Tutors can view own settings" ON tutor_settings FOR SELECT USING (
  user_id = auth.uid() OR
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "Admins can manage tutor settings" ON tutor_settings;
CREATE POLICY "Admins can manage tutor settings" ON tutor_settings FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- Политики для tutor_earnings
DROP POLICY IF EXISTS "Tutors can view own earnings" ON tutor_earnings;
CREATE POLICY "Tutors can view own earnings" ON tutor_earnings FOR SELECT USING (
  tutor_id = auth.uid() OR
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "Admins can manage earnings" ON tutor_earnings;
CREATE POLICY "Admins can manage earnings" ON tutor_earnings FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- Политики для manager_commissions
DROP POLICY IF EXISTS "Managers can view own commissions" ON manager_commissions;
CREATE POLICY "Managers can view own commissions" ON manager_commissions FOR SELECT USING (
  manager_id = auth.uid() OR
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "Admins can manage commissions" ON manager_commissions;
CREATE POLICY "Admins can manage commissions" ON manager_commissions FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- Политики для transaction_history
DROP POLICY IF EXISTS "Users can view own transactions" ON transaction_history;
CREATE POLICY "Users can view own transactions" ON transaction_history FOR SELECT USING (
  user_id = auth.uid() OR
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "System can insert transactions" ON transaction_history;
CREATE POLICY "System can insert transactions" ON transaction_history FOR INSERT WITH CHECK (true);

-- =====================================================
-- ГОТОВО! Система ролей настроена
-- =====================================================
