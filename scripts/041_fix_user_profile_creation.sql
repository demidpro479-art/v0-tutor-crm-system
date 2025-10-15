-- Исправление создания профиля пользователя
-- Создаем функцию которая обходит RLS для создания профиля

-- Функция для безопасного создания профиля пользователя
CREATE OR REPLACE FUNCTION create_user_profile(
  p_auth_user_id UUID,
  p_email TEXT,
  p_full_name TEXT DEFAULT NULL,
  p_role TEXT DEFAULT 'student'
)
RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Проверяем существует ли уже профиль
  SELECT id INTO v_user_id
  FROM users
  WHERE auth_user_id = p_auth_user_id;
  
  -- Если профиль уже существует, возвращаем его ID
  IF v_user_id IS NOT NULL THEN
    RETURN v_user_id;
  END IF;
  
  -- Создаем новый профиль
  INSERT INTO users (auth_user_id, email, full_name, role, created_at)
  VALUES (p_auth_user_id, p_email, COALESCE(p_full_name, p_email), p_role, NOW())
  RETURNING id INTO v_user_id;
  
  -- Добавляем роль в user_roles
  INSERT INTO user_roles (user_id, role)
  VALUES (v_user_id, p_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  -- Устанавливаем активную роль
  INSERT INTO user_active_role (user_id, active_role)
  VALUES (v_user_id, p_role)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Упрощаем RLS политики для таблицы users чтобы избежать рекурсии
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON users;

-- Создаем простые политики без рекурсии
CREATE POLICY "Users can view their own profile" ON users
  FOR SELECT
  USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can update their own profile" ON users
  FOR UPDATE
  USING (auth.uid() = auth_user_id);

-- Политика INSERT теперь просто проверяет что auth_user_id совпадает с текущим пользователем
-- БЕЗ дополнительных проверок которые могут вызвать рекурсию
CREATE POLICY "Users can insert their own profile" ON users
  FOR INSERT
  WITH CHECK (auth.uid() = auth_user_id);

-- Даем права на выполнение функции всем авторизованным пользователям
GRANT EXECUTE ON FUNCTION create_user_profile(UUID, TEXT, TEXT, TEXT) TO authenticated;
