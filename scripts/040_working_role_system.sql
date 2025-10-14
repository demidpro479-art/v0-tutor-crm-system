-- Финальный рабочий скрипт для системы множественных ролей
-- Использует правильные типы данных и не трогает таблицу users

-- Удаляем существующие функции с CASCADE чтобы избежать конфликтов
DROP FUNCTION IF EXISTS get_user_roles(INTEGER) CASCADE;
DROP FUNCTION IF EXISTS set_active_role(INTEGER, TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_active_role(INTEGER) CASCADE;
DROP FUNCTION IF EXISTS complete_lesson_with_earning(INTEGER) CASCADE;
DROP FUNCTION IF EXISTS add_student_lessons(INTEGER, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS deduct_student_lessons(INTEGER, INTEGER) CASCADE;

-- Функция для получения всех ролей пользователя
CREATE OR REPLACE FUNCTION get_user_roles(p_user_id INTEGER)
RETURNS TEXT[] AS $$
DECLARE
  roles TEXT[];
BEGIN
  SELECT ARRAY_AGG(role) INTO roles
  FROM user_roles
  WHERE user_id = p_user_id;
  
  RETURN COALESCE(roles, ARRAY[]::TEXT[]);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Функция для установки активной роли
CREATE OR REPLACE FUNCTION set_active_role(p_user_id INTEGER, p_role TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  role_exists BOOLEAN;
BEGIN
  -- Проверяем что у пользователя есть эта роль
  SELECT EXISTS(
    SELECT 1 FROM user_roles 
    WHERE user_id = p_user_id AND role = p_role
  ) INTO role_exists;
  
  IF NOT role_exists THEN
    RETURN FALSE;
  END IF;
  
  -- Устанавливаем активную роль
  INSERT INTO user_active_role (user_id, active_role)
  VALUES (p_user_id, p_role)
  ON CONFLICT (user_id) 
  DO UPDATE SET active_role = p_role, updated_at = NOW();
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Функция для получения активной роли (возвращает TEXT)
CREATE OR REPLACE FUNCTION get_active_role(p_user_id INTEGER)
RETURNS TEXT AS $$
DECLARE
  active_role_value TEXT;
BEGIN
  SELECT active_role INTO active_role_value
  FROM user_active_role
  WHERE user_id = p_user_id;
  
  -- Если активная роль не установлена, возвращаем первую доступную роль
  IF active_role_value IS NULL THEN
    SELECT role INTO active_role_value
    FROM user_roles
    WHERE user_id = p_user_id
    LIMIT 1;
  END IF;
  
  RETURN active_role_value;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Функция для завершения урока с начислением заработка
CREATE OR REPLACE FUNCTION complete_lesson_with_earning(p_lesson_id INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
  v_tutor_id INTEGER;
  v_lesson_cost DECIMAL(10,2);
  v_student_id INTEGER;
BEGIN
  -- Получаем данные урока
  SELECT tutor_id, lesson_cost, student_id INTO v_tutor_id, v_lesson_cost, v_student_id
  FROM lessons
  WHERE id = p_lesson_id AND status = 'scheduled';
  
  IF v_tutor_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Обновляем статус урока
  UPDATE lessons 
  SET status = 'completed', updated_at = NOW()
  WHERE id = p_lesson_id;
  
  -- Начисляем заработок репетитору
  INSERT INTO tutor_earnings (tutor_id, lesson_id, amount, status, created_at)
  VALUES (v_tutor_id, p_lesson_id, v_lesson_cost, 'pending', NOW());
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Функция для добавления уроков студенту
CREATE OR REPLACE FUNCTION add_student_lessons(p_student_id INTEGER, p_count INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE students
  SET lessons_remaining = lessons_remaining + p_count,
      updated_at = NOW()
  WHERE id = p_student_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Функция для списания уроков у студента
CREATE OR REPLACE FUNCTION deduct_student_lessons(p_student_id INTEGER, p_count INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE students
  SET lessons_remaining = GREATEST(0, lessons_remaining - p_count),
      updated_at = NOW()
  WHERE id = p_student_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Добавляем роли для главного администратора dimid0403@gmail.com
-- Сначала находим user_id по email из таблицы users
DO $$
DECLARE
  v_user_id INTEGER;
BEGIN
  -- Находим пользователя по email
  SELECT id INTO v_user_id
  FROM users
  WHERE email = 'dimid0403@gmail.com';
  
  IF v_user_id IS NOT NULL THEN
    -- Удаляем существующие роли
    DELETE FROM user_roles WHERE user_id = v_user_id;
    
    -- Добавляем все 4 роли
    INSERT INTO user_roles (user_id, role) VALUES
      (v_user_id, 'super_admin'),
      (v_user_id, 'admin'),
      (v_user_id, 'tutor'),
      (v_user_id, 'manager');
    
    -- Устанавливаем активную роль super_admin
    INSERT INTO user_active_role (user_id, active_role)
    VALUES (v_user_id, 'super_admin')
    ON CONFLICT (user_id) 
    DO UPDATE SET active_role = 'super_admin', updated_at = NOW();
    
    RAISE NOTICE 'Роли успешно добавлены для пользователя dimid0403@gmail.com (user_id: %)', v_user_id;
  ELSE
    RAISE NOTICE 'Пользователь dimid0403@gmail.com не найден в таблице users';
  END IF;
END $$;
