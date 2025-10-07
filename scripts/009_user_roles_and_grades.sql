-- Создание системы ролей и расширенного функционала

-- Таблица профилей пользователей с ролями
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'student', -- 'tutor' или 'student'
  student_id UUID REFERENCES students(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Добавляем поля для оценок и домашних заданий в таблицу уроков
ALTER TABLE lessons 
ADD COLUMN IF NOT EXISTS grade INTEGER CHECK (grade >= 1 AND grade <= 5),
ADD COLUMN IF NOT EXISTS homework TEXT,
ADD COLUMN IF NOT EXISTS homework_file_url TEXT;

-- Функция для автоматического создания профиля при регистрации
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    COALESCE(new.raw_user_meta_data->>'role', 'student')
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN new;
END;
$$;

-- Триггер для создания профиля
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Устанавливаем роль "tutor" для указанного email
DO $$
BEGIN
  -- Обновляем профиль если пользователь уже существует
  UPDATE profiles 
  SET role = 'tutor' 
  WHERE email = 'dimid0403@gmail.com';
END $$;

-- RLS политики для profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Пользователи могут видеть свой профиль"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Репетитор может видеть все профили"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'tutor'
    )
  );

CREATE POLICY "Пользователи могут обновлять свой профиль"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- RLS политики для students
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Репетитор может управлять учениками"
  ON students FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'tutor'
    )
  );

CREATE POLICY "Ученики могут видеть свои данные"
  ON students FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND student_id = students.id
    )
  );

-- RLS политики для lessons
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Репетитор может управлять уроками"
  ON lessons FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'tutor'
    )
  );

CREATE POLICY "Ученики могут видеть свои уроки"
  ON lessons FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.student_id = lessons.student_id
    )
  );

-- RLS политики для recurring_schedules
ALTER TABLE recurring_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Репетитор может управлять расписанием"
  ON recurring_schedules FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'tutor'
    )
  );

CREATE POLICY "Ученики могут видеть свое расписание"
  ON recurring_schedules FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.student_id = recurring_schedules.student_id
    )
  );

-- RLS политики для payments
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Репетитор может управлять платежами"
  ON payments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'tutor'
    )
  );

CREATE POLICY "Ученики могут видеть свои платежи"
  ON payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.student_id = payments.student_id
    )
  );

-- Триггер для обновления updated_at в profiles
CREATE TRIGGER update_profiles_updated_at 
BEFORE UPDATE ON profiles
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();
