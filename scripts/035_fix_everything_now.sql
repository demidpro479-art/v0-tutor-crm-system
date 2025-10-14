-- ИСПРАВЛЕНИЕ ВСЕХ ПРОБЛЕМ СИСТЕМЫ

-- 1. Создаем таблицу для множественных ролей БЕЗ изменения существующей таблицы users
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL CHECK (role IN ('super_admin', 'admin', 'tutor', 'manager', 'student')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- 2. Создаем таблицу для активной роли пользователя
CREATE TABLE IF NOT EXISTS user_active_role (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  active_role VARCHAR(50) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Добавляем главного администратора dimid0403@gmail.com со всеми ролями
DO $$
DECLARE
  v_user_id UUID;
  v_auth_user_id UUID;
BEGIN
  -- Находим auth_user_id для dimid0403@gmail.com
  SELECT id INTO v_auth_user_id FROM auth.users WHERE email = 'dimid0403@gmail.com';
  
  IF v_auth_user_id IS NOT NULL THEN
    -- Находим или создаем пользователя в таблице users
    SELECT id INTO v_user_id FROM users WHERE auth_user_id = v_auth_user_id;
    
    IF v_user_id IS NULL THEN
      INSERT INTO users (auth_user_id, email, full_name, role, is_active)
      VALUES (v_auth_user_id, 'dimid0403@gmail.com', 'Главный Администратор', 'admin', true)
      RETURNING id INTO v_user_id;
    END IF;
    
    -- Добавляем все роли
    INSERT INTO user_roles (user_id, role) VALUES (v_user_id, 'super_admin') ON CONFLICT DO NOTHING;
    INSERT INTO user_roles (user_id, role) VALUES (v_user_id, 'admin') ON CONFLICT DO NOTHING;
    INSERT INTO user_roles (user_id, role) VALUES (v_user_id, 'tutor') ON CONFLICT DO NOTHING;
    INSERT INTO user_roles (user_id, role) VALUES (v_user_id, 'manager') ON CONFLICT DO NOTHING;
    
    -- Устанавливаем активную роль
    INSERT INTO user_active_role (user_id, active_role) 
    VALUES (v_user_id, 'super_admin')
    ON CONFLICT (user_id) DO UPDATE SET active_role = 'super_admin';
  END IF;
END $$;

-- 4. Функция для получения всех ролей пользователя
CREATE OR REPLACE FUNCTION get_user_roles(p_user_id UUID)
RETURNS TEXT[] AS $$
BEGIN
  RETURN ARRAY(
    SELECT role FROM user_roles WHERE user_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Функция для переключения активной роли
CREATE OR REPLACE FUNCTION switch_user_role(p_user_id UUID, p_new_role TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_has_role BOOLEAN;
BEGIN
  -- Проверяем что у пользователя есть эта роль
  SELECT EXISTS(
    SELECT 1 FROM user_roles WHERE user_id = p_user_id AND role = p_new_role
  ) INTO v_has_role;
  
  IF NOT v_has_role THEN
    RETURN FALSE;
  END IF;
  
  -- Обновляем активную роль
  INSERT INTO user_active_role (user_id, active_role, updated_at)
  VALUES (p_user_id, p_new_role, NOW())
  ON CONFLICT (user_id) DO UPDATE 
  SET active_role = p_new_role, updated_at = NOW();
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Функция для получения активной роли
CREATE OR REPLACE FUNCTION get_active_role(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_active_role TEXT;
BEGIN
  SELECT active_role INTO v_active_role 
  FROM user_active_role 
  WHERE user_id = p_user_id;
  
  -- Если активная роль не установлена, берем первую доступную
  IF v_active_role IS NULL THEN
    SELECT role INTO v_active_role 
    FROM user_roles 
    WHERE user_id = p_user_id 
    LIMIT 1;
  END IF;
  
  RETURN v_active_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. RLS политики для user_roles
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own roles"
  ON user_roles FOR SELECT
  USING (auth.uid() IN (SELECT auth_user_id FROM users WHERE id = user_id));

CREATE POLICY "Super admins can manage all roles"
  ON user_roles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN user_roles ur ON ur.user_id = u.id
      WHERE u.auth_user_id = auth.uid() AND ur.role = 'super_admin'
    )
  );

-- 8. RLS политики для user_active_role
ALTER TABLE user_active_role ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view and update their active role"
  ON user_active_role FOR ALL
  USING (auth.uid() IN (SELECT auth_user_id FROM users WHERE id = user_id));
