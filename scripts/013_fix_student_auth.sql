-- Обновляем функцию создания учетной записи ученика
-- Теперь она также обновляет email ученика для входа через Supabase

CREATE OR REPLACE FUNCTION create_student_account(p_student_id UUID)
RETURNS TABLE(login TEXT, password TEXT) AS $$
DECLARE
  v_student_name TEXT;
  v_login TEXT;
  v_password TEXT;
  v_email TEXT;
BEGIN
  -- Получаем имя ученика
  SELECT name INTO v_student_name FROM students WHERE id = p_student_id;
  
  IF v_student_name IS NULL THEN
    RAISE EXCEPTION 'Student not found';
  END IF;
  
  -- Генерируем логин и пароль
  v_login := generate_student_login(v_student_name);
  v_password := generate_random_password();
  v_email := v_login || '@student.tutorcrm.local';
  
  -- Обновляем запись ученика
  UPDATE students 
  SET 
    student_login = v_login,
    student_password = v_password,
    email = v_email,
    has_account = TRUE
  WHERE id = p_student_id;
  
  RETURN QUERY SELECT v_login, v_password;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION create_student_account IS 'Создает учетную запись для ученика с автоматической генерацией логина, пароля и email для Supabase Auth';
