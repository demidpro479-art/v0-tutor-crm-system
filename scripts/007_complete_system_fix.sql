-- Полное исправление системы с правильными временными зонами и новыми функциями

-- Устанавливаем временную зону по умолчанию
ALTER DATABASE postgres SET timezone = 'Asia/Yekaterinburg';

-- Создаем таблицу для уведомлений о пополнении уроков
CREATE TABLE IF NOT EXISTS lesson_refill_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days')
);

-- Создаем индексы для уведомлений
CREATE INDEX IF NOT EXISTS idx_lesson_refill_notifications_student_id ON lesson_refill_notifications(student_id);
CREATE INDEX IF NOT EXISTS idx_lesson_refill_notifications_is_read ON lesson_refill_notifications(is_read);

-- Функция для создания уведомления о необходимости пополнения уроков
CREATE OR REPLACE FUNCTION create_refill_notification(
    p_student_id UUID,
    p_student_name TEXT
)
RETURNS VOID AS $$
BEGIN
    -- Проверяем, нет ли уже активного уведомления для этого ученика
    IF NOT EXISTS (
        SELECT 1 FROM lesson_refill_notifications 
        WHERE student_id = p_student_id 
        AND is_read = FALSE 
        AND expires_at > NOW()
    ) THEN
        INSERT INTO lesson_refill_notifications (student_id, message)
        VALUES (
            p_student_id, 
            'У ученика ' || p_student_name || ' заканчиваются уроки. Требуется пополнение для продолжения регулярного расписания.'
        );
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Исправленная функция для создания регулярных уроков с правильными временными зонами
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
    student_lessons_remaining INTEGER;
BEGIN
    -- Получаем текущую дату в пермском времени
    current_date_perm := (NOW() AT TIME ZONE 'Asia/Yekaterinburg')::DATE;
    end_date_perm := current_date_perm + (p_weeks_ahead * INTERVAL '1 week');
    
    RAISE NOTICE 'Генерируем уроки с % по % (пермское время)', current_date_perm, end_date_perm;
    
    -- Проходим по всем активным расписаниям
    FOR schedule_record IN 
        SELECT rs.*, s.remaining_lessons, s.is_active as student_active, s.name as student_name
        FROM recurring_schedules rs
        JOIN students s ON rs.student_id = s.id
        WHERE rs.is_active = true AND s.is_active = true
        ORDER BY s.name, rs.day_of_week, rs.time_of_day
    LOOP
        -- Получаем актуальное количество уроков
        SELECT remaining_lessons INTO student_lessons_remaining
        FROM students 
        WHERE id = schedule_record.student_id;
        
        RAISE NOTICE 'Обрабатываем расписание для ученика: %, день недели: %, время: %, осталось уроков: %', 
                     schedule_record.student_name, schedule_record.day_of_week, schedule_record.time_of_day, student_lessons_remaining;
        
        -- Если у ученика нет уроков, создаем уведомление
        IF student_lessons_remaining <= 0 THEN
            PERFORM create_refill_notification(schedule_record.student_id, schedule_record.student_name);
            CONTINUE;
        END IF;
        
        -- Генерируем уроки на указанное количество недель вперед
        FOR week_offset IN 0..p_weeks_ahead-1 LOOP
            -- Проверяем, есть ли еще уроки у ученика
            IF student_lessons_remaining <= 0 THEN
                EXIT;
            END IF;
            
            -- Находим дату для нужного дня недели
            target_date := current_date_perm + (week_offset * INTERVAL '1 week');
            days_to_add := (schedule_record.day_of_week - EXTRACT(DOW FROM target_date)::INTEGER + 7) % 7;
            target_date := target_date + (days_to_add * INTERVAL '1 day');
            
            -- Создаем правильный timestamp в пермском времени
            lesson_datetime := (target_date || ' ' || schedule_record.time_of_day)::TIMESTAMP;
            lesson_datetime := lesson_datetime AT TIME ZONE 'Asia/Yekaterinburg';
            
            RAISE NOTICE 'Проверяем дату: %, время урока: % (пермское время)', target_date, lesson_datetime;
            
            -- Проверяем, что дата в будущем, урок еще не создан
            IF lesson_datetime > NOW() 
               AND target_date <= end_date_perm
               AND NOT EXISTS (
                   SELECT 1 FROM lessons 
                   WHERE student_id = schedule_record.student_id 
                   AND DATE(scheduled_at AT TIME ZONE 'Asia/Yekaterinburg') = target_date
                   AND ABS(EXTRACT(EPOCH FROM (scheduled_at - lesson_datetime))) < 3600 -- в пределах часа
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
                    lesson_datetime,
                    schedule_record.duration_minutes,
                    'regular',
                    'scheduled'
                );
                
                lessons_created := lessons_created + 1;
                student_lessons_remaining := student_lessons_remaining - 1;
                
                RAISE NOTICE 'Создан урок на % (пермское время)', lesson_datetime;
                
                -- Уменьшаем количество оставшихся уроков у ученика
                UPDATE students 
                SET remaining_lessons = student_lessons_remaining 
                WHERE id = schedule_record.student_id;
                
                -- Если у ученика остался 1 урок, создаем уведомление
                IF student_lessons_remaining = 1 THEN
                    PERFORM create_refill_notification(schedule_record.student_id, schedule_record.student_name);
                END IF;
            END IF;
        END LOOP;
    END LOOP;
    
    RAISE NOTICE 'Всего создано уроков: %', lessons_created;
    RETURN lessons_created;
END;
$$ LANGUAGE plpgsql;

-- Исправленная функция для создания уроков на основе множественного расписания
CREATE OR REPLACE FUNCTION create_lessons_from_multiple_schedule(
    p_student_id UUID,
    p_schedule_days INTEGER[],
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
    student_name TEXT;
BEGIN
    -- Получаем информацию о ученике
    SELECT s.remaining_lessons, s.name INTO remaining_lessons, student_name
    FROM students s
    WHERE s.id = p_student_id AND s.is_active = true;
    
    IF remaining_lessons IS NULL OR remaining_lessons <= 0 THEN
        RAISE NOTICE 'У ученика % нет доступных уроков', student_name;
        RETURN 0;
    END IF;
    
    -- Получаем текущую дату в пермском времени
    current_date_perm := (NOW() AT TIME ZONE 'Asia/Yekaterinburg')::DATE;
    end_date_perm := current_date_perm + (p_weeks_ahead * INTERVAL '1 week');
    
    RAISE NOTICE 'Создаем уроки для ученика % с % по % (пермское время)', student_name, current_date_perm, end_date_perm;
    
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
            
            -- Создаем правильный timestamp в пермском времени
            lesson_datetime := (target_date || ' ' || p_time_of_day)::TIMESTAMP;
            lesson_datetime := lesson_datetime AT TIME ZONE 'Asia/Yekaterinburg';
            
            RAISE NOTICE 'Проверяем дату: %, время урока: % (пермское время)', target_date, lesson_datetime;
            
            -- Проверяем, что дата в будущем и урок еще не создан
            IF lesson_datetime > NOW() 
               AND target_date <= end_date_perm
               AND NOT EXISTS (
                   SELECT 1 FROM lessons 
                   WHERE student_id = p_student_id 
                   AND DATE(scheduled_at AT TIME ZONE 'Asia/Yekaterinburg') = target_date
                   AND ABS(EXTRACT(EPOCH FROM (scheduled_at - lesson_datetime))) < 3600
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
                
                RAISE NOTICE 'Создан урок на % (пермское время)', lesson_datetime;
                
                -- Обновляем количество оставшихся уроков у ученика
                UPDATE students 
                SET remaining_lessons = remaining_lessons 
                WHERE id = p_student_id;
                
                -- Если у ученика остался 1 урок, создаем уведомление
                IF remaining_lessons = 1 THEN
                    PERFORM create_refill_notification(p_student_id, student_name);
                END IF;
            END IF;
        END LOOP;
    END LOOP;
    
    RAISE NOTICE 'Создано уроков для ученика %: %', student_name, lessons_created;
    RETURN lessons_created;
END;
$$ LANGUAGE plpgsql;

-- Функция для обновления расписания после пополнения уроков
CREATE OR REPLACE FUNCTION update_schedule_after_refill(
    p_student_id UUID
)
RETURNS INTEGER AS $$
DECLARE
    lessons_created INTEGER := 0;
BEGIN
    -- Генерируем новые уроки для этого ученика
    SELECT generate_recurring_lessons_fixed(4) INTO lessons_created;
    
    -- Помечаем уведомления как прочитанные
    UPDATE lesson_refill_notifications 
    SET is_read = TRUE 
    WHERE student_id = p_student_id AND is_read = FALSE;
    
    RETURN lessons_created;
END;
$$ LANGUAGE plpgsql;

-- Функция для получения статистики
CREATE OR REPLACE FUNCTION get_enhanced_statistics()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_students', (SELECT COUNT(*) FROM students WHERE is_active = true),
        'total_lessons_this_month', (
            SELECT COUNT(*) FROM lessons 
            WHERE DATE_TRUNC('month', scheduled_at AT TIME ZONE 'Asia/Yekaterinburg') = DATE_TRUNC('month', NOW() AT TIME ZONE 'Asia/Yekaterinburg')
        ),
        'completed_lessons_this_month', (
            SELECT COUNT(*) FROM lessons 
            WHERE status = 'completed' 
            AND DATE_TRUNC('month', scheduled_at AT TIME ZONE 'Asia/Yekaterinburg') = DATE_TRUNC('month', NOW() AT TIME ZONE 'Asia/Yekaterinburg')
        ),
        'revenue_this_month', (
            SELECT COALESCE(SUM(price), 0) FROM lessons 
            WHERE status = 'completed' 
            AND DATE_TRUNC('month', scheduled_at AT TIME ZONE 'Asia/Yekaterinburg') = DATE_TRUNC('month', NOW() AT TIME ZONE 'Asia/Yekaterinburg')
        ),
        'upcoming_lessons_today', (
            SELECT COUNT(*) FROM lessons 
            WHERE DATE(scheduled_at AT TIME ZONE 'Asia/Yekaterinburg') = DATE(NOW() AT TIME ZONE 'Asia/Yekaterinburg')
            AND status = 'scheduled'
        ),
        'students_need_refill', (
            SELECT COUNT(DISTINCT student_id) FROM lesson_refill_notifications 
            WHERE is_read = FALSE AND expires_at > NOW()
        ),
        'total_remaining_lessons', (
            SELECT COALESCE(SUM(remaining_lessons), 0) FROM students WHERE is_active = true
        ),
        'active_recurring_schedules', (
            SELECT COUNT(*) FROM recurring_schedules WHERE is_active = true
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Обновляем существующую функцию
DROP FUNCTION IF EXISTS generate_recurring_lessons(INTEGER);
CREATE OR REPLACE FUNCTION generate_recurring_lessons(
    p_weeks_ahead INTEGER DEFAULT 4
)
RETURNS INTEGER AS $$
BEGIN
    RETURN generate_recurring_lessons_fixed(p_weeks_ahead);
END;
$$ LANGUAGE plpgsql;
