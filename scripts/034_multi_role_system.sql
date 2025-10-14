-- Система множественных ролей для пользователей
-- Позволяет одному пользователю иметь несколько ролей (например, ГА может быть и репетитором и менеджером)

-- Создаем таблицу для хранения ролей пользователей
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL CHECK (role IN ('super_admin', 'admin', 'tutor', 'manager', 'student')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  UNIQUE(user_id, role)
);

-- Создаем индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);

-- Создаем таблицу для хранения текущей активной роли пользователя
CREATE TABLE IF NOT EXISTS user_active_role (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  active_role VARCHAR(50) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Устанавливаем главного администратора (dimid0403@gmail.com)
DO $$
DECLARE
  super_admin_id UUID;
  super_admin_email TEXT := 'dimid0403@gmail.com';
BEGIN
  -- Ищем пользователя по email в auth.users
  SELECT id INTO super_admin_id 
  FROM auth.users 
  WHERE email = super_admin_email;
  
  -- Если пользователь найден в auth.users
  IF super_admin_id IS NOT NULL THEN
    -- Проверяем есть ли он в таблице users
    IF NOT EXISTS (SELECT 1 FROM users WHERE auth_user_id = super_admin_id) THEN
      -- Создаем запись в users
      INSERT INTO users (auth_user_id, email, full_name, role, is_active)
      VALUES (super_admin_id, super_admin_email, 'Главный Администратор', 'super_admin', true);
    ELSE
      -- Обновляем существующую запись
      UPDATE users 
      SET role = 'super_admin', is_active = true, full_name = 'Главный Администратор'
      WHERE auth_user_id = super_admin_id;
    END IF;
    
    -- Получаем ID из таблицы users
    SELECT id INTO super_admin_id FROM users WHERE auth_user_id = super_admin_id;
    
    -- Добавляем все роли
    INSERT INTO user_roles (user_id, role) VALUES (super_admin_id, 'super_admin') ON CONFLICT DO NOTHING;
    INSERT INTO user_roles (user_id, role) VALUES (super_admin_id, 'admin') ON CONFLICT DO NOTHING;
    INSERT INTO user_roles (user_id, role) VALUES (super_admin_id, 'tutor') ON CONFLICT DO NOTHING;
    INSERT INTO user_roles (user_id, role) VALUES (super_admin_id, 'manager') ON CONFLICT DO NOTHING;
    
    -- Устанавливаем активную роль
    INSERT INTO user_active_role (user_id, active_role) 
    VALUES (super_admin_id, 'super_admin')
    ON CONFLICT (user_id) DO UPDATE SET active_role = 'super_admin';
    
    RAISE NOTICE 'Super admin setup completed for %', super_admin_email;
  ELSE
    RAISE NOTICE 'User % not found in auth.users. Please create account first.', super_admin_email;
  END IF;
END $$;

-- Функция для получения всех ролей пользователя
CREATE OR REPLACE FUNCTION get_user_roles(p_user_id UUID)
RETURNS TABLE (role VARCHAR) AS $$
BEGIN
  RETURN QUERY
  SELECT ur.role
  FROM user_roles ur
  WHERE ur.user_id = p_user_id
  ORDER BY 
    CASE ur.role
      WHEN 'super_admin' THEN 1
      WHEN 'admin' THEN 2
      WHEN 'tutor' THEN 3
      WHEN 'manager' THEN 4
      WHEN 'student' THEN 5
    END;
END;
$$ LANGUAGE plpgsql;

-- Функция для проверки наличия роли у пользователя
CREATE OR REPLACE FUNCTION user_has_role(p_user_id UUID, p_role VARCHAR)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = p_user_id AND role = p_role
  );
END;
$$ LANGUAGE plpgsql;

-- Функция для получения активной роли пользователя
CREATE OR REPLACE FUNCTION get_active_role(p_user_id UUID)
RETURNS VARCHAR AS $$
DECLARE
  v_active_role VARCHAR;
BEGIN
  SELECT active_role INTO v_active_role
  FROM user_active_role
  WHERE user_id = p_user_id;
  
  -- Если активная роль не установлена, берем первую доступную
  IF v_active_role IS NULL THEN
    SELECT role INTO v_active_role
    FROM user_roles
    WHERE user_id = p_user_id
    ORDER BY 
      CASE role
        WHEN 'super_admin' THEN 1
        WHEN 'admin' THEN 2
        WHEN 'tutor' THEN 3
        WHEN 'manager' THEN 4
        WHEN 'student' THEN 5
      END
    LIMIT 1;
  END IF;
  
  RETURN v_active_role;
END;
$$ LANGUAGE plpgsql;

-- Функция для переключения активной роли
CREATE OR REPLACE FUNCTION switch_active_role(p_user_id UUID, p_new_role VARCHAR)
RETURNS BOOLEAN AS $$
BEGIN
  -- Проверяем что у пользователя есть эта роль
  IF NOT user_has_role(p_user_id, p_new_role) THEN
    RAISE EXCEPTION 'User does not have role: %', p_new_role;
  END IF;
  
  -- Обновляем активную роль
  INSERT INTO user_active_role (user_id, active_role, updated_at)
  VALUES (p_user_id, p_new_role, NOW())
  ON CONFLICT (user_id) DO UPDATE 
  SET active_role = p_new_role, updated_at = NOW();
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Функция для добавления роли пользователю
CREATE OR REPLACE FUNCTION add_user_role(
  p_user_id UUID,
  p_role VARCHAR,
  p_created_by UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Проверяем что создатель имеет право добавлять роли
  IF NOT user_has_role(p_created_by, 'super_admin') AND NOT user_has_role(p_created_by, 'admin') THEN
    RAISE EXCEPTION 'Only super_admin or admin can add roles';
  END IF;
  
  -- Добавляем роль
  INSERT INTO user_roles (user_id, role, created_by)
  VALUES (p_user_id, p_role, p_created_by)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Функция для удаления роли у пользователя
CREATE OR REPLACE FUNCTION remove_user_role(
  p_user_id UUID,
  p_role VARCHAR,
  p_removed_by UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Проверяем что удаляющий имеет право удалять роли
  IF NOT user_has_role(p_removed_by, 'super_admin') AND NOT user_has_role(p_removed_by, 'admin') THEN
    RAISE EXCEPTION 'Only super_admin or admin can remove roles';
  END IF;
  
  -- Нельзя удалить роль super_admin у главного администратора
  IF p_role = 'super_admin' AND EXISTS (
    SELECT 1 FROM users WHERE id = p_user_id AND email = 'dimid0403@gmail.com'
  ) THEN
    RAISE EXCEPTION 'Cannot remove super_admin role from main administrator';
  END IF;
  
  -- Удаляем роль
  DELETE FROM user_roles 
  WHERE user_id = p_user_id AND role = p_role;
  
  -- Если удалили активную роль, переключаем на другую
  IF EXISTS (SELECT 1 FROM user_active_role WHERE user_id = p_user_id AND active_role = p_role) THEN
    PERFORM switch_active_role(p_user_id, (SELECT role FROM user_roles WHERE user_id = p_user_id LIMIT 1));
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Обновляем RLS политики для поддержки множественных ролей
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_active_role ENABLE ROW LEVEL SECURITY;

-- Политика: пользователи могут видеть свои роли
CREATE POLICY "Users can view their own roles" ON user_roles
  FOR SELECT USING (auth.uid() = user_id);

-- Политика: super_admin и admin могут видеть все роли
CREATE POLICY "Admins can view all roles" ON user_roles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid() 
      AND ur.role IN ('super_admin', 'admin')
    )
  );

-- Политика: пользователи могут видеть свою активную роль
CREATE POLICY "Users can view their active role" ON user_active_role
  FOR SELECT USING (auth.uid() = user_id);

-- Политика: пользователи могут обновлять свою активную роль
CREATE POLICY "Users can update their active role" ON user_active_role
  FOR UPDATE USING (auth.uid() = user_id);

-- Мигрируем существующие роли из таблицы users в user_roles
DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN SELECT id, role FROM users WHERE role IS NOT NULL
  LOOP
    INSERT INTO user_roles (user_id, role)
    VALUES (user_record.id, user_record.role)
    ON CONFLICT (user_id, role) DO NOTHING;
    
    -- Устанавливаем активную роль
    INSERT INTO user_active_role (user_id, active_role)
    VALUES (user_record.id, user_record.role)
    ON CONFLICT (user_id) DO NOTHING;
  END LOOP;
END $$;

COMMENT ON TABLE user_roles IS 'Хранит все роли пользователей (один пользователь может иметь несколько ролей)';
COMMENT ON TABLE user_active_role IS 'Хранит текущую активную роль пользователя для переключения между ролями';
COMMENT ON FUNCTION get_user_roles IS 'Возвращает все роли пользователя';
COMMENT ON FUNCTION user_has_role IS 'Проверяет наличие роли у пользователя';
COMMENT ON FUNCTION get_active_role IS 'Возвращает активную роль пользователя';
COMMENT ON FUNCTION switch_active_role IS 'Переключает активную роль пользователя';
COMMENT ON FUNCTION add_user_role IS 'Добавляет роль пользователю (только для super_admin и admin)';
COMMENT ON FUNCTION remove_user_role IS 'Удаляет роль у пользователя (только для super_admin и admin)';
