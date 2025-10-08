-- Функция для обновления всех будущих уроков при изменении регулярного расписания
CREATE OR REPLACE FUNCTION update_recurring_lessons(
  p_schedule_id UUID,
  p_new_day INTEGER,
  p_new_time TIME,
  p_new_duration INTEGER
)
RETURNS INTEGER AS $$
DECLARE
  v_updated_count INTEGER;
BEGIN
  -- Обновляем все будущие уроки этого расписания
  WITH updated AS (
    UPDATE lessons
    SET 
      scheduled_at = (
        -- Вычисляем новую дату/время на основе нового дня недели и времени
        date_trunc('week', scheduled_at) + 
        (p_new_day || ' days')::INTERVAL + 
        p_new_time::TIME
      ),
      duration_minutes = p_new_duration,
      updated_at = NOW()
    WHERE 
      recurring_schedule_id = p_schedule_id
      AND scheduled_at >= NOW()
      AND status = 'scheduled'
    RETURNING id
  )
  SELECT COUNT(*) INTO v_updated_count FROM updated;
  
  RETURN v_updated_count;
END;
$$ LANGUAGE plpgsql;
