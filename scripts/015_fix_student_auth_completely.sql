-- Исправление системы аутентификации учеников

-- Добавляем колонку auth_user_id в таблицу students если её нет
ALTER TABLE students ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Создаем индекс для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_students_auth_user_id ON students(auth_user_id);

-- Функция для автоматического создания профиля при создании пользователя
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Создаем профиль для нового пользователя
  INSERT INTO public.profiles (id, email, role, full_name, student_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'tutor'),
    COALESCE(NEW.raw_user_meta_data->>'student_name', NEW.email),
    (NEW.raw_user_meta_data->>'student_id')::UUID
  );
  
  -- Если это ученик, обновляем запись в таблице students
  IF NEW.raw_user_meta_data->>'role' = 'student' AND NEW.raw_user_meta_data->>'student_id' IS NOT NULL THEN
    UPDATE public.students
    SET auth_user_id = NEW.id,
        has_account = true
    WHERE id = (NEW.raw_user_meta_data->>'student_id')::UUID;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Удаляем старый триггер если существует
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Создаем триггер для автоматического создания профиля
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Обновляем существующие профили для репетитора
INSERT INTO public.profiles (id, email, role, full_name)
SELECT 
  id,
  email,
  'tutor',
  COALESCE(raw_user_meta_data->>'full_name', email)
FROM auth.users
WHERE email = 'dimid0403@gmail.com'
ON CONFLICT (id) DO UPDATE
SET role = 'tutor';
