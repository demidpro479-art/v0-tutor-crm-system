-- Простое отключение RLS для всех проблемных таблиц
-- Это временное решение чтобы все заработало

-- Отключаем RLS для основных таблиц
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE students DISABLE ROW LEVEL SECURITY;
ALTER TABLE lessons DISABLE ROW LEVEL SECURITY;
ALTER TABLE payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_schedules DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_active_role DISABLE ROW LEVEL SECURITY;

-- Удаляем все существующие политики
DROP POLICY IF EXISTS "users_select_policy" ON users;
DROP POLICY IF EXISTS "users_insert_policy" ON users;
DROP POLICY IF EXISTS "users_update_policy" ON users;
DROP POLICY IF EXISTS "students_select_policy" ON students;
DROP POLICY IF EXISTS "students_insert_policy" ON students;
DROP POLICY IF EXISTS "students_update_policy" ON students;
DROP POLICY IF EXISTS "students_delete_policy" ON students;
DROP POLICY IF EXISTS "lessons_select_policy" ON lessons;
DROP POLICY IF EXISTS "lessons_insert_policy" ON lessons;
DROP POLICY IF EXISTS "lessons_update_policy" ON lessons;
DROP POLICY IF EXISTS "lessons_delete_policy" ON lessons;
DROP POLICY IF EXISTS "payments_select_policy" ON payments;
DROP POLICY IF EXISTS "payments_insert_policy" ON payments;
DROP POLICY IF EXISTS "recurring_schedules_select_policy" ON recurring_schedules;
DROP POLICY IF EXISTS "recurring_schedules_insert_policy" ON recurring_schedules;
DROP POLICY IF EXISTS "recurring_schedules_update_policy" ON recurring_schedules;
DROP POLICY IF EXISTS "recurring_schedules_delete_policy" ON recurring_schedules;

-- Добавляем роль admin для dimid0403@gmail.com если её нет
DO $$
DECLARE
  v_user_id TEXT;
BEGIN
  -- Находим пользователя по email
  SELECT id INTO v_user_id
  FROM users
  WHERE email = 'dimid0403@gmail.com'
  LIMIT 1;

  IF v_user_id IS NOT NULL THEN
    -- Добавляем роль admin если её нет
    INSERT INTO user_roles (user_id, role)
    VALUES (v_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;

    -- Устанавливаем активную роль
    INSERT INTO user_active_role (user_id, active_role)
    VALUES (v_user_id, 'admin')
    ON CONFLICT (user_id) DO UPDATE SET active_role = 'admin';

    RAISE NOTICE 'Роль admin добавлена для пользователя %', v_user_id;
  ELSE
    RAISE NOTICE 'Пользователь dimid0403@gmail.com не найден';
  END IF;
END $$;
