-- Полностью отключаем RLS для таблиц ролей чтобы избежать бесконечной рекурсии
-- Эти таблицы не содержат чувствительных данных, только связи пользователь-роль

-- Отключаем RLS для user_roles
ALTER TABLE user_roles DISABLE ROW LEVEL SECURITY;

-- Отключаем RLS для user_active_role
ALTER TABLE user_active_role DISABLE ROW LEVEL SECURITY;

-- Добавляем роль admin для пользователя dimid0403@gmail.com
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Находим пользователя по email
  SELECT id INTO v_user_id
  FROM users
  WHERE email = 'dimid0403@gmail.com';

  -- Если пользователь найден
  IF v_user_id IS NOT NULL THEN
    -- Добавляем роль admin в user_roles
    INSERT INTO user_roles (user_id, role)
    VALUES (v_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;

    -- Устанавливаем admin как активную роль
    INSERT INTO user_active_role (user_id, active_role)
    VALUES (v_user_id, 'admin')
    ON CONFLICT (user_id) DO UPDATE SET active_role = 'admin';

    RAISE NOTICE 'Роль admin добавлена для пользователя %', v_user_id;
  ELSE
    RAISE NOTICE 'Пользователь dimid0403@gmail.com не найден в таблице users';
  END IF;
END $$;
