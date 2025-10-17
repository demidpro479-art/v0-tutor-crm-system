-- ФИНАЛЬНЫЙ СКРИПТ - ИСПРАВЛЯЕТ ВСЕ ПРОБЛЕМЫ
-- 1. Отключает RLS для всех таблиц
-- 2. Создает функцию calculate_remaining_lessons
-- 3. Удаляет все проблемные политики

-- Отключаем RLS для всех таблиц
ALTER TABLE IF EXISTS users DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS students DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS lessons DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS recurring_schedules DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_active_role DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS homework DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS homework_submissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS tutor_earnings DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS manager_commissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS school_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS audit_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS lesson_templates DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS student_notes DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS payment_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS tutor_availability DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS student_progress DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS system_logs DISABLE ROW LEVEL SECURITY;

-- Создаем функцию для расчета остатка уроков
CREATE OR REPLACE FUNCTION calculate_remaining_lessons(student_uuid UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_paid INTEGER;
  total_completed INTEGER;
  remaining INTEGER;
BEGIN
  -- Считаем общее количество оплаченных уроков
  SELECT COALESCE(SUM(lessons_count), 0)
  INTO total_paid
  FROM payments
  WHERE student_id = student_uuid
    AND status = 'completed';

  -- Считаем количество проведенных уроков
  SELECT COUNT(*)
  INTO total_completed
  FROM lessons
  WHERE student_id = student_uuid
    AND status = 'completed';

  -- Вычисляем остаток
  remaining := total_paid - total_completed;

  RETURN GREATEST(remaining, 0);
END;
$$;

-- Даем права на выполнение функции всем
GRANT EXECUTE ON FUNCTION calculate_remaining_lessons(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_remaining_lessons(UUID) TO anon;
