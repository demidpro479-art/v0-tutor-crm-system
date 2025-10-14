-- ФИНАЛЬНОЕ ИСПРАВЛЕНИЕ С ПРАВИЛЬНЫМИ ТИПАМИ ДАННЫХ
-- Таблица users использует INTEGER для id, не UUID

-- 1. Удаляем все конфликтующие функции
DROP FUNCTION IF EXISTS get_user_id_from_auth(uuid) CASCADE;
DROP FUNCTION IF EXISTS get_active_role(uuid) CASCADE;
DROP FUNCTION IF EXISTS get_active_role(integer) CASCADE;
DROP FUNCTION IF EXISTS set_active_role(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS set_active_role(integer, text) CASCADE;
DROP FUNCTION IF EXISTS get_user_roles(uuid) CASCADE;
DROP FUNCTION IF EXISTS add_user_role(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS complete_lesson(uuid) CASCADE;
DROP FUNCTION IF EXISTS complete_lesson(integer) CASCADE;
DROP FUNCTION IF EXISTS add_lessons_to_student(uuid, integer) CASCADE;
DROP FUNCTION IF EXISTS deduct_lessons_from_student(uuid, integer) CASCADE;

-- 2. Создаем таблицы если не существуют
CREATE TABLE IF NOT EXISTS user_roles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'admin', 'tutor', 'manager', 'student')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, role)
);

CREATE TABLE IF NOT EXISTS user_active_role (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  active_role TEXT NOT NULL CHECK (active_role IN ('super_admin', 'admin', 'tutor', 'manager', 'student')),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Создаем индексы
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);

-- 4. Функция для получения user_id по auth_user_id (возвращает INTEGER)
CREATE OR REPLACE FUNCTION get_user_id_from_auth(auth_uid UUID)
RETURNS INTEGER AS $$
  SELECT id FROM users WHERE auth_user_id = auth_uid LIMIT 1;
$$ LANGUAGE SQL STABLE;

-- 5. Функция для получения активной роли (принимает INTEGER, возвращает TEXT)
CREATE OR REPLACE FUNCTION get_active_role(p_user_id INTEGER)
RETURNS TEXT AS $$
  SELECT active_role FROM user_active_role WHERE user_id = p_user_id LIMIT 1;
$$ LANGUAGE SQL STABLE;

-- 6. Функция для установки активной роли (принимает INTEGER)
CREATE OR REPLACE FUNCTION set_active_role(p_user_id INTEGER, p_role TEXT)
RETURNS VOID AS $$
BEGIN
  -- Проверяем что у пользователя есть эта роль
  IF NOT EXISTS (SELECT 1 FROM user_roles WHERE user_id = p_user_id AND role = p_role) THEN
    RAISE EXCEPTION 'User does not have role: %', p_role;
  END IF;
  
  -- Устанавливаем активную роль
  INSERT INTO user_active_role (user_id, active_role, updated_at)
  VALUES (p_user_id, p_role, NOW())
  ON CONFLICT (user_id) 
  DO UPDATE SET active_role = p_role, updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- 7. Функция для добавления роли пользователю
CREATE OR REPLACE FUNCTION add_user_role(p_user_id INTEGER, p_role TEXT)
RETURNS VOID AS $$
BEGIN
  INSERT INTO user_roles (user_id, role)
  VALUES (p_user_id, p_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  -- Если это первая роль, устанавливаем её как активную
  IF NOT EXISTS (SELECT 1 FROM user_active_role WHERE user_id = p_user_id) THEN
    INSERT INTO user_active_role (user_id, active_role)
    VALUES (p_user_id, p_role);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 8. Добавляем роли для главного администратора dimid0403@gmail.com
DO $$
DECLARE
  v_user_id INTEGER;
BEGIN
  -- Находим user_id для dimid0403@gmail.com
  SELECT id INTO v_user_id
  FROM users
  WHERE email = 'dimid0403@gmail.com'
  LIMIT 1;
  
  IF v_user_id IS NOT NULL THEN
    -- Удаляем старые роли если есть
    DELETE FROM user_roles WHERE user_id = v_user_id;
    DELETE FROM user_active_role WHERE user_id = v_user_id;
    
    -- Добавляем все роли
    PERFORM add_user_role(v_user_id, 'super_admin');
    PERFORM add_user_role(v_user_id, 'admin');
    PERFORM add_user_role(v_user_id, 'tutor');
    PERFORM add_user_role(v_user_id, 'manager');
    
    -- Устанавливаем super_admin как активную роль
    PERFORM set_active_role(v_user_id, 'super_admin');
    
    RAISE NOTICE 'Successfully added all roles to user: %', v_user_id;
  ELSE
    RAISE NOTICE 'User not found for email: dimid0403@gmail.com';
  END IF;
END $$;

-- 9. Функция завершения урока (принимает INTEGER)
CREATE OR REPLACE FUNCTION complete_lesson(p_lesson_id INTEGER)
RETURNS VOID AS $$
DECLARE
  v_student_id INTEGER;
  v_tutor_id INTEGER;
  v_lesson_cost NUMERIC;
BEGIN
  -- Получаем данные урока
  SELECT student_id, tutor_id, lesson_cost
  INTO v_student_id, v_tutor_id, v_lesson_cost
  FROM lessons
  WHERE id = p_lesson_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lesson not found: %', p_lesson_id;
  END IF;
  
  -- Обновляем статус урока
  UPDATE lessons
  SET status = 'completed',
      completed_at = NOW()
  WHERE id = p_lesson_id;
  
  -- Уменьшаем количество оставшихся уроков у студента
  UPDATE students
  SET remaining_lessons = GREATEST(0, remaining_lessons - 1),
      updated_at = NOW()
  WHERE id = v_student_id;
  
  -- Начисляем заработок репетитору если указан
  IF v_tutor_id IS NOT NULL AND v_lesson_cost > 0 THEN
    INSERT INTO tutor_earnings (tutor_id, lesson_id, amount, status, earned_at)
    VALUES (v_tutor_id, p_lesson_id, v_lesson_cost, 'pending', NOW())
    ON CONFLICT DO NOTHING;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 10. Функция для добавления уроков студенту
CREATE OR REPLACE FUNCTION add_lessons_to_student(
  p_student_id INTEGER,
  p_lessons_count INTEGER
)
RETURNS VOID AS $$
BEGIN
  UPDATE students
  SET total_paid_lessons = total_paid_lessons + p_lessons_count,
      remaining_lessons = remaining_lessons + p_lessons_count,
      updated_at = NOW()
  WHERE id = p_student_id;
END;
$$ LANGUAGE plpgsql;

-- 11. Функция для списания уроков у студента
CREATE OR REPLACE FUNCTION deduct_lessons_from_student(
  p_student_id INTEGER,
  p_lessons_count INTEGER
)
RETURNS VOID AS $$
BEGIN
  UPDATE students
  SET remaining_lessons = GREATEST(0, remaining_lessons - p_lessons_count),
      updated_at = NOW()
  WHERE id = p_student_id;
END;
$$ LANGUAGE plpgsql;

-- 12. Включаем RLS
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_active_role ENABLE ROW LEVEL SECURITY;

-- 13. Политики для user_roles
DROP POLICY IF EXISTS "Users can view their own roles" ON user_roles;
CREATE POLICY "Users can view their own roles" ON user_roles
  FOR SELECT USING (
    user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Super admins can manage all roles" ON user_roles;
CREATE POLICY "Super admins can manage all roles" ON user_roles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN users u ON ur.user_id = u.id
      WHERE u.auth_user_id = auth.uid() AND ur.role = 'super_admin'
    )
  );

-- 14. Политики для user_active_role
DROP POLICY IF EXISTS "Users can view their active role" ON user_active_role;
CREATE POLICY "Users can view their active role" ON user_active_role
  FOR SELECT USING (
    user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can update their active role" ON user_active_role;
CREATE POLICY "Users can update their active role" ON user_active_role
  FOR UPDATE USING (
    user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
  );

-- Готово!
