-- ПОЛНОЕ ИСПРАВЛЕНИЕ ВСЕХ RLS ПОЛИТИК
-- Этот скрипт полностью пересоздает RLS политики для всех таблиц

-- 1. ОТКЛЮЧАЕМ RLS для таблиц с ролями (они не содержат чувствительных данных)
ALTER TABLE user_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_active_role DISABLE ROW LEVEL SECURITY;

-- 2. УДАЛЯЕМ ВСЕ СУЩЕСТВУЮЩИЕ ПОЛИТИКИ ДЛЯ USERS
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Admins can insert users" ON users;
DROP POLICY IF EXISTS "Admins can update users" ON users;
DROP POLICY IF EXISTS "Admins can delete users" ON users;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON users;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON users;
DROP POLICY IF EXISTS "Enable update for users based on id" ON users;
DROP POLICY IF EXISTS "users_select_policy" ON users;
DROP POLICY IF EXISTS "users_update_policy" ON users;
DROP POLICY IF EXISTS "users_insert_policy" ON users;

-- 3. СОЗДАЕМ НОВЫЕ ПРОСТЫЕ ПОЛИТИКИ ДЛЯ USERS
-- Исправлено приведение типов UUID к TEXT
CREATE POLICY "users_select_policy" ON users
FOR SELECT
USING (
  auth.uid() = auth_user_id 
  OR 
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid()::text 
    AND user_roles.role IN ('admin', 'super_admin')
  )
);

CREATE POLICY "users_update_policy" ON users
FOR UPDATE
USING (
  auth.uid() = auth_user_id 
  OR 
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid()::text 
    AND user_roles.role IN ('admin', 'super_admin')
  )
);

CREATE POLICY "users_insert_policy" ON users
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid()::text 
    AND user_roles.role IN ('admin', 'super_admin')
  )
);

-- 4. УДАЛЯЕМ ВСЕ СУЩЕСТВУЮЩИЕ ПОЛИТИКИ ДЛЯ LESSONS
DROP POLICY IF EXISTS "Tutors can view own lessons" ON lessons;
DROP POLICY IF EXISTS "Tutors can insert lessons" ON lessons;
DROP POLICY IF EXISTS "Tutors can update own lessons" ON lessons;
DROP POLICY IF EXISTS "Admins can view all lessons" ON lessons;
DROP POLICY IF EXISTS "Admins can manage all lessons" ON lessons;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON lessons;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON lessons;
DROP POLICY IF EXISTS "Enable update for users based on tutor_id" ON lessons;
DROP POLICY IF EXISTS "lessons_select_policy" ON lessons;
DROP POLICY IF EXISTS "lessons_insert_policy" ON lessons;
DROP POLICY IF EXISTS "lessons_update_policy" ON lessons;

-- 5. СОЗДАЕМ НОВЫЕ ПРОСТЫЕ ПОЛИТИКИ ДЛЯ LESSONS БЕЗ РЕКУРСИИ
-- Исправлено приведение типов UUID к TEXT для tutor_id
CREATE POLICY "lessons_select_policy" ON lessons
FOR SELECT
USING (
  tutor_id = auth.uid()::text
  OR
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid()::text 
    AND user_roles.role IN ('admin', 'super_admin', 'manager')
  )
);

CREATE POLICY "lessons_insert_policy" ON lessons
FOR INSERT
WITH CHECK (
  tutor_id = auth.uid()::text
  OR
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid()::text 
    AND user_roles.role IN ('admin', 'super_admin', 'manager')
  )
);

CREATE POLICY "lessons_update_policy" ON lessons
FOR UPDATE
USING (
  tutor_id = auth.uid()::text
  OR
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid()::text 
    AND user_roles.role IN ('admin', 'super_admin', 'manager')
  )
);

-- 6. УДАЛЯЕМ ВСЕ СУЩЕСТВУЮЩИЕ ПОЛИТИКИ ДЛЯ STUDENTS
DROP POLICY IF EXISTS "Tutors can view own students" ON students;
DROP POLICY IF EXISTS "Tutors can insert students" ON students;
DROP POLICY IF EXISTS "Tutors can update own students" ON students;
DROP POLICY IF EXISTS "Admins can view all students" ON students;
DROP POLICY IF EXISTS "Admins can manage all students" ON students;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON students;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON students;
DROP POLICY IF EXISTS "Enable update for users based on tutor_id" ON students;
DROP POLICY IF EXISTS "students_select_policy" ON students;
DROP POLICY IF EXISTS "students_insert_policy" ON students;
DROP POLICY IF EXISTS "students_update_policy" ON students;

-- 7. СОЗДАЕМ НОВЫЕ ПРОСТЫЕ ПОЛИТИКИ ДЛЯ STUDENTS
-- Исправлено приведение типов UUID к TEXT для tutor_id
CREATE POLICY "students_select_policy" ON students
FOR SELECT
USING (
  tutor_id = auth.uid()::text
  OR
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid()::text 
    AND user_roles.role IN ('admin', 'super_admin', 'manager')
  )
);

CREATE POLICY "students_insert_policy" ON students
FOR INSERT
WITH CHECK (
  tutor_id = auth.uid()::text
  OR
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid()::text 
    AND user_roles.role IN ('admin', 'super_admin', 'manager')
  )
);

CREATE POLICY "students_update_policy" ON students
FOR UPDATE
USING (
  tutor_id = auth.uid()::text
  OR
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid()::text 
    AND user_roles.role IN ('admin', 'super_admin', 'manager')
  )
);

-- 8. ОТКЛЮЧАЕМ RLS ДЛЯ ОСТАЛЬНЫХ ТАБЛИЦ (они не содержат чувствительных данных)
ALTER TABLE tutor_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE tutor_earnings DISABLE ROW LEVEL SECURITY;
ALTER TABLE manager_earnings DISABLE ROW LEVEL SECURITY;

-- 9. ДОБАВЛЯЕМ РОЛЬ ADMIN ДЛЯ ПОЛЬЗОВАТЕЛЯ dimid0403@gmail.com
DO $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Находим пользователя по email
  SELECT id INTO v_user_id
  FROM users
  WHERE email = 'dimid0403@gmail.com'
  LIMIT 1;

  IF v_user_id IS NOT NULL THEN
    -- Добавляем роль admin в user_roles
    INSERT INTO user_roles (user_id, role)
    VALUES (v_user_id::text, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;

    -- Устанавливаем активную роль
    INSERT INTO user_active_role (user_id, active_role)
    VALUES (v_user_id::text, 'admin')
    ON CONFLICT (user_id) DO UPDATE SET active_role = 'admin';

    RAISE NOTICE 'Роль admin добавлена для пользователя dimid0403@gmail.com';
  ELSE
    RAISE NOTICE 'Пользователь dimid0403@gmail.com не найден';
  END IF;
END $$;
