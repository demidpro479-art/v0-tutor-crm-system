-- Исправление политик безопасности (RLS) для корректной работы с данными

-- Отключаем RLS на время настройки
ALTER TABLE students DISABLE ROW LEVEL SECURITY;
ALTER TABLE lessons DISABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_schedules DISABLE ROW LEVEL SECURITY;
ALTER TABLE payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_refill_notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_refill_reminders DISABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_logs DISABLE ROW LEVEL SECURITY;

-- Удаляем все существующие политики
DROP POLICY IF EXISTS "Users can view all students" ON students;
DROP POLICY IF EXISTS "Users can insert students" ON students;
DROP POLICY IF EXISTS "Users can update students" ON students;
DROP POLICY IF EXISTS "Users can delete students" ON students;

DROP POLICY IF EXISTS "Users can view all lessons" ON lessons;
DROP POLICY IF EXISTS "Users can insert lessons" ON lessons;
DROP POLICY IF EXISTS "Users can update lessons" ON lessons;
DROP POLICY IF EXISTS "Users can delete lessons" ON lessons;

DROP POLICY IF EXISTS "Users can view all schedules" ON recurring_schedules;
DROP POLICY IF EXISTS "Users can insert schedules" ON recurring_schedules;
DROP POLICY IF EXISTS "Users can update schedules" ON recurring_schedules;
DROP POLICY IF EXISTS "Users can delete schedules" ON recurring_schedules;

DROP POLICY IF EXISTS "Users can view all payments" ON payments;
DROP POLICY IF EXISTS "Users can insert payments" ON payments;
DROP POLICY IF EXISTS "Users can update payments" ON payments;
DROP POLICY IF EXISTS "Users can delete payments" ON payments;

DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update profiles" ON profiles;

DROP POLICY IF EXISTS "Users can view notifications" ON lesson_refill_notifications;
DROP POLICY IF EXISTS "Users can insert notifications" ON lesson_refill_notifications;
DROP POLICY IF EXISTS "Users can update notifications" ON lesson_refill_notifications;

DROP POLICY IF EXISTS "Users can view reminders" ON lesson_refill_reminders;
DROP POLICY IF EXISTS "Users can insert reminders" ON lesson_refill_reminders;
DROP POLICY IF EXISTS "Users can update reminders" ON lesson_refill_reminders;

DROP POLICY IF EXISTS "Users can view logs" ON lesson_logs;
DROP POLICY IF EXISTS "Users can insert logs" ON lesson_logs;

-- Включаем RLS
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_refill_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_refill_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_logs ENABLE ROW LEVEL SECURITY;

-- Создаем политики для таблицы students
CREATE POLICY "Authenticated users can view all students"
ON students FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert students"
ON students FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update students"
ON students FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete students"
ON students FOR DELETE
TO authenticated
USING (true);

-- Создаем политики для таблицы lessons
CREATE POLICY "Authenticated users can view all lessons"
ON lessons FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert lessons"
ON lessons FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update lessons"
ON lessons FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete lessons"
ON lessons FOR DELETE
TO authenticated
USING (true);

-- Создаем политики для таблицы recurring_schedules
CREATE POLICY "Authenticated users can view all schedules"
ON recurring_schedules FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert schedules"
ON recurring_schedules FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update schedules"
ON recurring_schedules FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete schedules"
ON recurring_schedules FOR DELETE
TO authenticated
USING (true);

-- Создаем политики для таблицы payments
CREATE POLICY "Authenticated users can view all payments"
ON payments FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert payments"
ON payments FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update payments"
ON payments FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete payments"
ON payments FOR DELETE
TO authenticated
USING (true);

-- Создаем политики для таблицы profiles
CREATE POLICY "Authenticated users can view all profiles"
ON profiles FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert profiles"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update profiles"
ON profiles FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Создаем политики для таблицы lesson_refill_notifications
CREATE POLICY "Authenticated users can view notifications"
ON lesson_refill_notifications FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert notifications"
ON lesson_refill_notifications FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update notifications"
ON lesson_refill_notifications FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Создаем политики для таблицы lesson_refill_reminders
CREATE POLICY "Authenticated users can view reminders"
ON lesson_refill_reminders FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert reminders"
ON lesson_refill_reminders FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update reminders"
ON lesson_refill_reminders FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Создаем политики для таблицы lesson_logs
CREATE POLICY "Authenticated users can view logs"
ON lesson_logs FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert logs"
ON lesson_logs FOR INSERT
TO authenticated
WITH CHECK (true);

-- Создаем функцию для проверки данных
CREATE OR REPLACE FUNCTION check_data_exists()
RETURNS TABLE(
  students_count bigint,
  lessons_count bigint,
  schedules_count bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM students) as students_count,
    (SELECT COUNT(*) FROM lessons) as lessons_count,
    (SELECT COUNT(*) FROM recurring_schedules) as schedules_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Даем права на выполнение функции
GRANT EXECUTE ON FUNCTION check_data_exists() TO authenticated;
