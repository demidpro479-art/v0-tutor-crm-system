-- Добавление всех ролей для главного администратора dimid0403@gmail.com
-- Используем конкретный UUID пользователя

DO $$
DECLARE
  v_auth_user_id UUID := '84bf9bd6-4d26-46e7-ae7b-ca19618bf835';
  v_user_id UUID;
BEGIN
  -- Получаем user_id из таблицы users по auth_user_id
  SELECT id INTO v_user_id
  FROM users
  WHERE auth_user_id = v_auth_user_id;

  -- Если пользователь найден, добавляем роли
  IF v_user_id IS NOT NULL THEN
    -- Удаляем существующие роли чтобы избежать дублирования
    DELETE FROM user_roles WHERE user_id = v_user_id;
    
    -- Добавляем все 4 роли
    INSERT INTO user_roles (user_id, role) VALUES
      (v_user_id, 'super_admin'),
      (v_user_id, 'admin'),
      (v_user_id, 'tutor'),
      (v_user_id, 'manager');

    -- Устанавливаем super_admin как активную роль
    INSERT INTO user_active_role (user_id, active_role)
    VALUES (v_user_id, 'super_admin')
    ON CONFLICT (user_id) 
    DO UPDATE SET active_role = 'super_admin';

    RAISE NOTICE 'Роли успешно добавлены для пользователя %', v_user_id;
  ELSE
    RAISE NOTICE 'Пользователь с auth_user_id % не найден в таблице users', v_auth_user_id;
  END IF;
END $$;
