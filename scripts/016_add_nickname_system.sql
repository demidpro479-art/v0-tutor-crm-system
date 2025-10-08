-- Добавляем поле nickname в таблицу profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS nickname VARCHAR(100);

-- Создаем функцию для установки никнейма при первом входе
CREATE OR REPLACE FUNCTION set_student_nickname(
  p_user_id UUID,
  p_nickname VARCHAR
)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles
  SET nickname = p_nickname
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
