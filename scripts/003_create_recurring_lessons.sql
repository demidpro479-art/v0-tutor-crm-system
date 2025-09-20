-- Функция для создания регулярных уроков на основе расписания
CREATE OR REPLACE FUNCTION generate_recurring_lessons(
    p_weeks_ahead INTEGER DEFAULT 4
)
RETURNS INTEGER AS $$
DECLARE
    schedule_record RECORD;
    lesson_date TIMESTAMP WITH TIME ZONE;
    lessons_created INTEGER := 0;
    current_date DATE := CURRENT_DATE;
    end_date DATE := current_date + (p_weeks_ahead * INTERVAL '1 week');
BEGIN
    -- Проходим по всем активным расписаниям
    FOR schedule_record IN 
        SELECT rs.*, s.remaining_lessons, s.is_active as student_active
        FROM recurring_schedules rs
        JOIN students s ON rs.student_id = s.id
        WHERE rs.is_active = true AND s.is_active = true AND s.remaining_lessons > 0
    LOOP
        -- Генерируем уроки на указанное количество недель вперед
        FOR week_offset IN 0..p_weeks_ahead-1 LOOP
            lesson_date := (current_date + (week_offset * INTERVAL '1 week'))::DATE + 
                          (schedule_record.day_of_week - EXTRACT(DOW FROM current_date + (week_offset * INTERVAL '1 week')))::INTEGER * INTERVAL '1 day' +
                          schedule_record.time_of_day;
            
            -- Проверяем, что дата в будущем и урок еще не создан
            IF lesson_date > NOW() AND NOT EXISTS (
                SELECT 1 FROM lessons 
                WHERE student_id = schedule_record.student_id 
                AND scheduled_at = lesson_date
            ) THEN
                -- Создаем урок
                INSERT INTO lessons (
                    student_id, 
                    title, 
                    scheduled_at, 
                    duration_minutes, 
                    lesson_type,
                    status
                ) VALUES (
                    schedule_record.student_id,
                    'Регулярный урок',
                    lesson_date,
                    schedule_record.duration_minutes,
                    'regular',
                    'scheduled'
                );
                
                lessons_created := lessons_created + 1;
            END IF;
        END LOOP;
    END LOOP;
    
    RETURN lessons_created;
END;
$$ LANGUAGE plpgsql;

-- Функция для автоматической отметки пропущенных уроков
CREATE OR REPLACE FUNCTION mark_missed_lessons()
RETURNS INTEGER AS $$
DECLARE
    lessons_marked INTEGER := 0;
BEGIN
    -- Отмечаем как пропущенные уроки, которые были запланированы более часа назад
    UPDATE lessons 
    SET status = 'missed'
    WHERE status = 'scheduled' 
    AND scheduled_at < (NOW() - INTERVAL '1 hour');
    
    GET DIAGNOSTICS lessons_marked = ROW_COUNT;
    
    RETURN lessons_marked;
END;
$$ LANGUAGE plpgsql;
