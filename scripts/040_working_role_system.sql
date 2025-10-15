-- Финальный рабочий скрипт для системы множественных ролей
-- ИСПРАВЛЕНО: Все ID в БД используют UUID, а не INTEGER!

-- Удаляем существующие функции с CASCADE
DROP FUNCTION IF EXISTS get_user_id_from_auth(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_user_roles(UUID) CASCADE;
DROP FUNCTION IF EXISTS set_active_role(UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_active_role(UUID) CASCADE;
DROP FUNCTION IF EXISTS complete_lesson_with_earning(UUID) CASCADE;
DROP FUNCTION IF EXISTS add_student_lessons(UUID, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS deduct_student_lessons(UUID, INTEGER) CASCADE;

-- Функция теперь возвращает UUID вместо INTEGER
CREATE OR REPLACE FUNCTION get_user_id_from_auth(p_auth_user_id UUID)
RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT id INTO v_user_id
  FROM users
  WHERE auth_user_id = p_auth_user_id;
  
  RETURN v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Функция для получения всех ролей пользователя
CREATE OR REPLACE FUNCTION get_user_roles(p_auth_user_id UUID)
RETURNS TEXT[] AS $$
DECLARE
  v_user_id UUID;
  roles TEXT[];
BEGIN
  v_user_id := get_user_id_from_auth(p_auth_user_id);
  
  IF v_user_id IS NULL THEN
    RETURN ARRAY[]::TEXT[];
  END IF;
  
  SELECT ARRAY_AGG(role) INTO roles
  FROM user_roles
  WHERE user_id = v_user_id;
  
  RETURN COALESCE(roles, ARRAY[]::TEXT[]);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Функция для установки активной роли
CREATE OR REPLACE FUNCTION set_active_role(p_auth_user_id UUID, p_role TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_id UUID;
  role_exists BOOLEAN;
BEGIN
  v_user_id := get_user_id_from_auth(p_auth_user_id);
  
  IF v_user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  SELECT EXISTS(
    SELECT 1 FROM user_roles 
    WHERE user_id = v_user_id AND role = p_role
  ) INTO role_exists;
  
  IF NOT role_exists THEN
    RETURN FALSE;
  END IF;
  
  INSERT INTO user_active_role (user_id, active_role)
  VALUES (v_user_id, p_role)
  ON CONFLICT (user_id) 
  DO UPDATE SET active_role = p_role, updated_at = NOW();
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Функция для получения активной роли
CREATE OR REPLACE FUNCTION get_active_role(p_auth_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_user_id UUID;
  active_role_value TEXT;
BEGIN
  v_user_id := get_user_id_from_auth(p_auth_user_id);
  
  IF v_user_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  SELECT active_role INTO active_role_value
  FROM user_active_role
  WHERE user_id = v_user_id;
  
  IF active_role_value IS NULL THEN
    SELECT role INTO active_role_value
    FROM user_roles
    WHERE user_id = v_user_id
    LIMIT 1;
    
    IF active_role_value IS NOT NULL THEN
      INSERT INTO user_active_role (user_id, active_role)
      VALUES (v_user_id, active_role_value)
      ON CONFLICT (user_id) 
      DO UPDATE SET active_role = active_role_value, updated_at = NOW();
    END IF;
  END IF;
  
  RETURN active_role_value;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Функция теперь принимает UUID для lesson_id
CREATE OR REPLACE FUNCTION complete_lesson_with_earning(p_lesson_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_tutor_id UUID;
  v_lesson_cost DECIMAL(10,2);
  v_student_id UUID;
BEGIN
  SELECT tutor_id, price, student_id INTO v_tutor_id, v_lesson_cost, v_student_id
  FROM lessons
  WHERE id = p_lesson_id AND status = 'scheduled';
  
  IF v_tutor_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  UPDATE lessons 
  SET status = 'completed', updated_at = NOW()
  WHERE id = p_lesson_id;
  
  INSERT INTO tutor_earnings (tutor_id, lesson_id, amount, status, created_at)
  VALUES (v_tutor_id, p_lesson_id, v_lesson_cost, 'pending', NOW());
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Функция теперь принимает UUID для student_id
CREATE OR REPLACE FUNCTION add_student_lessons(p_student_id UUID, p_count INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE students
  SET remaining_lessons = remaining_lessons + p_count,
      updated_at = NOW()
  WHERE id = p_student_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Функция теперь принимает UUID для student_id
CREATE OR REPLACE FUNCTION deduct_student_lessons(p_student_id UUID, p_count INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE students
  SET remaining_lessons = GREATEST(0, remaining_lessons - p_count),
      updated_at = NOW()
  WHERE id = p_student_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Переменные теперь используют UUID вместо INTEGER
DO $$
DECLARE
  v_auth_user_id UUID;
  v_user_id UUID;
BEGIN
  SELECT id INTO v_auth_user_id
  FROM auth.users
  WHERE email = 'dimid0403@gmail.com';
  
  IF v_auth_user_id IS NULL THEN
    RAISE NOTICE 'Пользователь dimid0403@gmail.com не найден в auth.users. Пожалуйста, зарегистрируйтесь сначала.';
    RETURN;
  END IF;
  
  SELECT id INTO v_user_id
  FROM users
  WHERE auth_user_id = v_auth_user_id;
  
  IF v_user_id IS NULL THEN
    INSERT INTO users (auth_user_id, email, full_name, role, created_at)
    VALUES (v_auth_user_id, 'dimid0403@gmail.com', 'Главный Администратор', 'admin', NOW())
    RETURNING id INTO v_user_id;
    
    RAISE NOTICE 'Создана запись в users для dimid0403@gmail.com';
  END IF;
  
  DELETE FROM user_roles WHERE user_id = v_user_id;
  
  INSERT INTO user_roles (user_id, role) VALUES
    (v_user_id, 'super_admin'),
    (v_user_id, 'admin'),
    (v_user_id, 'tutor'),
    (v_user_id, 'manager');
  
  INSERT INTO user_active_role (user_id, active_role)
  VALUES (v_user_id, 'super_admin')
  ON CONFLICT (user_id) 
  DO UPDATE SET active_role = 'super_admin', updated_at = NOW();
  
  RAISE NOTICE 'Роли успешно добавлены для пользователя dimid0403@gmail.com';
END $$;
