-- Полностью исправляем RLS политики для user_roles и user_active_role
-- Удаляем ВСЕ существующие политики чтобы избежать конфликтов

-- Удаляем все политики для user_roles
DROP POLICY IF EXISTS "Users can view their own roles" ON user_roles;
DROP POLICY IF EXISTS "Users can insert their own roles" ON user_roles;
DROP POLICY IF EXISTS "Users can update their own roles" ON user_roles;
DROP POLICY IF EXISTS "Users can delete their own roles" ON user_roles;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON user_roles;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON user_roles;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON user_roles;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON user_roles;

-- Удаляем все политики для user_active_role
DROP POLICY IF EXISTS "Users can view their own active role" ON user_active_role;
DROP POLICY IF EXISTS "Users can insert their own active role" ON user_active_role;
DROP POLICY IF EXISTS "Users can update their own active role" ON user_active_role;
DROP POLICY IF EXISTS "Users can delete their own active role" ON user_active_role;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON user_active_role;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON user_active_role;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON user_active_role;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON user_active_role;

-- Создаем ПРОСТЫЕ политики БЕЗ рекурсии
-- Используем только auth.uid() БЕЗ JOIN с таблицей users

-- Политики для user_roles
CREATE POLICY "Allow users to read their own roles"
ON user_roles FOR SELECT
TO authenticated
USING (
  user_id IN (
    SELECT id FROM users WHERE auth_user_id = auth.uid()
  )
);

CREATE POLICY "Allow users to insert their own roles"
ON user_roles FOR INSERT
TO authenticated
WITH CHECK (
  user_id IN (
    SELECT id FROM users WHERE auth_user_id = auth.uid()
  )
);

CREATE POLICY "Allow users to update their own roles"
ON user_roles FOR UPDATE
TO authenticated
USING (
  user_id IN (
    SELECT id FROM users WHERE auth_user_id = auth.uid()
  )
);

CREATE POLICY "Allow users to delete their own roles"
ON user_roles FOR DELETE
TO authenticated
USING (
  user_id IN (
    SELECT id FROM users WHERE auth_user_id = auth.uid()
  )
);

-- Политики для user_active_role
CREATE POLICY "Allow users to read their own active role"
ON user_active_role FOR SELECT
TO authenticated
USING (
  user_id IN (
    SELECT id FROM users WHERE auth_user_id = auth.uid()
  )
);

CREATE POLICY "Allow users to insert their own active role"
ON user_active_role FOR INSERT
TO authenticated
WITH CHECK (
  user_id IN (
    SELECT id FROM users WHERE auth_user_id = auth.uid()
  )
);

CREATE POLICY "Allow users to update their own active role"
ON user_active_role FOR UPDATE
TO authenticated
USING (
  user_id IN (
    SELECT id FROM users WHERE auth_user_id = auth.uid()
  )
);

CREATE POLICY "Allow users to delete their own active role"
ON user_active_role FOR DELETE
TO authenticated
USING (
  user_id IN (
    SELECT id FROM users WHERE auth_user_id = auth.uid()
  )
);

-- Добавляем роль admin для dimid0403@gmail.com в user_roles
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Находим user_id по email
  SELECT id INTO v_user_id
  FROM users
  WHERE email = 'dimid0403@gmail.com';

  IF v_user_id IS NOT NULL THEN
    -- Добавляем роль admin
    INSERT INTO user_roles (user_id, role)
    VALUES (v_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;

    -- Устанавливаем admin как активную роль
    INSERT INTO user_active_role (user_id, active_role)
    VALUES (v_user_id, 'admin')
    ON CONFLICT (user_id) DO UPDATE
    SET active_role = 'admin';

    RAISE NOTICE 'Роль admin добавлена для пользователя %', v_user_id;
  ELSE
    RAISE NOTICE 'Пользователь с email dimid0403@gmail.com не найден';
  END IF;
END $$;
