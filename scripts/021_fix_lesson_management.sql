-- ИСПРАВЛЕНИЕ ФУНКЦИЙ УПРАВЛЕНИЯ УРОКАМИ

-- Исправленная функция списания уроков
CREATE OR REPLACE FUNCTION deduct_lessons(
    p_student_id UUID, 
    p_lessons_count INTEGER, 
    p_reason TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
    current_remaining INTEGER;
BEGIN
    -- Получаем текущее количество оставшихся уроков
    SELECT remaining_lessons INTO current_remaining
    FROM students
    WHERE id = p_student_id;
    
    -- Проверяем что есть что списывать
    IF current_remaining < p_lessons_count THEN
        RAISE EXCEPTION 'Недостаточно уроков для списания. Доступно: %, запрошено: %', 
            current_remaining, p_lessons_count;
    END IF;
    
    -- Уменьшаем количество оплаченных уроков
    UPDATE students
    SET total_paid_lessons = GREATEST(0, total_paid_lessons - p_lessons_count)
    WHERE id = p_student_id;
    
    -- Пересчитываем remaining_lessons через триггер
    -- (триггер автоматически вызовется после UPDATE)
END;
$$ LANGUAGE plpgsql;

-- Исправленная функция добавления уроков
CREATE OR REPLACE FUNCTION add_paid_lessons(
    p_student_id UUID,
    p_lessons_count INTEGER,
    p_amount NUMERIC,
    p_notes TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    -- Добавляем уроки
    UPDATE students
    SET total_paid_lessons = total_paid_lessons + p_lessons_count
    WHERE id = p_student_id;
    
    -- Записываем платеж
    INSERT INTO payments (
        student_id,
        amount,
        lessons_count,
        notes,
        payment_date
    ) VALUES (
        p_student_id,
        p_amount,
        p_lessons_count,
        p_notes,
        NOW()
    );
    
    -- remaining_lessons пересчитается автоматически через триггер
END;
$$ LANGUAGE plpgsql;

-- Функция для прямого изменения remaining_lessons
CREATE OR REPLACE FUNCTION update_remaining_lessons(
    p_student_id UUID,
    p_new_remaining INTEGER
)
RETURNS VOID AS $$
DECLARE
    completed_count INTEGER;
BEGIN
    -- Получаем количество проведенных уроков
    SELECT COUNT(*) INTO completed_count
    FROM lessons
    WHERE student_id = p_student_id
    AND status = 'completed';
    
    -- Обновляем total_paid_lessons так, чтобы remaining_lessons стал равен p_new_remaining
    UPDATE students
    SET total_paid_lessons = completed_count + p_new_remaining
    WHERE id = p_student_id;
    
    -- remaining_lessons пересчитается автоматически через триггер
END;
$$ LANGUAGE plpgsql;

-- Убеждаемся что триггер пересчета работает правильно
DROP TRIGGER IF EXISTS recalculate_remaining_lessons_trigger ON students;
DROP TRIGGER IF EXISTS recalculate_remaining_on_lesson_change ON lessons;

CREATE TRIGGER recalculate_remaining_lessons_trigger
    AFTER UPDATE OF total_paid_lessons ON students
    FOR EACH ROW
    EXECUTE FUNCTION update_remaining_lessons_trigger();

CREATE TRIGGER recalculate_remaining_on_lesson_change
    AFTER INSERT OR UPDATE OR DELETE ON lessons
    FOR EACH ROW
    EXECUTE FUNCTION recalculate_student_remaining_lessons();

-- Функция триггера для пересчета remaining_lessons
CREATE OR REPLACE FUNCTION update_remaining_lessons_trigger()
RETURNS TRIGGER AS $$
BEGIN
    NEW.remaining_lessons := calculate_remaining_lessons(NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Функция триггера для пересчета при изменении уроков
CREATE OR REPLACE FUNCTION recalculate_student_remaining_lessons()
RETURNS TRIGGER AS $$
DECLARE
    affected_student_id UUID;
BEGIN
    -- Определяем ID ученика
    IF TG_OP = 'DELETE' THEN
        affected_student_id := OLD.student_id;
    ELSE
        affected_student_id := NEW.student_id;
    END IF;
    
    -- Пересчитываем remaining_lessons
    UPDATE students
    SET remaining_lessons = calculate_remaining_lessons(affected_student_id)
    WHERE id = affected_student_id;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;
