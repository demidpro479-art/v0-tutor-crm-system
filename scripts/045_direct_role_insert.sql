-- Добавление ролей напрямую для пользователя dimid0403@gmail.com
-- Используем конкретный UUID: 84bf9bd6-4d26-46e7-ae7b-ca19618bf835

-- Удаляем существующие роли если есть
DELETE FROM user_roles WHERE user_id = '84bf9bd6-4d26-46e7-ae7b-ca19618bf835';
DELETE FROM user_active_role WHERE user_id = '84bf9bd6-4d26-46e7-ae7b-ca19618bf835';

-- Добавляем все 4 роли
INSERT INTO user_roles (user_id, role, created_at)
VALUES 
  ('84bf9bd6-4d26-46e7-ae7b-ca19618bf835', 'super_admin', NOW()),
  ('84bf9bd6-4d26-46e7-ae7b-ca19618bf835', 'admin', NOW()),
  ('84bf9bd6-4d26-46e7-ae7b-ca19618bf835', 'tutor', NOW()),
  ('84bf9bd6-4d26-46e7-ae7b-ca19618bf835', 'manager', NOW());

-- Устанавливаем активную роль
INSERT INTO user_active_role (user_id, active_role, updated_at)
VALUES ('84bf9bd6-4d26-46e7-ae7b-ca19618bf835', 'super_admin', NOW());
