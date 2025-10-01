-- Полное обновление системы с правильной логикой списания уроков

-- Добавляем поле для хранения времени без конвертации
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS original_time TIME;

-- Обновляем существующие уроки
UPDATE lessons 
SET original_time = (scheduled_at AT TIME ZONE 'Asia/Yekaterinburg')::TIME
WHERE original_time IS NULL;

-- Создаем функцию для подсчета непроведенных уроков
CREATE OR REPLACE FUNCTION calculate_remaining_lessons(student_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  total_paid INTEGER;
  completed_count INTEGER;
BEGIN
  -- Получаем общее количество оплаченных уроков
  SELECT COALESCE(SUM(lessons_purchased), 0) INTO total_paid
  FROM payments
  WHERE student_id = student_uuid;
  
  -- Получаем количество проведенных уроков
  SELECT COUNT(*) INTO completed_count
  FROM lessons
  WHERE student_id = student_uuid AND status = 'completed';
  
  RETURN total_paid - completed_count;
END;
$$ LANGUAGE plpgsql;

-- Создаем триггер для автоматического обновления remaining_lessons
CREATE OR REPLACE FUNCTION update_remaining_lessons_trigger()
RETURNS TRIGGER AS $$
BEGIN
  -- Обновляем remaining_lessons для студента
  UPDATE students
  SET remaining_lessons = calculate_remaining_lessons(
    CASE 
      WHEN TG_OP = 'DELETE' THEN OLD.student_id
      ELSE NEW.student_id
    END
  )
  WHERE id = CASE 
    WHEN TG_OP = 'DELETE' THEN OLD.student_id
    ELSE NEW.student_id
  END;
  
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$ LANGUAGE plpgsql;

-- Удаляем старый триггер если существует
DROP TRIGGER IF EXISTS lesson_status_change_trigger ON lessons;

-- Создаем новый триггер на изменение статуса урока
CREATE TRIGGER lesson_status_change_trigger
AFTER INSERT OR UPDATE OF status OR DELETE ON lessons
FOR EACH ROW
EXECUTE FUNCTION update_remaining_lessons_trigger();

-- Также обновляем при добавлении платежа
DROP TRIGGER IF EXISTS payment_added_trigger ON payments;

CREATE TRIGGER payment_added_trigger
AFTER INSERT OR UPDATE OR DELETE ON payments
FOR EACH ROW
EXECUTE FUNCTION update_remaining_lessons_trigger();

-- Пересчитываем remaining_lessons для всех студентов
UPDATE students s
SET remaining_lessons = calculate_remaining_lessons(s.id);

-- Улучшенная функция создания уроков из регулярного расписания
CREATE OR REPLACE FUNCTION create_lessons_from_schedule_v2(
  p_student_id UUID,
  p_days_of_week INTEGER[],
  p_time TIME,
  p_duration INTEGER,
  p_start_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(created_count INTEGER, message TEXT) AS $$
DECLARE
  v_remaining_lessons INTEGER;
  v_current_date DATE;
  v_lessons_created INTEGER := 0;
  v_day_of_week INTEGER;
  v_scheduled_datetime TIMESTAMP;
BEGIN
  -- Получаем количество оставшихся уроков
  SELECT remaining_lessons INTO v_remaining_lessons
  FROM students
  WHERE id = p_student_id;
  
  IF v_remaining_lessons IS NULL OR v_remaining_lessons <= 0 THEN
    RETURN QUERY SELECT 0, 'У студента нет оставшихся уроков';
    RETURN;
  END IF;
  
  -- Начинаем с указанной даты
  v_current_date := p_start_date;
  
  -- Создаем уроки пока не закончатся оставшиеся уроки
  WHILE v_lessons_created < v_remaining_lessons LOOP
    v_day_of_week := EXTRACT(DOW FROM v_current_date)::INTEGER;
    
    -- Проверяем, входит ли текущий день недели в список
    IF v_day_of_week = ANY(p_days_of_week) THEN
      -- Создаем timestamp с указанным временем (БЕЗ конвертации)
      v_scheduled_datetime := v_current_date + p_time;
      
      -- Проверяем, нет ли уже урока в это время
      IF NOT EXISTS (
        SELECT 1 FROM lessons
        WHERE student_id = p_student_id
        AND scheduled_at = v_scheduled_datetime
      ) THEN
        -- Создаем урок со статусом 'scheduled' (НЕ списываем сразу)
        INSERT INTO lessons (
          student_id,
          title,
          scheduled_at,
          original_time,
          duration_minutes,
          status,
          lesson_type
        ) VALUES (
          p_student_id,
          'Регулярное занятие',
          v_scheduled_datetime,
          p_time,
          p_duration,
          'scheduled',
          'regular'
        );
        
        v_lessons_created := v_lessons_created + 1;
      END IF;
    END IF;
    
    -- Переходим к следующему дню
    v_current_date := v_current_date + INTERVAL '1 day';
    
    -- Защита от бесконечного цикла (максимум 365 дней вперед)
    IF v_current_date > p_start_date + INTERVAL '365 days' THEN
      EXIT;
    END IF;
  END LOOP;
  
  RETURN QUERY SELECT v_lessons_created, 
    format('Создано %s уроков из %s доступных', v_lessons_created, v_remaining_lessons);
END;
$$ LANGUAGE plpgsql;

-- Создаем таблицу для уведомлений о пополнении (если не существует)
CREATE TABLE IF NOT EXISTS lesson_refill_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  will_refill BOOLEAN DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  responded_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE
);

-- Функция для проверки и создания напоминаний о пополнении
CREATE OR REPLACE FUNCTION check_and_create_refill_reminders()
RETURNS TABLE(reminder_count INTEGER) AS $$
DECLARE
  v_student RECORD;
  v_last_lesson_date DATE;
  v_reminder_count INTEGER := 0;
BEGIN
  FOR v_student IN 
    SELECT s.id, s.name, s.remaining_lessons
    FROM students s
    WHERE s.is_active = TRUE AND s.remaining_lessons > 0 AND s.remaining_lessons <= 3
  LOOP
    -- Находим дату последнего запланированного урока
    SELECT MAX(DATE(scheduled_at)) INTO v_last_lesson_date
    FROM lessons
    WHERE student_id = v_student.id AND status = 'scheduled';
    
    -- Если последний урок в ближайшие 7 дней и нет активного напоминания
    IF v_last_lesson_date IS NOT NULL 
       AND v_last_lesson_date <= CURRENT_DATE + INTERVAL '7 days'
       AND NOT EXISTS (
         SELECT 1 FROM lesson_refill_reminders
         WHERE student_id = v_student.id 
         AND is_active = TRUE
         AND created_at > NOW() - INTERVAL '7 days'
       ) THEN
      
      INSERT INTO lesson_refill_reminders (student_id, message)
      VALUES (
        v_student.id,
        format('У студента %s осталось %s уроков. Последний урок %s. Будет пополнение?',
          v_student.name, v_student.remaining_lessons, v_last_lesson_date)
      );
      
      v_reminder_count := v_reminder_count + 1;
    END IF;
  END LOOP;
  
  RETURN QUERY SELECT v_reminder_count;
END;
$$ LANGUAGE plpgsql;
