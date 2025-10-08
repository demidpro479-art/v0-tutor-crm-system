-- Функция для обновления всех будущих уроков при изменении регулярного расписания
CREATE OR REPLACE FUNCTION update_recurring_lessons(
  p_schedule_id UUID,
  p_new_day INTEGER,
  p_new_time TIME,
  p_new_duration INTEGER
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_student_id UUID;
  v_old_day INTEGER;
  v_old_time TIME;
  v_lesson RECORD;
  v_new_scheduled_at TIMESTAMPTZ;
BEGIN
  -- Получаем информацию о расписании
  SELECT student_id, day_of_week, time_of_day
  INTO v_student_id, v_old_day, v_old_time
  FROM recurring_schedules
  WHERE id = p_schedule_id;

  -- Обновляем все будущие уроки этого расписания
  FOR v_lesson IN
    SELECT id, scheduled_at
    FROM lessons
    WHERE recurring_schedule_id = p_schedule_id
      AND scheduled_at >= NOW()
      AND status = 'scheduled'
  LOOP
    -- Вычисляем новую дату/время урока
    -- Берем текущую дату урока и меняем день недели и время
    v_new_scheduled_at := date_trunc('week', v_lesson.scheduled_at) 
                         + (p_new_day || ' days')::INTERVAL 
                         + p_new_time::INTERVAL;
    
    -- Если новая дата в прошлом относительно текущей недели, переносим на следующую неделю
    IF v_new_scheduled_at < v_lesson.scheduled_at THEN
      v_new_scheduled_at := v_new_scheduled_at + INTERVAL '7 days';
    END IF;

    -- Обновляем урок
    UPDATE lessons
    SET 
      scheduled_at = v_new_scheduled_at,
      duration_minutes = p_new_duration,
      updated_at = NOW()
    WHERE id = v_lesson.id;
  END LOOP;

  RAISE NOTICE 'Обновлены все будущие уроки для расписания %', p_schedule_id;
END;
$$;

-- Даем права на выполнение функции
GRANT EXECUTE ON FUNCTION update_recurring_lessons TO authenticated;
