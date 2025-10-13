-- Исправление системы ролей

-- Обновляем таблицу users для совместимости с profiles
ALTER TABLE users DROP COLUMN IF EXISTS auth_user_id;

-- Обновляем profiles для поддержки ролей
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'student';

-- Создаем таблицу salaries для отслеживания зарплат
CREATE TABLE IF NOT EXISTS salaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  lessons_count INTEGER DEFAULT 0,
  sales_amount NUMERIC(10, 2) DEFAULT 0,
  paid BOOLEAN DEFAULT false,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_salaries_user_id ON salaries(user_id);
CREATE INDEX IF NOT EXISTS idx_salaries_week_start ON salaries(week_start);
CREATE INDEX IF NOT EXISTS idx_salaries_paid ON salaries(paid);

-- Функция для получения статистики админа за месяц
CREATE OR REPLACE FUNCTION get_admin_monthly_stats(month_start TEXT, month_end TEXT)
RETURNS TABLE (
  total_revenue NUMERIC,
  net_profit NUMERIC,
  completed_lessons BIGINT,
  total_students BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(p.amount), 0) as total_revenue,
    COALESCE(SUM(p.amount), 0) - COALESCE((SELECT SUM(amount) FROM salaries WHERE paid = true AND week_start >= month_start::DATE AND week_end <= month_end::DATE), 0) as net_profit,
    COUNT(DISTINCT l.id) FILTER (WHERE l.status = 'completed') as completed_lessons,
    COUNT(DISTINCT s.id) as total_students
  FROM payments p
  LEFT JOIN lessons l ON l.created_at >= month_start::TIMESTAMPTZ AND l.created_at <= month_end::TIMESTAMPTZ
  LEFT JOIN students s ON s.is_active = true
  WHERE p.created_at >= month_start::TIMESTAMPTZ AND p.created_at <= month_end::TIMESTAMPTZ;
END;
$$ LANGUAGE plpgsql;

-- Функция для установки никнейма ученика
CREATE OR REPLACE FUNCTION set_student_nickname(p_user_id UUID, p_nickname TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles
  SET full_name = p_nickname
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Обновляем RLS политики
ALTER TABLE salaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Админы видят все зарплаты" ON salaries FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Пользователи видят свои зарплаты" ON salaries FOR SELECT USING (
  user_id = auth.uid()
);

-- Обновляем политики для students
DROP POLICY IF EXISTS "Репетиторы видят своих учеников" ON students;
CREATE POLICY "Репетиторы видят своих учеников" ON students FOR SELECT USING (
  tutor_id = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager')
);

CREATE POLICY "Репетиторы могут добавлять учеников" ON students FOR INSERT WITH CHECK (
  tutor_id = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'manager'))
);

CREATE POLICY "Репетиторы могут обновлять своих учеников" ON students FOR UPDATE USING (
  tutor_id = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Обновляем политики для lessons
DROP POLICY IF EXISTS "Репетиторы видят свои уроки" ON lessons;
CREATE POLICY "Репетиторы видят свои уроки" ON lessons FOR SELECT USING (
  student_id IN (SELECT id FROM students WHERE tutor_id = auth.uid())
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'manager'))
);

CREATE POLICY "Репетиторы могут создавать уроки" ON lessons FOR INSERT WITH CHECK (
  student_id IN (SELECT id FROM students WHERE tutor_id = auth.uid())
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'manager'))
);

CREATE POLICY "Репетиторы могут обновлять свои уроки" ON lessons FOR UPDATE USING (
  student_id IN (SELECT id FROM students WHERE tutor_id = auth.uid())
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Обновляем политики для payments
CREATE POLICY "Менеджеры и админы видят все платежи" ON payments FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'manager'))
);

CREATE POLICY "Менеджеры могут добавлять платежи" ON payments FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'manager'))
);
