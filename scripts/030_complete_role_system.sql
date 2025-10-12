-- Полная система ролей для CRM репетиторов
-- Исправленная версия без ошибок

-- Удаляем старые триггеры и функции
DROP TRIGGER IF EXISTS trigger_calculate_tutor_earning ON lessons;
DROP TRIGGER IF EXISTS trigger_add_manager_sale ON transactions;
DROP FUNCTION IF EXISTS calculate_tutor_earning();
DROP FUNCTION IF EXISTS add_manager_sale();
DROP FUNCTION IF EXISTS get_admin_monthly_stats(DATE, DATE);
DROP FUNCTION IF EXISTS calculate_manager_salary(UUID, DATE, DATE);
DROP FUNCTION IF EXISTS calculate_tutor_salary(UUID, DATE, DATE);

-- Удаляем старые таблицы
DROP TABLE IF EXISTS salary_payments CASCADE;
DROP TABLE IF EXISTS manager_sales CASCADE;
DROP TABLE IF EXISTS tutor_earnings CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS tutor_settings CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Таблица пользователей системы (репетиторы, менеджеры, админы)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'tutor', 'manager')),
  is_active BOOLEAN DEFAULT true,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Таблица настроек репетиторов
CREATE TABLE tutor_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  rate_per_lesson NUMERIC(10, 2) DEFAULT 0, -- Сколько репетитор получает за урок
  lesson_price NUMERIC(10, 2) DEFAULT 0, -- Сколько стоит урок для клиента (устанавливает ГА)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Таблица транзакций (платежи от клиентов)
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  manager_id UUID REFERENCES users(id), -- Менеджер который принял платеж
  amount NUMERIC(10, 2) NOT NULL,
  lessons_count INTEGER NOT NULL,
  receipt_url TEXT, -- Ссылка на чек
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- Таблица заработка репетиторов
CREATE TABLE tutor_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id UUID REFERENCES users(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE UNIQUE,
  amount NUMERIC(10, 2) NOT NULL,
  week_start DATE NOT NULL,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Таблица продаж менеджеров
CREATE TABLE manager_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id UUID REFERENCES users(id) ON DELETE CASCADE,
  transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE UNIQUE,
  amount NUMERIC(10, 2) NOT NULL,
  week_start DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Таблица выплат зарплат
CREATE TABLE salary_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  payment_type VARCHAR(50) CHECK (payment_type IN ('tutor_weekly', 'manager_weekly', 'admin_monthly')),
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'rejected')),
  paid_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- Добавляем колонки к существующим таблицам
ALTER TABLE students ADD COLUMN IF NOT EXISTS tutor_id UUID REFERENCES users(id);
ALTER TABLE students ADD COLUMN IF NOT EXISTS lesson_link TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id);
ALTER TABLE students ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES users(id);

ALTER TABLE lessons ADD COLUMN IF NOT EXISTS tutor_id UUID REFERENCES users(id);
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id);
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS lesson_title VARCHAR(255);

ALTER TABLE recurring_schedules ADD COLUMN IF NOT EXISTS tutor_id UUID REFERENCES users(id);
ALTER TABLE recurring_schedules ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id);

-- Обновляем таблицу profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON users(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_students_tutor_id ON students(tutor_id);
CREATE INDEX IF NOT EXISTS idx_students_manager_id ON students(manager_id);
CREATE INDEX IF NOT EXISTS idx_lessons_tutor_id ON lessons(tutor_id);
CREATE INDEX IF NOT EXISTS idx_tutor_earnings_tutor_id ON tutor_earnings(tutor_id);
CREATE INDEX IF NOT EXISTS idx_tutor_earnings_week_start ON tutor_earnings(week_start);
CREATE INDEX IF NOT EXISTS idx_tutor_earnings_status ON tutor_earnings(status);
CREATE INDEX IF NOT EXISTS idx_manager_sales_manager_id ON manager_sales(manager_id);
CREATE INDEX IF NOT EXISTS idx_manager_sales_week_start ON manager_sales(week_start);
CREATE INDEX IF NOT EXISTS idx_salary_payments_user_id ON salary_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_salary_payments_status ON salary_payments(status);

-- Функция для автоматического начисления заработка репетитору
CREATE OR REPLACE FUNCTION calculate_tutor_earning()
RETURNS TRIGGER AS $$
DECLARE
  tutor_rate NUMERIC(10, 2);
  week_start_date DATE;
BEGIN
  -- Проверяем что урок завершен и есть репетитор
  IF NEW.status = 'completed' AND NEW.tutor_id IS NOT NULL AND (OLD IS NULL OR OLD.status != 'completed') THEN
    -- Получаем ставку репетитора
    SELECT ts.rate_per_lesson INTO tutor_rate
    FROM tutor_settings ts
    WHERE ts.user_id = NEW.tutor_id;
    
    -- Если ставка не установлена, используем 0
    tutor_rate := COALESCE(tutor_rate, 0);
    
    -- Вычисляем начало недели (понедельник)
    week_start_date := DATE_TRUNC('week', NEW.scheduled_at)::DATE;
    
    -- Добавляем запись о заработке (если еще нет)
    INSERT INTO tutor_earnings (tutor_id, lesson_id, amount, week_start)
    VALUES (NEW.tutor_id, NEW.id, tutor_rate, week_start_date)
    ON CONFLICT (lesson_id) DO NOTHING;
  END IF;
  
  -- Если урок отменен, отменяем начисление
  IF NEW.status = 'cancelled' AND OLD.status = 'completed' AND NEW.tutor_id IS NOT NULL THEN
    UPDATE tutor_earnings 
    SET status = 'cancelled'
    WHERE lesson_id = NEW.id AND status = 'pending';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_tutor_earning
AFTER INSERT OR UPDATE ON lessons
FOR EACH ROW
EXECUTE FUNCTION calculate_tutor_earning();

-- Функция для добавления продажи менеджеру
CREATE OR REPLACE FUNCTION add_manager_sale()
RETURNS TRIGGER AS $$
DECLARE
  week_start_date DATE;
BEGIN
  week_start_date := DATE_TRUNC('week', NEW.created_at)::DATE;
  
  IF NEW.manager_id IS NOT NULL THEN
    INSERT INTO manager_sales (manager_id, transaction_id, amount, week_start)
    VALUES (NEW.manager_id, NEW.id, NEW.amount, week_start_date)
    ON CONFLICT (transaction_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_add_manager_sale
AFTER INSERT ON transactions
FOR EACH ROW
EXECUTE FUNCTION add_manager_sale();

-- Функция для получения статистики ГА за месяц
CREATE OR REPLACE FUNCTION get_admin_monthly_stats(month_start DATE, month_end DATE)
RETURNS JSON AS $$
DECLARE
  result JSON;
  total_revenue NUMERIC;
  tutor_expenses NUMERIC;
  manager_expenses NUMERIC;
BEGIN
  -- Общий доход
  SELECT COALESCE(SUM(amount), 0) INTO total_revenue
  FROM transactions
  WHERE created_at BETWEEN month_start AND month_end;
  
  -- Расходы на репетиторов
  SELECT COALESCE(SUM(amount), 0) INTO tutor_expenses
  FROM tutor_earnings
  WHERE created_at BETWEEN month_start AND month_end
    AND status != 'cancelled';
  
  -- Расходы на менеджеров
  SELECT COALESCE(SUM(amount), 0) INTO manager_expenses
  FROM salary_payments
  WHERE payment_type = 'manager_weekly'
    AND period_start >= month_start
    AND period_end <= month_end
    AND status = 'paid';
  
  result := json_build_object(
    'total_revenue', total_revenue,
    'tutor_expenses', tutor_expenses,
    'manager_expenses', manager_expenses,
    'net_profit', total_revenue - tutor_expenses - manager_expenses,
    'total_lessons', (SELECT COUNT(*) FROM lessons WHERE scheduled_at BETWEEN month_start AND month_end),
    'completed_lessons', (SELECT COUNT(*) FROM lessons WHERE scheduled_at BETWEEN month_start AND month_end AND status = 'completed')
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Функция для расчета ЗП менеджера за неделю
CREATE OR REPLACE FUNCTION calculate_manager_salary(p_manager_id UUID, p_week_start DATE, p_week_end DATE)
RETURNS NUMERIC AS $$
DECLARE
  base_salary NUMERIC := 500;
  commission_rate NUMERIC := 0.05;
  total_sales NUMERIC;
  total_salary NUMERIC;
BEGIN
  SELECT COALESCE(SUM(amount), 0) INTO total_sales
  FROM manager_sales
  WHERE manager_id = p_manager_id
    AND week_start BETWEEN p_week_start AND p_week_end;
  
  total_salary := base_salary + (total_sales * commission_rate);
  
  RETURN total_salary;
END;
$$ LANGUAGE plpgsql;

-- Функция для расчета ЗП репетитора за неделю
CREATE OR REPLACE FUNCTION calculate_tutor_salary(p_tutor_id UUID, p_week_start DATE, p_week_end DATE)
RETURNS NUMERIC AS $$
DECLARE
  total_salary NUMERIC;
BEGIN
  SELECT COALESCE(SUM(amount), 0) INTO total_salary
  FROM tutor_earnings
  WHERE tutor_id = p_tutor_id
    AND week_start BETWEEN p_week_start AND p_week_end
    AND status = 'pending';
  
  RETURN total_salary;
END;
$$ LANGUAGE plpgsql;

-- Функция для одобрения выплаты
CREATE OR REPLACE FUNCTION approve_salary_payment(p_payment_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE salary_payments
  SET status = 'paid', paid_at = NOW()
  WHERE id = p_payment_id;
  
  -- Помечаем начисления как оплаченные
  UPDATE tutor_earnings te
  SET status = 'paid', paid_at = NOW()
  FROM salary_payments sp
  WHERE sp.id = p_payment_id
    AND te.tutor_id = sp.user_id
    AND te.week_start BETWEEN sp.period_start AND sp.period_end
    AND te.status = 'pending';
END;
$$ LANGUAGE plpgsql;

-- Функция для отклонения выплаты
CREATE OR REPLACE FUNCTION reject_salary_payment(p_payment_id UUID, p_reason TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE salary_payments
  SET status = 'rejected', rejected_at = NOW(), rejection_reason = p_reason
  WHERE id = p_payment_id;
  
  -- Возвращаем начисления в статус pending
  UPDATE tutor_earnings te
  SET status = 'pending'
  FROM salary_payments sp
  WHERE sp.id = p_payment_id
    AND te.tutor_id = sp.user_id
    AND te.week_start BETWEEN sp.period_start AND sp.period_end;
END;
$$ LANGUAGE plpgsql;

-- Функция для отмены начисления за урок
CREATE OR REPLACE FUNCTION cancel_lesson_earning(p_lesson_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE tutor_earnings
  SET status = 'cancelled'
  WHERE lesson_id = p_lesson_id AND status = 'pending';
END;
$$ LANGUAGE plpgsql;

-- RLS политики
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tutor_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tutor_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE manager_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE salary_payments ENABLE ROW LEVEL SECURITY;

-- Политики для users
DROP POLICY IF EXISTS "Админы видят всех" ON users;
DROP POLICY IF EXISTS "Пользователи видят себя" ON users;

CREATE POLICY "Админы видят всех" ON users FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE auth_user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Пользователи видят себя" ON users FOR SELECT USING (
  auth_user_id = auth.uid()
);

-- Политики для students
DROP POLICY IF EXISTS "Админы и менеджеры видят всех учеников" ON students;
DROP POLICY IF EXISTS "Репетиторы видят своих учеников" ON students;

CREATE POLICY "Админы и менеджеры видят всех учеников" ON students FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE auth_user_id = auth.uid() AND role IN ('admin', 'manager'))
);

CREATE POLICY "Репетиторы видят своих учеников" ON students FOR SELECT USING (
  tutor_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid() AND role = 'tutor')
);

-- Политики для lessons
DROP POLICY IF EXISTS "Админы и менеджеры видят все уроки" ON lessons;
DROP POLICY IF EXISTS "Репетиторы видят свои уроки" ON lessons;

CREATE POLICY "Админы и менеджеры видят все уроки" ON lessons FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE auth_user_id = auth.uid() AND role IN ('admin', 'manager'))
);

CREATE POLICY "Репетиторы видят и редактируют свои уроки" ON lessons FOR ALL USING (
  tutor_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid() AND role = 'tutor')
);

-- Политики для tutor_earnings
DROP POLICY IF EXISTS "Админы видят все начисления" ON tutor_earnings;
DROP POLICY IF EXISTS "Репетиторы видят свои начисления" ON tutor_earnings;

CREATE POLICY "Админы видят все начисления" ON tutor_earnings FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE auth_user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Репетиторы видят свои начисления" ON tutor_earnings FOR SELECT USING (
  tutor_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid() AND role = 'tutor')
);

-- Политики для salary_payments
DROP POLICY IF EXISTS "Админы видят все выплаты" ON salary_payments;
DROP POLICY IF EXISTS "Пользователи видят свои выплаты" ON salary_payments;

CREATE POLICY "Админы видят все выплаты" ON salary_payments FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE auth_user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Пользователи видят свои выплаты" ON salary_payments FOR SELECT USING (
  user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
);
