-- Добавление ролей для главного администратора напрямую в user_roles
-- Этот скрипт обходит RLS политики и добавляет роли напрямую

DO $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Найти пользователя по email в таблице users
  SELECT id INTO v_user_id
  FROM users
  WHERE email = 'dimid0403@gmail.com';

  IF v_user_id IS NULL THEN
    RAISE NOTICE 'Пользователь dimid0403@gmail.com не найден в таблице users';
    RETURN;
  END IF;

  RAISE NOTICE 'Найден пользователь с ID: %', v_user_id;

  -- Удалить существующие роли если есть
  DELETE FROM user_roles WHERE user_id = v_user_id;
  
  -- Добавить все 4 роли
  INSERT INTO user_roles (user_id, role) VALUES
    (v_user_id, 'super_admin'),
    (v_user_id, 'admin'),
    (v_user_id, 'tutor'),
    (v_user_id, 'manager')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Установить super_admin как активную роль
  INSERT INTO user_active_role (user_id, active_role, updated_at)
  VALUES (v_user_id, 'super_admin', NOW())
  ON CONFLICT (user_id) 
  DO UPDATE SET active_role = 'super_admin', updated_at = NOW();

  RAISE NOTICE 'Роли успешно добавлены для пользователя dimid0403@gmail.com';
END $$;
