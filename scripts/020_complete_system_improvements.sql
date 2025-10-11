-- ПОЛНОЕ УЛУЧШЕНИЕ СИСТЕМЫ УПРАВЛЕНИЯ УРОКАМИ

-- Функция для обнуления уроков ученика
CREATE OR REPLACE FUNCTION reset_student_lessons(p_student_id UUID)
RETURNS VOID AS $$
BEGIN
    -- Обнуляем оплаченные уроки
    UPDATE students
    SET total_paid_lessons = 0,
        remaining_lessons = 0
    WHERE id = p_student_id;
    
    -- Удаляем все запланированные уроки (не проведенные)
    DELETE FROM lessons
    WHERE student_id = p_student_id
    AND status IN ('scheduled', 'cancelled', 'missed');
END;
$$ LANGUAGE plpgsql;

-- Функция для списания определенного количества уроков
CREATE OR REPLACE FUNCTION deduct_lessons(p_student_id UUID, p_lessons_count INTEGER, p_reason TEXT DEFAULT NULL)
RETURNS JSON AS $$
DECLARE
    current_paid INTEGER;
    current_remaining INTEGER;
    result JSON;
BEGIN
    -- Получаем текущие значения
    SELECT total_paid_lessons, remaining_lessons
    INTO current_paid, current_remaining
    FROM students
    WHERE id = p_student_id;
    
    -- Проверяем что есть что списывать
    IF current_remaining < p_lessons_count THEN
        RAISE EXCEPTION 'Недостаточно уроков для списания. Доступно: %, запрошено: %', 
            current_remaining, p_lessons_count;
    END IF;
    
    -- Уменьшаем количество оплаченных уроков
    UPDATE students
    SET total_paid_lessons = total_paid_lessons - p_lessons_count
    WHERE id = p_student_id;
    
    -- Пересчитываем remaining_lessons
    UPDATE students
    SET remaining_lessons = calculate_remaining_lessons(p_student_id)
    WHERE id = p_student_id;
    
    -- Записываем в историю
    INSERT INTO action_history (
        action_type,
        entity_type,
        entity_id,
        details
    ) VALUES (
        'deduct_lessons',
        'student',
        p_student_id,
        json_build_object(
            'lessons_deducted', p_lessons_count,
            'reason', p_reason,
            'previous_paid', current_paid,
            'previous_remaining', current_remaining
        )
    );
    
    -- Возвращаем результат
    SELECT json_build_object(
        'success', true,
        'lessons_deducted', p_lessons_count,
        'new_total_paid', total_paid_lessons,
        'new_remaining', remaining_lessons
    ) INTO result
    FROM students
    WHERE id = p_student_id;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Улучшенная функция обновления регулярного расписания
-- Удаляет старые будущие уроки и создает новые
CREATE OR REPLACE FUNCTION update_recurring_schedule_smart(
    p_schedule_id UUID,
    p_new_day_of_week INTEGER,
    p_new_time_of_day TIME,
    p_new_duration INTEGER
)
RETURNS JSON AS $$
DECLARE
    v_student_id UUID;
    v_old_day INTEGER;
    v_old_time TIME;
    deleted_count INTEGER;
    created_count INTEGER;
    result JSON;
BEGIN
    -- Получаем старые данные расписания
    SELECT student_id, day_of_week, time_of_day
    INTO v_student_id, v_old_day, v_old_time
    FROM recurring_schedules
    WHERE id = p_schedule_id;
    
    -- Удаляем все БУДУЩИЕ уроки по старому расписанию
    WITH deleted AS (
        DELETE FROM lessons
        WHERE student_id = v_student_id
        AND status = 'scheduled'
        AND scheduled_at > NOW()
        AND EXTRACT(DOW FROM scheduled_at) = v_old_day
        AND (scheduled_at::TIME) = v_old_time
        RETURNING id
    )
    SELECT COUNT(*) INTO deleted_count FROM deleted;
    
    -- Обновляем расписание
    UPDATE recurring_schedules
    SET day_of_week = p_new_day_of_week,
        time_of_day = p_new_time_of_day,
        duration_minutes = p_new_duration,
        updated_at = NOW()
    WHERE id = p_schedule_id;
    
    -- Создаем новые уроки на следующие 2 недели
    WITH RECURSIVE dates AS (
        -- Находим первую дату с новым днем недели
        SELECT 
            (DATE_TRUNC('week', CURRENT_DATE) + 
             (p_new_day_of_week || ' days')::INTERVAL +
             p_new_time_of_day::INTERVAL)::TIMESTAMP WITH TIME ZONE as lesson_date
        UNION ALL
        SELECT (lesson_date + INTERVAL '1 week')::TIMESTAMP WITH TIME ZONE
        FROM dates
        WHERE lesson_date < (CURRENT_DATE + INTERVAL '2 weeks')
    ),
    inserted AS (
        INSERT INTO lessons (
            student_id,
            title,
            scheduled_at,
            duration_minutes,
            status,
            lesson_type,
            original_time,
            recurring_schedule_id
        )
        SELECT 
            v_student_id,
            'Регулярный урок',
            lesson_date,
            p_new_duration,
            'scheduled',
            'regular',
            p_new_time_of_day,
            p_schedule_id
        FROM dates
        WHERE lesson_date > NOW()
        AND NOT EXISTS (
            SELECT 1 FROM lessons
            WHERE student_id = v_student_id
            AND scheduled_at = lesson_date
        )
        RETURNING id
    )
    SELECT COUNT(*) INTO created_count FROM inserted;
    
    -- Формируем результат
    result := json_build_object(
        'success', true,
        'deleted_lessons', deleted_count,
        'created_lessons', created_count,
        'schedule_id', p_schedule_id
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Функция для автоматического создания уроков из всех активных расписаний
CREATE OR REPLACE FUNCTION auto_create_lessons_from_schedules()
RETURNS JSON AS $$
DECLARE
    schedule_record RECORD;
    total_created INTEGER := 0;
    result JSON;
BEGIN
    FOR schedule_record IN
        SELECT rs.*, s.remaining_lessons
        FROM recurring_schedules rs
        JOIN students s ON s.id = rs.student_id
        WHERE rs.is_active = true
        AND s.is_active = true
        AND s.remaining_lessons > 0
    LOOP
        -- Создаем уроки для каждого расписания
        WITH RECURSIVE dates AS (
            SELECT 
                (DATE_TRUNC('week', CURRENT_DATE) + 
                 (schedule_record.day_of_week || ' days')::INTERVAL +
                 schedule_record.time_of_day::INTERVAL)::TIMESTAMP WITH TIME ZONE as lesson_date
            UNION ALL
            SELECT (lesson_date + INTERVAL '1 week')::TIMESTAMP WITH TIME ZONE
            FROM dates
            WHERE lesson_date < (CURRENT_DATE + INTERVAL '2 weeks')
        ),
        inserted AS (
            INSERT INTO lessons (
                student_id,
                title,
                scheduled_at,
                duration_minutes,
                status,
                lesson_type,
                original_time,
                recurring_schedule_id
            )
            SELECT 
                schedule_record.student_id,
                'Регулярный урок',
                lesson_date,
                schedule_record.duration_minutes,
                'scheduled',
                'regular',
                schedule_record.time_of_day,
                schedule_record.id
            FROM dates
            WHERE lesson_date > NOW()
            AND NOT EXISTS (
                SELECT 1 FROM lessons
                WHERE student_id = schedule_record.student_id
                AND scheduled_at = lesson_date
            )
            RETURNING id
        )
        SELECT COUNT(*) + total_created INTO total_created FROM inserted;
    END LOOP;
    
    result := json_build_object(
        'success', true,
        'total_lessons_created', total_created
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;
