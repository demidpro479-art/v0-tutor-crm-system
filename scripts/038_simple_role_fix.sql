-- Простой скрипт для добавления ролей без изменения существующих таблиц

-- Удаляем существующие функции если они есть
DROP FUNCTION IF EXISTS get_user_id_from_auth(uuid);
DROP FUNCTION IF EXISTS get_active_role(integer);
DROP FUNCTION IF EXISTS set_active_role(integer, text);

-- Функция для получения user_id из auth_user_id
CREATE OR REPLACE FUNCTION get_user_id_from_auth(auth_id uuid)
RETURNS integer AS $$
  SELECT id FROM users WHERE auth_user_id = auth_id LIMIT 1;
$$ LANGUAGE sql STABLE;

-- Функция для получения активной роли
CREATE OR REPLACE FUNCTION get_active_role(p_user_id integer)
RETURNS text AS $$
  SELECT active_role FROM user_active_role WHERE user_id = p_user_id LIMIT 1;
$$ LANGUAGE sql STABLE;

-- Функция для установки активной роли
CREATE OR REPLACE FUNCTION set_active_role(p_user_id integer, p_role text)
RETURNS void AS $$
BEGIN
  INSERT INTO user_active_role (user_id, active_role)
  VALUES (p_user_id, p_role)
  ON CONFLICT (user_id) 
  DO UPDATE SET active_role = p_role, updated_at = now();
END;
$$ LANGUAGE plpgsql;

-- Добавляем роли для главного администратора dimid0403@gmail.com
-- Сначала находим его user_id из таблицы users
DO $$
DECLARE
  v_user_id integer;
BEGIN
  -- Получаем user_id для dimid0403@gmail.com
  SELECT id INTO v_user_id 
  FROM users 
  WHERE email = 'dimid0403@gmail.com' 
  LIMIT 1;
  
  -- Если пользователь найден, добавляем ему роли
  IF v_user_id IS NOT NULL THEN
    -- Удаляем старые роли если есть
    DELETE FROM user_roles WHERE user_id = v_user_id;
    
    -- Добавляем все 4 роли
    INSERT INTO user_roles (user_id, role) VALUES
      (v_user_id, 'super_admin'),
      (v_user_id, 'admin'),
      (v_user_id, 'tutor'),
      (v_user_id, 'manager');
    
    -- Устанавливаем активную роль как super_admin
    INSERT INTO user_active_role (user_id, active_role)
    VALUES (v_user_id, 'super_admin')
    ON CONFLICT (user_id) 
    DO UPDATE SET active_role = 'super_admin', updated_at = now();
    
    RAISE NOTICE 'Роли успешно добавлены для пользователя dimid0403@gmail.com';
  ELSE
    RAISE NOTICE 'Пользователь dimid0403@gmail.com не найден в таблице users';
  END IF;
END $$;

-- Исправляем функцию завершения урока
DROP FUNCTION IF EXISTS complete_lesson(integer);

CREATE OR REPLACE FUNCTION complete_lesson(p_lesson_id integer)
RETURNS void AS $$
DECLARE
  v_student_id integer;
  v_tutor_id integer;
  v_lesson_cost numeric;
BEGIN
  -- Получаем данные урока
  SELECT student_id, tutor_id, lesson_cost 
  INTO v_student_id, v_tutor_id, v_lesson_cost
  FROM lessons 
  WHERE id = p_lesson_id;
  
  -- Обновляем статус урока
  UPDATE lessons 
  SET status = 'completed', 
      completed_at = now() 
  WHERE id = p_lesson_id;
  
  -- Списываем урок у студента
  UPDATE students 
  SET remaining_lessons = GREATEST(remaining_lessons - 1, 0)
  WHERE id = v_student_id;
  
  -- Начисляем заработок репетитору если указан
  IF v_tutor_id IS NOT NULL AND v_lesson_cost IS NOT NULL THEN
    INSERT INTO tutor_earnings (tutor_id, lesson_id, amount, earned_at)
    VALUES (v_tutor_id, p_lesson_id, v_lesson_cost, now());
  END IF;
END;
$$ LANGUAGE plpgsql;
