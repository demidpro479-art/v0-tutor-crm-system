-- Исправление RLS политик и настройка главного администратора
-- Email: dimid0403@gmail.com

-- Исправление RLS политик для user_roles чтобы убрать бесконечную рекурсию
DROP POLICY IF EXISTS "Users can view their own roles" ON user_roles;
DROP POLICY IF EXISTS "Users can manage their own roles" ON user_roles;
DROP POLICY IF EXISTS "Users can insert their own roles" ON user_roles;

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

-- Настройка главного администратора dimid0403@gmail.com
DO $$
DECLARE
  v_admin_auth_id UUID;
  v_admin_id UUID;
BEGIN
  -- Находим пользователя в auth.users
  SELECT id INTO v_admin_auth_id FROM auth.users WHERE email = 'dimid0403@gmail.com';

  IF v_admin_auth_id IS NOT NULL THEN
    -- Находим или создаем запись в users
    SELECT id INTO v_admin_id FROM users WHERE auth_user_id = v_admin_auth_id;
    
    IF v_admin_id IS NULL THEN
      -- Создаем новую запись
      INSERT INTO users (id, email, auth_user_id, role, full_name)
      VALUES (gen_random_uuid(), 'dimid0403@gmail.com', v_admin_auth_id, 'admin', 'Главный администратор')
      RETURNING id INTO v_admin_id;
      
      RAISE NOTICE 'Created user record for dimid0403@gmail.com';
    ELSE
      -- Обновляем существующую запись
      UPDATE users 
      SET role = 'admin', full_name = 'Главный администратор'
      WHERE id = v_admin_id;
      
      RAISE NOTICE 'Updated user record for dimid0403@gmail.com';
    END IF;

    -- Добавляем роль admin
    INSERT INTO user_roles (user_id, role)
    VALUES (v_admin_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;

    -- Устанавливаем активную роль
    INSERT INTO user_active_role (user_id, active_role)
    VALUES (v_admin_id, 'admin')
    ON CONFLICT (user_id) DO UPDATE SET active_role = 'admin';

    RAISE NOTICE 'Admin role configured for dimid0403@gmail.com';
  ELSE
    RAISE NOTICE 'User dimid0403@gmail.com not found in auth.users. Please make sure the user is registered.';
  END IF;
END $$;
