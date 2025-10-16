-- Создание тестовых аккаунтов для каждой роли
-- Все аккаунты имеют пароль: 12345678

-- Исправление RLS политик для user_roles чтобы убрать бесконечную рекурсию
DROP POLICY IF EXISTS "Users can view their own roles" ON user_roles;
DROP POLICY IF EXISTS "Users can manage their own roles" ON user_roles;

-- Простые RLS политики без рекурсии
CREATE POLICY "Users can view their own roles" ON user_roles
  FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM users WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own roles" ON user_roles
  FOR INSERT
  WITH CHECK (
    user_id IN (
      SELECT id FROM users WHERE auth_user_id = auth.uid()
    )
  );

-- Исправление RLS политик для user_active_role
DROP POLICY IF EXISTS "Users can view their own active role" ON user_active_role;
DROP POLICY IF EXISTS "Users can manage their own active role" ON user_active_role;

CREATE POLICY "Users can view their own active role" ON user_active_role
  FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM users WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their own active role" ON user_active_role
  FOR ALL
  USING (
    user_id IN (
      SELECT id FROM users WHERE auth_user_id = auth.uid()
    )
  );

-- Создание тестовых пользователей
DO $$
DECLARE
  v_admin_auth_id UUID;
  v_tutor_auth_id UUID;
  v_manager_auth_id UUID;
  v_student_auth_id UUID;
  v_admin_id UUID;
  v_tutor_id UUID;
  v_manager_id UUID;
  v_student_id UUID;
BEGIN
  -- Примечание: Пользователи должны быть созданы через Supabase Auth UI или API
  -- Этот скрипт только добавляет записи в таблицу users и роли
  -- После выполнения скрипта нужно создать пользователей в Supabase Auth с emails:
  -- admin@tutorcrm.local, tutor@tutorcrm.local, manager@tutorcrm.local, student@tutorcrm.local
  -- и паролем 12345678

  -- Проверяем существуют ли пользователи в auth.users
  SELECT id INTO v_admin_auth_id FROM auth.users WHERE email = 'admin@tutorcrm.local';
  SELECT id INTO v_tutor_auth_id FROM auth.users WHERE email = 'tutor@tutorcrm.local';
  SELECT id INTO v_manager_auth_id FROM auth.users WHERE email = 'manager@tutorcrm.local';
  SELECT id INTO v_student_auth_id FROM auth.users WHERE email = 'student@tutorcrm.local';

  -- Если пользователи существуют, создаем записи в users и добавляем роли
  IF v_admin_auth_id IS NOT NULL THEN
    -- Создаем или обновляем запись в users
    INSERT INTO users (id, email, auth_user_id, role, full_name)
    VALUES (gen_random_uuid(), 'admin@tutorcrm.local', v_admin_auth_id, 'admin', 'Администратор')
    ON CONFLICT (auth_user_id) DO UPDATE SET role = 'admin', full_name = 'Администратор'
    RETURNING id INTO v_admin_id;

    -- Добавляем роли
    INSERT INTO user_roles (user_id, role)
    VALUES (v_admin_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;

    -- Устанавливаем активную роль
    INSERT INTO user_active_role (user_id, active_role)
    VALUES (v_admin_id, 'admin')
    ON CONFLICT (user_id) DO UPDATE SET active_role = 'admin';

    RAISE NOTICE 'Admin account configured: admin@tutorcrm.local';
  ELSE
    RAISE NOTICE 'Admin user not found in auth.users. Please create user with email: admin@tutorcrm.local';
  END IF;

  IF v_tutor_auth_id IS NOT NULL THEN
    INSERT INTO users (id, email, auth_user_id, role, full_name)
    VALUES (gen_random_uuid(), 'tutor@tutorcrm.local', v_tutor_auth_id, 'tutor', 'Репетитор')
    ON CONFLICT (auth_user_id) DO UPDATE SET role = 'tutor', full_name = 'Репетитор'
    RETURNING id INTO v_tutor_id;

    INSERT INTO user_roles (user_id, role)
    VALUES (v_tutor_id, 'tutor')
    ON CONFLICT (user_id, role) DO NOTHING;

    INSERT INTO user_active_role (user_id, active_role)
    VALUES (v_tutor_id, 'tutor')
    ON CONFLICT (user_id) DO UPDATE SET active_role = 'tutor';

    RAISE NOTICE 'Tutor account configured: tutor@tutorcrm.local';
  ELSE
    RAISE NOTICE 'Tutor user not found in auth.users. Please create user with email: tutor@tutorcrm.local';
  END IF;

  IF v_manager_auth_id IS NOT NULL THEN
    INSERT INTO users (id, email, auth_user_id, role, full_name)
    VALUES (gen_random_uuid(), 'manager@tutorcrm.local', v_manager_auth_id, 'admin', 'Менеджер')
    ON CONFLICT (auth_user_id) DO UPDATE SET role = 'admin', full_name = 'Менеджер'
    RETURNING id INTO v_manager_id;

    INSERT INTO user_roles (user_id, role)
    VALUES (v_manager_id, 'manager')
    ON CONFLICT (user_id, role) DO NOTHING;

    INSERT INTO user_active_role (user_id, active_role)
    VALUES (v_manager_id, 'manager')
    ON CONFLICT (user_id) DO UPDATE SET active_role = 'manager';

    RAISE NOTICE 'Manager account configured: manager@tutorcrm.local';
  ELSE
    RAISE NOTICE 'Manager user not found in auth.users. Please create user with email: manager@tutorcrm.local';
  END IF;

  IF v_student_auth_id IS NOT NULL THEN
    INSERT INTO users (id, email, auth_user_id, role, full_name)
    VALUES (gen_random_uuid(), 'student@tutorcrm.local', v_student_auth_id, 'student', 'Ученик')
    ON CONFLICT (auth_user_id) DO UPDATE SET role = 'student', full_name = 'Ученик'
    RETURNING id INTO v_student_id;

    INSERT INTO user_roles (user_id, role)
    VALUES (v_student_id, 'student')
    ON CONFLICT (user_id, role) DO NOTHING;

    INSERT INTO user_active_role (user_id, active_role)
    VALUES (v_student_id, 'student')
    ON CONFLICT (user_id) DO UPDATE SET active_role = 'student';

    RAISE NOTICE 'Student account configured: student@tutorcrm.local';
  ELSE
    RAISE NOTICE 'Student user not found in auth.users. Please create user with email: student@tutorcrm.local';
  END IF;
END $$;
