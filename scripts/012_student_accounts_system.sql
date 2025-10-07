-- Добавляем поля для учетных записей учеников в таблицу students
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS student_login VARCHAR(50) UNIQUE,
ADD COLUMN IF NOT EXISTS student_password VARCHAR(100),
ADD COLUMN IF NOT EXISTS has_account BOOLEAN DEFAULT FALSE;

-- Обновляем таблицу profiles для поддержки ролей
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'tutor' CHECK (role IN ('tutor', 'student'));

-- Устанавливаем роль "репетитор" для существующего пользователя dimid0403@gmail.com
UPDATE profiles 
SET role = 'tutor' 
WHERE email = 'dimid0403@gmail.com';

-- Добавляем поля для оценок и домашних заданий в таблицу lessons
ALTER TABLE lessons 
ADD COLUMN IF NOT EXISTS grade INTEGER CHECK (grade >= 1 AND grade <= 5),
ADD COLUMN IF NOT EXISTS homework TEXT,
ADD COLUMN IF NOT EXISTS homework_file_url TEXT;

-- Функция для генерации уникального логина для ученика
CREATE OR REPLACE FUNCTION generate_student_login(student_name TEXT)
RETURNS TEXT AS $$
DECLARE
  base_login TEXT;
  final_login TEXT;
  counter INTEGER := 1;
BEGIN
  -- Создаем базовый логин из имени (транслитерация и удаление пробелов)
  base_login := lower(regexp_replace(student_name, '[^a-zA-Z0-9]', '', 'g'));
  base_login := substring(base_login, 1, 20);
  
  final_login := base_login;
  
  -- Проверяем уникальность и добавляем номер если нужно
  WHILE EXISTS (SELECT 1 FROM students WHERE student_login = final_login) LOOP
    final_login := base_login || counter::TEXT;
    counter := counter + 1;
  END LOOP;
  
  RETURN final_login;
END;
$$ LANGUAGE plpgsql;

-- Функция для генерации случайного пароля
CREATE OR REPLACE FUNCTION generate_random_password()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substring(chars, floor(random() * length(chars) + 1)::INTEGER, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Функция для создания учетной записи ученика
CREATE OR REPLACE FUNCTION create_student_account(p_student_id UUID)
RETURNS TABLE(login TEXT, password TEXT) AS $$
DECLARE
  v_student_name TEXT;
  v_login TEXT;
  v_password TEXT;
BEGIN
  -- Получаем имя ученика
  SELECT name INTO v_student_name FROM students WHERE id = p_student_id;
  
  IF v_student_name IS NULL THEN
    RAISE EXCEPTION 'Student not found';
  END IF;
  
  -- Генерируем логин и пароль
  v_login := generate_student_login(v_student_name);
  v_password := generate_random_password();
  
  -- Обновляем запись ученика
  UPDATE students 
  SET 
    student_login = v_login,
    student_password = v_password,
    has_account = TRUE
  WHERE id = p_student_id;
  
  RETURN QUERY SELECT v_login, v_password;
END;
$$ LANGUAGE plpgsql;

-- Создаем индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_students_login ON students(student_login);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_student_id ON profiles(student_id);

-- Обновляем политики RLS для таблицы lessons (ученики могут видеть только свои уроки)
DROP POLICY IF EXISTS "lessons_select_all" ON lessons;
CREATE POLICY "lessons_select_tutor" ON lessons
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'tutor'
    )
  );

CREATE POLICY "lessons_select_student" ON lessons
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      JOIN students ON students.id = profiles.student_id
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'student'
      AND lessons.student_id = students.id
    )
  );

-- Обновляем политики RLS для таблицы students
DROP POLICY IF EXISTS "students_select_all" ON students;
CREATE POLICY "students_select_tutor" ON students
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'tutor'
    )
  );

CREATE POLICY "students_select_own" ON students
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'student'
      AND profiles.student_id = students.id
    )
  );

COMMENT ON FUNCTION create_student_account IS 'Создает учетную запись для ученика с автоматической генерацией логина и пароля';
COMMENT ON FUNCTION generate_student_login IS 'Генерирует уникальный логин на основе имени ученика';
COMMENT ON FUNCTION generate_random_password IS 'Генерирует случайный пароль из 8 символов';
