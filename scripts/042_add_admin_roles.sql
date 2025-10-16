-- Добавление всех ролей для главного администратора dimid0403@gmail.com

DO $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Находим пользователя по email в таблице users
  SELECT id INTO v_user_id
  FROM users
  WHERE email = 'dimid0403@gmail.com';
  
  -- Если пользователь найден, добавляем роли
  IF v_user_id IS NOT NULL THEN
    -- Добавляем все 4 роли
    INSERT INTO user_roles (user_id, role) VALUES
      (v_user_id, 'super_admin'),
      (v_user_id, 'admin'),
      (v_user_id, 'tutor'),
      (v_user_id, 'manager')
    ON CONFLICT (user_id, role) DO NOTHING;
    
    -- Устанавливаем super_admin как активную роль
    INSERT INTO user_active_role (user_id, active_role)
    VALUES (v_user_id, 'super_admin')
    ON CONFLICT (user_id) 
    DO UPDATE SET active_role = 'super_admin';
    
    -- Удалил UPDATE users.role чтобы избежать конфликта с check constraint
    
    RAISE NOTICE 'Роли успешно добавлены для пользователя %', v_user_id;
  ELSE
    RAISE NOTICE 'Пользователь с email dimid0403@gmail.com не найден в таблице users';
  END IF;
END $$;
