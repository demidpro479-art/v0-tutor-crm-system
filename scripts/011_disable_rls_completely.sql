-- Полное отключение RLS для упрощения работы системы
-- Это безопасно для внутренней CRM системы с аутентификацией

-- Отключаем RLS на всех таблицах
ALTER TABLE IF EXISTS students DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS lessons DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS recurring_schedules DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS lesson_refill_notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS lesson_refill_reminders DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS lesson_logs DISABLE ROW LEVEL SECURITY;

-- Удаляем все политики, которые могут вызывать рекурсию
DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- Удаляем все политики из таблицы students
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'students') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON students';
    END LOOP;
    
    -- Удаляем все политики из таблицы lessons
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'lessons') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON lessons';
    END LOOP;
    
    -- Удаляем все политики из таблицы recurring_schedules
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'recurring_schedules') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON recurring_schedules';
    END LOOP;
    
    -- Удаляем все политики из таблицы payments
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'payments') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON payments';
    END LOOP;
    
    -- Удаляем все политики из таблицы profiles
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'profiles') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON profiles';
    END LOOP;
    
    -- Удаляем все политики из таблицы lesson_refill_notifications
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'lesson_refill_notifications') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON lesson_refill_notifications';
    END LOOP;
    
    -- Удаляем все политики из таблицы lesson_refill_reminders
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'lesson_refill_reminders') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON lesson_refill_reminders';
    END LOOP;
    
    -- Удаляем все политики из таблицы lesson_logs
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'lesson_logs') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON lesson_logs';
    END LOOP;
END $$;

-- Даем полные права аутентифицированным пользователям
GRANT ALL ON students TO authenticated;
GRANT ALL ON lessons TO authenticated;
GRANT ALL ON recurring_schedules TO authenticated;
GRANT ALL ON payments TO authenticated;
GRANT ALL ON profiles TO authenticated;
GRANT ALL ON lesson_refill_notifications TO authenticated;
GRANT ALL ON lesson_refill_reminders TO authenticated;
GRANT ALL ON lesson_logs TO authenticated;

-- Даем права на использование последовательностей
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Проверяем, что данные доступны
SELECT 
  'students' as table_name, 
  COUNT(*) as row_count 
FROM students
UNION ALL
SELECT 
  'lessons' as table_name, 
  COUNT(*) as row_count 
FROM lessons
UNION ALL
SELECT 
  'recurring_schedules' as table_name, 
  COUNT(*) as row_count 
FROM recurring_schedules;
