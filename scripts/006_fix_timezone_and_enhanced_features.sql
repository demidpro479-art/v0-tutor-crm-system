-- Исправление временных зон и улучшенные функции

-- Устанавливаем временную зону для сессии
SET timezone = 'Asia/Yekaterinburg'; -- UTC+5 Пермское время

-- Функция для правильного создания регулярных уроков с учетом временной зоны
CREATE OR REPLACE FUNCTION generate_recurring_lessons_fixed(
    p_weeks_ahead INTEGER DEFAULT 4
)
RETURNS INTEGER AS $$
DECLARE
    schedule_record RECORD;
    lesson_datetime TIMESTAMP WITH TIME ZONE;
    lessons_created INTEGER := 0;
    current_date_perm DATE;
    end_date_perm DATE;
    target_date DATE;
    week_offset INTEGER;
    days_to_add INTEGER;
BEGIN
    -- Получаем текущую дату в пермском времени
    current_date_perm := (NOW() AT TIME ZONE 'Asia/Yekaterinburg')::DATE;
    end_date_perm := current_date_perm + (p_weeks_ahead * INTERVAL '1 week');
    
    -- Проходим по всем активным расписаниям
    FOR schedule_record IN 
        SELECT rs.*, s.remaining_lessons, s.is_active as student_active, s.name as student_name
        FROM recurring_schedules rs
        JOIN students s ON rs.student_id = s.id
        WHERE rs.is_active = true AND s.is_active = true AND s.remaining_lessons > 0
    LOOP
        RAISE NOTICE 'Обрабатываем расписание для ученика: %, день недели: %, время: %, осталось уроков: %', 
                     schedule_record.student_name, schedule_record.day_of_week, schedule_record.time_of_day, schedule_record.remaining_lessons;
        
        -- Генерируем уроки на указанное количество недель вперед
        FOR week_offset IN 0..p_weeks_ahead-1 LOOP
            -- Находим дату для нужного дня недели
            target_date := current_date_perm + (week_offset * INTERVAL '1 week');
            days_to_add := (schedule_record.day_of_week - EXTRACT(DOW FROM target_date)::INTEGER + 7) % 7;
            target_date := target_date + (days_to_add * INTERVAL '1 day');
            
            -- Создаем timestamp с правильным временем в пермской зоне
            lesson_datetime := (target_date::TEXT || ' ' || schedule_record.time_of_day)::TIMESTAMP AT TIME ZONE 'Asia/Yekaterinburg';
            
            RAISE NOTICE 'Проверяем дату: %, время урока: %', target_date, lesson_datetime;
            
            -- Проверяем, что дата в будущем, урок еще не создан, и у ученика есть оставшиеся уроки
            IF lesson_datetime > NOW() 
               AND target_date <= end_date_perm
               AND NOT EXISTS (
                   SELECT 1 FROM lessons 
                   WHERE student_id = schedule_record.student_id 
                   AND ABS(EXTRACT(EPOCH FROM (scheduled_at - lesson_datetime))) < 60 -- в пределах минуты
               )
               AND schedule_record.remaining_lessons > 0 THEN
                
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
                    lesson_datetime,
                    schedule_record.duration_minutes,
                    'regular',
                    'scheduled'
                );
                
                lessons_created := lessons_created + 1;
                RAISE NOTICE 'Создан урок на %', lesson_datetime;
                
                -- Уменьшаем количество оставшихся уроков у ученика
                UPDATE students 
                SET remaining_lessons = remaining_lessons - 1 
                WHERE id = schedule_record.student_id;
                
                -- Обновляем счетчик в нашем цикле
                schedule_record.remaining_lessons := schedule_record.remaining_lessons - 1;
                
                -- Если у ученика закончились уроки, прерываем цикл для этого ученика
                IF schedule_record.remaining_lessons <= 0 THEN
                    EXIT;
                END IF;
            END IF;
        END LOOP;
    END LOOP;
    
    RETURN lessons_created;
END;
$$ LANGUAGE plpgsql;

-- Функция для создания уроков на основе множественного расписания
CREATE OR REPLACE FUNCTION create_lessons_from_multiple_schedule(
    p_student_id UUID,
    p_schedule_days INTEGER[], -- массив дней недели
    p_time_of_day TIME,
    p_duration_minutes INTEGER DEFAULT 60,
    p_weeks_ahead INTEGER DEFAULT 4
)
RETURNS INTEGER AS $$
DECLARE
    day_of_week INTEGER;
    lesson_datetime TIMESTAMP WITH TIME ZONE;
    lessons_created INTEGER := 0;
    current_date_perm DATE;
    end_date_perm DATE;
    target_date DATE;
    week_offset INTEGER;
    days_to_add INTEGER;
    remaining_lessons INTEGER;
BEGIN
    -- Получаем количество оставшихся уроков у ученика
    SELECT s.remaining_lessons INTO remaining_lessons
    FROM students s
    WHERE s.id = p_student_id AND s.is_active = true;
    
    IF remaining_lessons IS NULL OR remaining_lessons <= 0 THEN
        RETURN 0;
    END IF;
    
    -- Получаем текущую дату в пермском времени
    current_date_perm := (NOW() AT TIME ZONE 'Asia/Yekaterinburg')::DATE;
    end_date_perm := current_date_perm + (p_weeks_ahead * INTERVAL '1 week');
    
    -- Проходим по каждому дню недели
    FOREACH day_of_week IN ARRAY p_schedule_days
    LOOP
        -- Генерируем уроки на указанное количество недель вперед
        FOR week_offset IN 0..p_weeks_ahead-1 LOOP
            -- Проверяем, есть ли еще оставшиеся уроки
            IF remaining_lessons <= 0 THEN
                EXIT;
            END IF;
            
            -- Находим дату для нужного дня недели
            target_date := current_date_perm + (week_offset * INTERVAL '1 week');
            days_to_add := (day_of_week - EXTRACT(DOW FROM target_date)::INTEGER + 7) % 7;
            target_date := target_date + (days_to_add * INTERVAL '1 day');
            
            -- Создаем timestamp с правильным временем в пермской зоне
            lesson_datetime := (target_date::TEXT || ' ' || p_time_of_day::TEXT)::TIMESTAMP AT TIME ZONE 'Asia/Yekaterinburg';
            
            -- Проверяем, что дата в будущем и урок еще не создан
            IF lesson_datetime > NOW() 
               AND target_date <= end_date_perm
               AND NOT EXISTS (
                   SELECT 1 FROM lessons 
                   WHERE student_id = p_student_id 
                   AND ABS(EXTRACT(EPOCH FROM (scheduled_at - lesson_datetime))) < 60
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
                    p_student_id,
                    'Регулярный урок',
                    lesson_datetime,
                    p_duration_minutes,
                    'regular',
                    'scheduled'
                );
                
                lessons_created := lessons_created + 1;
                remaining_lessons := remaining_lessons - 1;
                
                -- Обновляем количество оставшихся уроков у ученика
                UPDATE students 
                SET remaining_lessons = remaining_lessons 
                WHERE id = p_student_id;
            END IF;
        END LOOP;
    END LOOP;
    
    RETURN lessons_created;
END;
$$ LANGUAGE plpgsql;

-- Обновляем существующую функцию для корректной работы с временными зонами
DROP FUNCTION IF EXISTS generate_recurring_lessons(INTEGER);
CREATE OR REPLACE FUNCTION generate_recurring_lessons(
    p_weeks_ahead INTEGER DEFAULT 4
)
RETURNS INTEGER AS $$
BEGIN
    RETURN generate_recurring_lessons_fixed(p_weeks_ahead);
END;
$$ LANGUAGE plpgsql;
