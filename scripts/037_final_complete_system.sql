-- ФИНАЛЬНАЯ РАБОЧАЯ СИСТЕМА РОЛЕЙ И УПРАВЛЕНИЯ
-- Этот скрипт НЕ трогает существующую таблицу users и её constraints
-- Использует только user_roles для множественных ролей

-- 1. Убедимся что таблицы user_roles и user_active_role существуют
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'admin', 'tutor', 'manager', 'student')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, role)
);

CREATE TABLE IF NOT EXISTS user_active_role (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  active_role TEXT NOT NULL CHECK (active_role IN ('super_admin', 'admin', 'tutor', 'manager', 'student')),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Создаем индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);

-- 3. Функция для получения user_id по auth_user_id
CREATE OR REPLACE FUNCTION get_user_id_from_auth(auth_uid UUID)
RETURNS UUID AS $$
  SELECT id FROM users WHERE auth_user_id = auth_uid LIMIT 1;
$$ LANGUAGE SQL STABLE;

-- 4. Функция для получения всех ролей пользователя
CREATE OR REPLACE FUNCTION get_user_roles(p_user_id UUID)
RETURNS TABLE(role TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT ur.role
  FROM user_roles ur
  WHERE ur.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- 5. Функция для получения активной роли
CREATE OR REPLACE FUNCTION get_active_role(p_user_id UUID)
RETURNS TEXT AS $$
  SELECT active_role FROM user_active_role WHERE user_id = p_user_id;
$$ LANGUAGE SQL STABLE;

-- 6. Функция для установки активной роли
CREATE OR REPLACE FUNCTION set_active_role(p_user_id UUID, p_role TEXT)
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
CREATE OR REPLACE FUNCTION add_user_role(p_user_id UUID, p_role TEXT)
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
  v_user_id UUID;
  v_auth_user_id UUID;
BEGIN
  -- Находим auth_user_id для dimid0403@gmail.com
  SELECT id INTO v_auth_user_id
  FROM auth.users
  WHERE email = 'dimid0403@gmail.com'
  LIMIT 1;
  
  IF v_auth_user_id IS NOT NULL THEN
    -- Находим user_id в таблице users
    SELECT id INTO v_user_id
    FROM users
    WHERE auth_user_id = v_auth_user_id
    LIMIT 1;
    
    IF v_user_id IS NOT NULL THEN
      -- Добавляем все роли
      PERFORM add_user_role(v_user_id, 'super_admin');
      PERFORM add_user_role(v_user_id, 'admin');
      PERFORM add_user_role(v_user_id, 'tutor');
      PERFORM add_user_role(v_user_id, 'manager');
      
      -- Устанавливаем super_admin как активную роль
      PERFORM set_active_role(v_user_id, 'super_admin');
      
      RAISE NOTICE 'Successfully added all roles to user: %', v_user_id;
    ELSE
      RAISE NOTICE 'User not found in users table for email: dimid0403@gmail.com';
    END IF;
  ELSE
    RAISE NOTICE 'Auth user not found for email: dimid0403@gmail.com';
  END IF;
END $$;

-- 9. Исправляем функцию завершения урока
CREATE OR REPLACE FUNCTION complete_lesson(p_lesson_id UUID)
RETURNS VOID AS $$
DECLARE
  v_student_id UUID;
  v_tutor_id UUID;
  v_lesson_cost DECIMAL;
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
      updated_at = NOW()
  WHERE id = p_lesson_id;
  
  -- Уменьшаем количество оставшихся уроков у студента
  UPDATE students
  SET remaining_lessons = GREATEST(0, remaining_lessons - 1),
      updated_at = NOW()
  WHERE id = v_student_id;
  
  -- Начисляем заработок репетитору (если указан)
  IF v_tutor_id IS NOT NULL AND v_lesson_cost > 0 THEN
    -- Получаем ставку репетитора
    DECLARE
      v_tutor_rate DECIMAL;
    BEGIN
      SELECT hourly_rate INTO v_tutor_rate
      FROM tutor_settings
      WHERE tutor_id = v_tutor_id;
      
      IF v_tutor_rate IS NOT NULL THEN
        INSERT INTO tutor_earnings (tutor_id, lesson_id, amount, status, earned_at)
        VALUES (v_tutor_id, p_lesson_id, v_tutor_rate, 'pending', NOW());
      END IF;
    END;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 10. Функция для добавления уроков студенту
CREATE OR REPLACE FUNCTION add_lessons_to_student(
  p_student_id UUID,
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
  p_student_id UUID,
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

-- 12. Включаем RLS для новых таблиц
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
