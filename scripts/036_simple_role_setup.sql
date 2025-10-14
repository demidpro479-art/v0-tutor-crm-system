-- Простой скрипт для настройки множественных ролей
-- НЕ трогает таблицу users и её constraint

-- Добавляем роли для главного администратора dimid0403@gmail.com
DO $$
DECLARE
  admin_auth_id uuid;
  admin_user_id uuid;
BEGIN
  -- Находим auth_user_id по email
  SELECT id INTO admin_auth_id
  FROM auth.users
  WHERE email = 'dimid0403@gmail.com';

  IF admin_auth_id IS NOT NULL THEN
    -- Находим user_id в таблице users
    SELECT id INTO admin_user_id
    FROM users
    WHERE auth_user_id = admin_auth_id;

    IF admin_user_id IS NOT NULL THEN
      -- Удаляем старые роли если есть
      DELETE FROM user_roles WHERE user_id = admin_user_id;
      
      -- Добавляем все 4 роли для ГА
      INSERT INTO user_roles (user_id, role) VALUES
        (admin_user_id, 'super_admin'),
        (admin_user_id, 'admin'),
        (admin_user_id, 'tutor'),
        (admin_user_id, 'manager');

      -- Устанавливаем активную роль как super_admin
      INSERT INTO user_active_role (user_id, active_role)
      VALUES (admin_user_id, 'super_admin')
      ON CONFLICT (user_id) 
      DO UPDATE SET active_role = 'super_admin', updated_at = NOW();

      RAISE NOTICE 'Роли успешно добавлены для пользователя %', admin_user_id;
    ELSE
      RAISE NOTICE 'Пользователь не найден в таблице users для email dimid0403@gmail.com';
    END IF;
  ELSE
    RAISE NOTICE 'Пользователь с email dimid0403@gmail.com не найден в auth.users';
  END IF;
END $$;

-- Создаем функцию для получения всех ролей пользователя
CREATE OR REPLACE FUNCTION get_user_roles(p_user_id uuid)
RETURNS TABLE(role character varying) AS $$
BEGIN
  RETURN QUERY
  SELECT ur.role
  FROM user_roles ur
  WHERE ur.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Создаем функцию для проверки наличия роли у пользователя
CREATE OR REPLACE FUNCTION has_role(p_user_id uuid, p_role character varying)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM user_roles
    WHERE user_id = p_user_id AND role = p_role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Создаем функцию для переключения активной роли
CREATE OR REPLACE FUNCTION switch_active_role(p_user_id uuid, p_new_role character varying)
RETURNS void AS $$
BEGIN
  -- Проверяем что у пользователя есть эта роль
  IF NOT has_role(p_user_id, p_new_role) THEN
    RAISE EXCEPTION 'User does not have role: %', p_new_role;
  END IF;

  -- Обновляем активную роль
  INSERT INTO user_active_role (user_id, active_role)
  VALUES (p_user_id, p_new_role)
  ON CONFLICT (user_id)
  DO UPDATE SET active_role = p_new_role, updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Добавляем функцию для получения активной роли
CREATE OR REPLACE FUNCTION get_active_role(p_user_id uuid)
RETURNS character varying AS $$
DECLARE
  v_active_role character varying;
BEGIN
  SELECT active_role INTO v_active_role
  FROM user_active_role
  WHERE user_id = p_user_id;
  
  RETURN v_active_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Добавляем функцию для получения user_id по auth_user_id
CREATE OR REPLACE FUNCTION get_user_id_from_auth()
RETURNS uuid AS $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT id INTO v_user_id
  FROM users
  WHERE auth_user_id = auth.uid();
  
  RETURN v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Обновляем RLS политики для работы с множественными ролями
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_active_role ENABLE ROW LEVEL SECURITY;

-- Политика: пользователи могут видеть свои роли
CREATE POLICY "Users can view their own roles"
  ON user_roles FOR SELECT
  USING (auth.uid() IN (SELECT auth_user_id FROM users WHERE id = user_id));

-- Политика: пользователи могут видеть свою активную роль
CREATE POLICY "Users can view their active role"
  ON user_active_role FOR SELECT
  USING (auth.uid() IN (SELECT auth_user_id FROM users WHERE id = user_id));

-- Политика: пользователи могут обновлять свою активную роль
CREATE POLICY "Users can update their active role"
  ON user_active_role FOR UPDATE
  USING (auth.uid() IN (SELECT auth_user_id FROM users WHERE id = user_id));
