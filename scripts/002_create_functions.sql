-- Функции для автоматизации логики CRM

-- Функция для автоматического списания урока при его завершении
CREATE OR REPLACE FUNCTION auto_deduct_lesson()
RETURNS TRIGGER AS $$
BEGIN
    -- Если урок переводится в статус 'completed', списываем урок у ученика
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        UPDATE students 
        SET remaining_lessons = remaining_lessons - 1
        WHERE id = NEW.student_id AND remaining_lessons > 0;
    END IF;
    
    -- Если урок отменяется после завершения, возвращаем урок
    IF OLD.status = 'completed' AND NEW.status != 'completed' THEN
        UPDATE students 
        SET remaining_lessons = remaining_lessons + 1
        WHERE id = NEW.student_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для автоматического списания уроков
CREATE TRIGGER lesson_status_change_trigger
    AFTER UPDATE ON lessons
    FOR EACH ROW
    EXECUTE FUNCTION auto_deduct_lesson();

-- Функция для добавления оплаченных уроков
CREATE OR REPLACE FUNCTION add_paid_lessons(
    p_student_id UUID,
    p_lessons_count INTEGER,
    p_amount DECIMAL(10,2),
    p_notes TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    -- Добавляем запись о платеже
    INSERT INTO payments (student_id, amount, lessons_purchased, notes)
    VALUES (p_student_id, p_amount, p_lessons_count, p_notes);
    
    -- Обновляем количество уроков у ученика
    UPDATE students 
    SET 
        total_paid_lessons = total_paid_lessons + p_lessons_count,
        remaining_lessons = remaining_lessons + p_lessons_count
    WHERE id = p_student_id;
END;
$$ LANGUAGE plpgsql;

-- Функция для получения статистики
CREATE OR REPLACE FUNCTION get_statistics()
RETURNS TABLE (
    total_students INTEGER,
    active_students INTEGER,
    total_lessons_completed INTEGER,
    total_revenue DECIMAL(10,2),
    lessons_this_month INTEGER,
    revenue_this_month DECIMAL(10,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*)::INTEGER FROM students) as total_students,
        (SELECT COUNT(*)::INTEGER FROM students WHERE is_active = true) as active_students,
        (SELECT COUNT(*)::INTEGER FROM lessons WHERE status = 'completed') as total_lessons_completed,
        (SELECT COALESCE(SUM(amount), 0) FROM payments) as total_revenue,
        (SELECT COUNT(*)::INTEGER FROM lessons 
         WHERE status = 'completed' 
         AND scheduled_at >= date_trunc('month', CURRENT_DATE)) as lessons_this_month,
        (SELECT COALESCE(SUM(p.amount), 0) FROM payments p
         WHERE p.payment_date >= date_trunc('month', CURRENT_DATE)) as revenue_this_month;
END;
$$ LANGUAGE plpgsql;
