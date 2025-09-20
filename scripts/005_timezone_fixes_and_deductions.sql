-- Исправления для работы с пермским временем UTC+5 и добавление таблицы списаний

-- Создаем таблицу для истории списаний уроков
CREATE TABLE IF NOT EXISTS lesson_deductions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    lessons_deducted INTEGER NOT NULL CHECK (lessons_deducted > 0),
    reason TEXT,
    deducted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создаем индекс для быстрого поиска по ученику
CREATE INDEX IF NOT EXISTS idx_lesson_deductions_student_id ON lesson_deductions(student_id);
CREATE INDEX IF NOT EXISTS idx_lesson_deductions_deducted_at ON lesson_deductions(deducted_at);

-- Обновляем функцию генерации регулярных уроков с правильной работой с временными зонами
CREATE OR REPLACE FUNCTION generate_recurring_lessons(
    p_weeks_ahead INTEGER DEFAULT 4
)
RETURNS INTEGER AS $$
DECLARE
    schedule_record RECORD;
    lesson_datetime TIMESTAMP WITH TIME ZONE;
    lessons_created INTEGER := 0;
    current_date DATE := CURRENT_DATE;
    end_date DATE := current_date + (p_weeks_ahead * INTERVAL '1 week');
    target_date DATE;
    days_to_add INTEGER;
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
            target_date := current_date + (week_offset * INTERVAL '1 week');
            
            -- Вычисляем количество дней до нужного дня недели
            days_to_add := (schedule_record.day_of_week - EXTRACT(DOW FROM target_date)::INTEGER + 7) % 7;
            target_date := target_date + days_to_add * INTERVAL '1 day';
            
            -- Создаем timestamp с учетом пермского времени (UTC+5)
            -- Время в расписании уже в пермском времени, поэтому вычитаем 5 часов для сохранения в UTC
            lesson_datetime := target_date::TIMESTAMP + schedule_record.time_of_day - INTERVAL '5 hours';
            
            -- Проверяем, что дата в будущем и урок еще не создан
            IF lesson_datetime > NOW() AND NOT EXISTS (
                SELECT 1 FROM lessons 
                WHERE student_id = schedule_record.student_id 
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
            END IF;
        END LOOP;
    END LOOP;
    
    RETURN lessons_created;
END;
$$ LANGUAGE plpgsql;

-- Функция для получения статистики списаний
CREATE OR REPLACE FUNCTION get_deduction_stats(
    p_student_id UUID DEFAULT NULL,
    p_days_back INTEGER DEFAULT 30
)
RETURNS TABLE (
    student_id UUID,
    student_name TEXT,
    total_deductions INTEGER,
    total_lessons_deducted INTEGER,
    last_deduction_date TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id as student_id,
        s.name as student_name,
        COUNT(ld.id)::INTEGER as total_deductions,
        COALESCE(SUM(ld.lessons_deducted), 0)::INTEGER as total_lessons_deducted,
        MAX(ld.deducted_at) as last_deduction_date
    FROM students s
    LEFT JOIN lesson_deductions ld ON s.id = ld.student_id 
        AND ld.deducted_at >= NOW() - (p_days_back * INTERVAL '1 day')
    WHERE (p_student_id IS NULL OR s.id = p_student_id)
        AND s.is_active = true
    GROUP BY s.id, s.name
    ORDER BY total_lessons_deducted DESC, s.name;
END;
$$ LANGUAGE plpgsql;

-- Добавляем комментарии к таблицам для документации
COMMENT ON TABLE lesson_deductions IS 'История списаний уроков у учеников';
COMMENT ON COLUMN lesson_deductions.lessons_deducted IS 'Количество списанных уроков';
COMMENT ON COLUMN lesson_deductions.reason IS 'Причина списания уроков';
COMMENT ON COLUMN lesson_deductions.deducted_at IS 'Время списания в UTC';
