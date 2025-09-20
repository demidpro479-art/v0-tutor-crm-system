-- Улучшенные функции для автоматического списания уроков

-- Функция для автоматической отметки пропущенных уроков (улучшенная версия)
CREATE OR REPLACE FUNCTION mark_missed_lessons()
RETURNS INTEGER AS $$
DECLARE
    lessons_marked INTEGER := 0;
BEGIN
    -- Отмечаем как пропущенные уроки, которые были запланированы более 2 часов назад
    -- и у студента еще есть оплаченные уроки
    UPDATE lessons 
    SET status = 'missed'
    FROM students s
    WHERE lessons.student_id = s.id
    AND lessons.status = 'scheduled' 
    AND lessons.scheduled_at < (NOW() - INTERVAL '2 hours')
    AND s.remaining_lessons > 0
    AND s.is_active = true;
    
    GET DIAGNOSTICS lessons_marked = ROW_COUNT;
    
    RETURN lessons_marked;
END;
$$ LANGUAGE plpgsql;

-- Функция для получения уроков, требующих обработки
CREATE OR REPLACE FUNCTION get_lessons_requiring_processing()
RETURNS TABLE (
    lesson_id UUID,
    student_id UUID,
    student_name VARCHAR(255),
    title VARCHAR(255),
    scheduled_at TIMESTAMP WITH TIME ZONE,
    duration_minutes INTEGER,
    hours_overdue INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        l.id as lesson_id,
        l.student_id,
        s.name as student_name,
        l.title,
        l.scheduled_at,
        l.duration_minutes,
        EXTRACT(EPOCH FROM (NOW() - l.scheduled_at))::INTEGER / 3600 as hours_overdue
    FROM lessons l
    JOIN students s ON l.student_id = s.id
    WHERE l.status = 'scheduled'
    AND l.scheduled_at < (NOW() - INTERVAL '1 hour')
    AND s.is_active = true
    ORDER BY l.scheduled_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Функция для массового обновления статуса уроков
CREATE OR REPLACE FUNCTION bulk_update_lesson_status(
    p_lesson_ids UUID[],
    p_new_status VARCHAR(50)
)
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER := 0;
BEGIN
    UPDATE lessons 
    SET 
        status = p_new_status,
        updated_at = NOW()
    WHERE id = ANY(p_lesson_ids);
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Функция для автоматического создания уведомлений
CREATE OR REPLACE FUNCTION create_lesson_notification(
    p_lesson_id UUID,
    p_notification_type VARCHAR(50),
    p_message TEXT
)
RETURNS VOID AS $$
BEGIN
    -- Здесь можно добавить логику для создания уведомлений
    -- Например, запись в таблицу notifications или отправка email
    
    -- Пока просто логируем в таблицу lesson_logs (если она существует)
    INSERT INTO lesson_logs (lesson_id, action, message, created_at)
    VALUES (p_lesson_id, p_notification_type, p_message, NOW())
    ON CONFLICT DO NOTHING;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Игнорируем ошибки, чтобы не блокировать основную логику
        NULL;
END;
$$ LANGUAGE plpgsql;

-- Создаем таблицу для логирования действий с уроками
CREATE TABLE IF NOT EXISTS lesson_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL,
    message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индекс для быстрого поиска логов
CREATE INDEX IF NOT EXISTS idx_lesson_logs_lesson_id ON lesson_logs(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_logs_created_at ON lesson_logs(created_at);

-- Улучшенный триггер для автоматического списания уроков
CREATE OR REPLACE FUNCTION enhanced_auto_deduct_lesson()
RETURNS TRIGGER AS $$
BEGIN
    -- Если урок переводится в статус 'completed', списываем урок у ученика
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        UPDATE students 
        SET remaining_lessons = remaining_lessons - 1
        WHERE id = NEW.student_id AND remaining_lessons > 0;
        
        -- Логируем действие
        PERFORM create_lesson_notification(
            NEW.id, 
            'lesson_completed', 
            'Урок проведен, списан 1 урок с баланса'
        );
    END IF;
    
    -- Если урок отменяется после завершения, возвращаем урок
    IF OLD.status = 'completed' AND NEW.status != 'completed' THEN
        UPDATE students 
        SET remaining_lessons = remaining_lessons + 1
        WHERE id = NEW.student_id;
        
        -- Логируем действие
        PERFORM create_lesson_notification(
            NEW.id, 
            'lesson_reverted', 
            'Урок отменен, возвращен 1 урок на баланс'
        );
    END IF;
    
    -- Если урок помечен как пропущенный, также списываем урок
    IF NEW.status = 'missed' AND OLD.status = 'scheduled' THEN
        UPDATE students 
        SET remaining_lessons = remaining_lessons - 1
        WHERE id = NEW.student_id AND remaining_lessons > 0;
        
        -- Логируем действие
        PERFORM create_lesson_notification(
            NEW.id, 
            'lesson_missed', 
            'Урок пропущен, списан 1 урок с баланса'
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Обновляем триггер
DROP TRIGGER IF EXISTS lesson_status_change_trigger ON lessons;
CREATE TRIGGER lesson_status_change_trigger
    AFTER UPDATE ON lessons
    FOR EACH ROW
    EXECUTE FUNCTION enhanced_auto_deduct_lesson();
