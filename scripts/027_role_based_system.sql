-- Система ролей для CRM репетиторов
-- Роли: admin (ГА), tutor (Репетитор), manager (Менеджер), student (Ученик)

-- Удаляем старые таблицы если есть
DROP TABLE IF EXISTS salary_payments CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS tutor_earnings CASCADE;
DROP TABLE IF EXISTS manager_sales CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Таблица пользователей (репетиторы, менеджеры, админы)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'tutor', 'manager')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Таблица настроек репетиторов
CREATE TABLE IF NOT EXISTS tutor_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  rate_per_lesson NUMERIC(10, 2) DEFAULT 0, -- Сколько репетитор получает за урок
  lesson_price NUMERIC(10, 2) DEFAULT 0, -- Сколько стоит урок для клиента
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Таблица транзакций (платежи от клиентов)
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  manager_id UUID REFERENCES users(id), -- Кто принял платеж
  amount NUMERIC(10, 2) NOT NULL,
  lessons_count INTEGER NOT NULL,
  receipt_url TEXT, -- Ссылка на чек
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- Таблица заработка репетиторов
CREATE TABLE IF NOT EXISTS tutor_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id UUID REFERENCES users(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL,
  week_start DATE NOT NULL, -- Начало недели для расчета ЗП
  is_paid BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Таблица продаж менеджеров (для расчета 5%)
CREATE TABLE IF NOT EXISTS manager_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id UUID REFERENCES users(id) ON DELETE CASCADE,
  transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL,
  week_start DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Таблица выплат зарплат
CREATE TABLE IF NOT EXISTS salary_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  payment_type VARCHAR(50) CHECK (payment_type IN ('tutor_weekly', 'manager_weekly', 'admin_monthly')),
  is_paid BOOLEAN DEFAULT false,
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Добавляем колонки к существующим таблицам
ALTER TABLE students ADD COLUMN IF NOT EXISTS tutor_id UUID REFERENCES users(id);
ALTER TABLE students ADD COLUMN IF NOT EXISTS lesson_link TEXT; -- Ссылка на урок (одна для всех уроков ученика)
ALTER TABLE students ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id);

ALTER TABLE lessons ADD COLUMN IF NOT EXISTS tutor_id UUID REFERENCES users(id);
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS lesson_link TEXT; -- Ссылка на конкретный урок

-- Обновляем таблицу profiles для поддержки всех ролей
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id);

-- Индексы для производительности
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON users(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_students_tutor_id ON students(tutor_id);
CREATE INDEX IF NOT EXISTS idx_lessons_tutor_id ON lessons(tutor_id);
CREATE INDEX IF NOT EXISTS idx_tutor_earnings_tutor_id ON tutor_earnings(tutor_id);
CREATE INDEX IF NOT EXISTS idx_tutor_earnings_week_start ON tutor_earnings(week_start);
CREATE INDEX IF NOT EXISTS idx_manager_sales_manager_id ON manager_sales(manager_id);
CREATE INDEX IF NOT EXISTS idx_manager_sales_week_start ON manager_sales(week_start);
CREATE INDEX IF NOT EXISTS idx_salary_payments_user_id ON salary_payments(user_id);

-- Функция для автоматического начисления заработка репетитору при проведении урока
CREATE OR REPLACE FUNCTION calculate_tutor_earning()
RETURNS TRIGGER AS $$
DECLARE
  tutor_rate NUMERIC(10, 2);
  week_start_date DATE;
BEGIN
  -- Проверяем что урок завершен
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Получаем ставку репетитора
    SELECT ts.rate_per_lesson INTO tutor_rate
    FROM tutor_settings ts
    WHERE ts.user_id = NEW.tutor_id;
    
    -- Если ставка не установлена, используем 0
    IF tutor_rate IS NULL THEN
      tutor_rate := 0;
    END IF;
    
    -- Вычисляем начало недели (понедельник)
    week_start_date := DATE_TRUNC('week', NEW.scheduled_at)::DATE;
    
    -- Добавляем запись о заработке
    INSERT INTO tutor_earnings (tutor_id, lesson_id, amount, week_start)
    VALUES (NEW.tutor_id, NEW.id, tutor_rate, week_start_date);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для начисления заработка
DROP TRIGGER IF EXISTS trigger_calculate_tutor_earning ON lessons;
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
  -- Вычисляем начало недели
  week_start_date := DATE_TRUNC('week', NEW.created_at)::DATE;
  
  -- Добавляем запись о продаже
  IF NEW.manager_id IS NOT NULL THEN
    INSERT INTO manager_sales (manager_id, transaction_id, amount, week_start)
    VALUES (NEW.manager_id, NEW.id, NEW.amount, week_start_date);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для добавления продажи
DROP TRIGGER IF EXISTS trigger_add_manager_sale ON transactions;
CREATE TRIGGER trigger_add_manager_sale
AFTER INSERT ON transactions
FOR EACH ROW
EXECUTE FUNCTION add_manager_sale();

-- Функция для получения статистики ГА за месяц
CREATE OR REPLACE FUNCTION get_admin_monthly_stats(month_start DATE, month_end DATE)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_revenue', COALESCE(SUM(t.amount), 0),
    'total_lessons', COALESCE(COUNT(l.id), 0),
    'completed_lessons', COALESCE(COUNT(l.id) FILTER (WHERE l.status = 'completed'), 0),
    'tutor_expenses', COALESCE((SELECT SUM(amount) FROM tutor_earnings WHERE created_at BETWEEN month_start AND month_end), 0),
    'manager_expenses', COALESCE((SELECT SUM(amount) FROM salary_payments WHERE payment_type = 'manager_weekly' AND period_start >= month_start AND period_end <= month_end), 0),
    'net_profit', COALESCE(SUM(t.amount), 0) - 
                  COALESCE((SELECT SUM(amount) FROM tutor_earnings WHERE created_at BETWEEN month_start AND month_end), 0) -
                  COALESCE((SELECT SUM(amount) FROM salary_payments WHERE payment_type = 'manager_weekly' AND period_start >= month_start AND period_end <= month_end), 0)
  ) INTO result
  FROM transactions t
  LEFT JOIN lessons l ON l.student_id = t.student_id AND l.created_at BETWEEN month_start AND month_end
  WHERE t.created_at BETWEEN month_start AND month_end;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Функция для расчета ЗП менеджера за неделю
CREATE OR REPLACE FUNCTION calculate_manager_salary(p_manager_id UUID, week_start DATE, week_end DATE)
RETURNS NUMERIC AS $$
DECLARE
  base_salary NUMERIC := 500;
  commission_rate NUMERIC := 0.05;
  total_sales NUMERIC;
  total_salary NUMERIC;
BEGIN
  -- Получаем сумму продаж за неделю
  SELECT COALESCE(SUM(amount), 0) INTO total_sales
  FROM manager_sales
  WHERE manager_id = p_manager_id
    AND week_start >= week_start
    AND week_start <= week_end;
  
  -- Рассчитываем ЗП: 500р + 5% от продаж
  total_salary := base_salary + (total_sales * commission_rate);
  
  RETURN total_salary;
END;
$$ LANGUAGE plpgsql;

-- Функция для расчета ЗП репетитора за неделю
CREATE OR REPLACE FUNCTION calculate_tutor_salary(p_tutor_id UUID, week_start DATE, week_end DATE)
RETURNS NUMERIC AS $$
DECLARE
  total_salary NUMERIC;
BEGIN
  -- Получаем сумму заработка за неделю
  SELECT COALESCE(SUM(amount), 0) INTO total_salary
  FROM tutor_earnings
  WHERE tutor_id = p_tutor_id
    AND week_start >= week_start
    AND week_start <= week_end
    AND is_paid = false;
  
  RETURN total_salary;
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
CREATE POLICY "Админы видят всех пользователей" ON users FOR SELECT USING (
  EXISTS (SELECT 1 FROM users WHERE auth_user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Пользователи видят себя" ON users FOR SELECT USING (auth_user_id = auth.uid());

-- Политики для students
DROP POLICY IF EXISTS "Репетиторы видят своих учеников" ON students;
CREATE POLICY "Репетиторы видят своих учеников" ON students FOR SELECT USING (
  tutor_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM users WHERE auth_user_id = auth.uid() AND role = 'admin')
);

-- Политики для lessons
DROP POLICY IF EXISTS "Репетиторы видят свои уроки" ON lessons;
CREATE POLICY "Репетиторы видят свои уроки" ON lessons FOR SELECT USING (
  tutor_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM users WHERE auth_user_id = auth.uid() AND role = 'admin')
);

-- Создаем первого админа (если нужно)
-- INSERT INTO users (email, full_name, role) VALUES ('admin@example.com', 'Главный Администратор', 'admin');
