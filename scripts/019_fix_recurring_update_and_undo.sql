-- Удаляем старую функцию обновления уроков
DROP FUNCTION IF EXISTS update_recurring_lessons(UUID, INTEGER, TIME, INTEGER);

-- Создаем улучшенную функцию обновления регулярного расписания
-- Теперь удаляет старые будущие уроки и создает новые по обновленному расписанию
CREATE OR REPLACE FUNCTION update_recurring_schedule_and_lessons(
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
  v_remaining_lessons INTEGER;
  v_start_date DATE;
  v_end_date DATE;
  v_current_date DATE;
  v_scheduled_at TIMESTAMPTZ;
  v_lessons_created INTEGER := 0;
BEGIN
  -- Получаем информацию о студенте
  SELECT rs.student_id, s.remaining_lessons
  INTO v_student_id, v_remaining_lessons
  FROM recurring_schedules rs
  JOIN students s ON s.id = rs.student_id
  WHERE rs.id = p_schedule_id;

  -- Удаляем все будущие запланированные уроки этого расписания
  -- Удаляем старые уроки перед созданием новых
  DELETE FROM lessons
  WHERE recurring_schedule_id = p_schedule_id
    AND scheduled_at >= NOW()
    AND status = 'scheduled';

  -- Обновляем само расписание
  UPDATE recurring_schedules
  SET 
    day_of_week = p_new_day,
    time_of_day = p_new_time,
    duration_minutes = p_new_duration,
    updated_at = NOW()
  WHERE id = p_schedule_id;

  -- Создаем новые уроки на основе оставшихся занятий
  v_start_date := CURRENT_DATE;
  v_end_date := v_start_date + INTERVAL '90 days'; -- Создаем уроки на 3 месяца вперед
  v_current_date := v_start_date;

  WHILE v_current_date <= v_end_date AND v_lessons_created < v_remaining_lessons LOOP
    -- Проверяем, совпадает ли день недели
    IF EXTRACT(DOW FROM v_current_date) = p_new_day THEN
      -- Создаем timestamp для урока (без конвертации временных зон)
      v_scheduled_at := v_current_date + p_new_time;
      
      -- Проверяем, что урок в будущем
      IF v_scheduled_at > NOW() THEN
        -- Создаем урок
        INSERT INTO lessons (
          student_id,
          recurring_schedule_id,
          scheduled_at,
          original_time,
          duration_minutes,
          status
        ) VALUES (
          v_student_id,
          p_schedule_id,
          v_scheduled_at,
          p_new_time,
          p_new_duration,
          'scheduled'
        );
        
        v_lessons_created := v_lessons_created + 1;
      END IF;
    END IF;
    
    v_current_date := v_current_date + INTERVAL '1 day';
  END LOOP;

  RAISE NOTICE 'Создано % новых уроков для расписания %', v_lessons_created, p_schedule_id;
END;
$$;

GRANT EXECUTE ON FUNCTION update_recurring_schedule_and_lessons TO authenticated;

-- Создаем таблицу для истории действий (audit log)
-- Добавляем систему отслеживания действий для возможности отмены
CREATE TABLE IF NOT EXISTS action_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  action_type TEXT NOT NULL, -- 'delete_student', 'delete_lesson', 'update_student', etc.
  entity_type TEXT NOT NULL, -- 'student', 'lesson', 'recurring_schedule'
  entity_id UUID,
  entity_data JSONB, -- Сохраняем данные для восстановления
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_action_history_user_id ON action_history(user_id);
CREATE INDEX IF NOT EXISTS idx_action_history_created_at ON action_history(created_at DESC);

-- Добавляем поле deleted_at для soft delete
ALTER TABLE students ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE recurring_schedules ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Функция для soft delete студента с сохранением в историю
CREATE OR REPLACE FUNCTION soft_delete_student(p_student_id UUID, p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_student_data JSONB;
BEGIN
  -- Сохраняем данные студента
  SELECT to_jsonb(students.*) INTO v_student_data
  FROM students
  WHERE id = p_student_id AND deleted_at IS NULL;

  IF v_student_data IS NOT NULL THEN
    -- Сохраняем в историю
    INSERT INTO action_history (user_id, action_type, entity_type, entity_id, entity_data)
    VALUES (p_user_id, 'delete_student', 'student', p_student_id, v_student_data);

    -- Помечаем как удаленный
    UPDATE students SET deleted_at = NOW() WHERE id = p_student_id;
    
    -- Также помечаем все уроки студента как удаленные
    UPDATE lessons SET deleted_at = NOW() WHERE student_id = p_student_id AND deleted_at IS NULL;
    
    -- И расписания
    UPDATE recurring_schedules SET deleted_at = NOW() WHERE student_id = p_student_id AND deleted_at IS NULL;
  END IF;
END;
$$;

-- Функция для восстановления студента
CREATE OR REPLACE FUNCTION restore_student(p_action_id UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_student_id UUID;
  v_student_data JSONB;
BEGIN
  -- Получаем данные из истории
  SELECT entity_id, entity_data INTO v_student_id, v_student_data
  FROM action_history
  WHERE id = p_action_id AND action_type = 'delete_student';

  IF v_student_id IS NOT NULL THEN
    -- Восстанавливаем студента
    UPDATE students SET deleted_at = NULL WHERE id = v_student_id;
    
    -- Восстанавливаем уроки
    UPDATE lessons SET deleted_at = NULL WHERE student_id = v_student_id;
    
    -- Восстанавливаем расписания
    UPDATE recurring_schedules SET deleted_at = NULL WHERE student_id = v_student_id;
    
    -- Удаляем запись из истории
    DELETE FROM action_history WHERE id = p_action_id;
  END IF;
END;
$$;

-- Функция для soft delete урока
CREATE OR REPLACE FUNCTION soft_delete_lesson(p_lesson_id UUID, p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_lesson_data JSONB;
BEGIN
  SELECT to_jsonb(lessons.*) INTO v_lesson_data
  FROM lessons
  WHERE id = p_lesson_id AND deleted_at IS NULL;

  IF v_lesson_data IS NOT NULL THEN
    INSERT INTO action_history (user_id, action_type, entity_type, entity_id, entity_data)
    VALUES (p_user_id, 'delete_lesson', 'lesson', p_lesson_id, v_lesson_data);

    UPDATE lessons SET deleted_at = NOW() WHERE id = p_lesson_id;
  END IF;
END;
$$;

-- Функция для восстановления урока
CREATE OR REPLACE FUNCTION restore_lesson(p_action_id UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_lesson_id UUID;
BEGIN
  SELECT entity_id INTO v_lesson_id
  FROM action_history
  WHERE id = p_action_id AND action_type = 'delete_lesson';

  IF v_lesson_id IS NOT NULL THEN
    UPDATE lessons SET deleted_at = NULL WHERE id = v_lesson_id;
    DELETE FROM action_history WHERE id = p_action_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION soft_delete_student TO authenticated;
GRANT EXECUTE ON FUNCTION restore_student TO authenticated;
GRANT EXECUTE ON FUNCTION soft_delete_lesson TO authenticated;
GRANT EXECUTE ON FUNCTION restore_lesson TO authenticated;

-- Обновляем представления для фильтрации удаленных записей
-- Теперь все запросы должны проверять deleted_at IS NULL
