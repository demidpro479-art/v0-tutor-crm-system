-- Исправление RLS политик для таблицы lessons чтобы убрать бесконечную рекурсию

-- Удаляем все существующие политики для lessons
DROP POLICY IF EXISTS "Users can view their own lessons" ON lessons;
DROP POLICY IF EXISTS "Users can insert their own lessons" ON lessons;
DROP POLICY IF EXISTS "Users can update their own lessons" ON lessons;
DROP POLICY IF EXISTS "Users can delete their own lessons" ON lessons;
DROP POLICY IF EXISTS "Tutors can view their lessons" ON lessons;
DROP POLICY IF EXISTS "Tutors can manage their lessons" ON lessons;
DROP POLICY IF EXISTS "Admins can manage all lessons" ON lessons;

-- Создаем простые политики без рекурсии
-- Политика для чтения: пользователи могут видеть уроки своих учеников
CREATE POLICY "Users can view lessons"
ON lessons FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM students
    WHERE students.id = lessons.student_id
    AND students.tutor_id IN (
      SELECT id FROM users WHERE auth_user_id = auth.uid()
    )
  )
  OR
  EXISTS (
    SELECT 1 FROM users
    WHERE users.auth_user_id = auth.uid()
    AND users.role IN ('admin', 'manager')
  )
);

-- Политика для вставки
CREATE POLICY "Users can insert lessons"
ON lessons FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM students
    WHERE students.id = lessons.student_id
    AND students.tutor_id IN (
      SELECT id FROM users WHERE auth_user_id = auth.uid()
    )
  )
  OR
  EXISTS (
    SELECT 1 FROM users
    WHERE users.auth_user_id = auth.uid()
    AND users.role IN ('admin', 'manager')
  )
);

-- Политика для обновления
CREATE POLICY "Users can update lessons"
ON lessons FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM students
    WHERE students.id = lessons.student_id
    AND students.tutor_id IN (
      SELECT id FROM users WHERE auth_user_id = auth.uid()
    )
  )
  OR
  EXISTS (
    SELECT 1 FROM users
    WHERE users.auth_user_id = auth.uid()
    AND users.role IN ('admin', 'manager')
  )
);

-- Политика для удаления
CREATE POLICY "Users can delete lessons"
ON lessons FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM students
    WHERE students.id = lessons.student_id
    AND students.tutor_id IN (
      SELECT id FROM users WHERE auth_user_id = auth.uid()
    )
  )
  OR
  EXISTS (
    SELECT 1 FROM users
    WHERE users.auth_user_id = auth.uid()
    AND users.role IN ('admin', 'manager')
  )
);
