-- ПОЛНОЕ ИСПРАВЛЕНИЕ ВСЕХ ОШИБОК СИСТЕМЫ

-- 1. Удаляем все конфликтующие триггеры и функции
DROP TRIGGER IF EXISTS recalculate_remaining_lessons_trigger ON students;
DROP TRIGGER IF EXISTS recalculate_remaining_on_lesson_change ON lessons;
DROP TRIGGER IF EXISTS update_remaining_lessons_on_lesson_change ON lessons;
DROP FUNCTION IF EXISTS update_remaining_lessons_trigger() CASCADE;
DROP FUNCTION IF EXISTS recalculate_student_remaining_lessons() CASCADE;
DROP FUNCTION IF EXISTS calculate_remaining_lessons(UUID) CASCADE;
DROP FUNCTION IF EXISTS deduct_lessons(UUID, INTEGER, TEXT) CASCADE;
DROP FUNCTION IF EXISTS add_paid_lessons(UUID, INTEGER, NUMERIC, TEXT) CASCADE;
DROP FUNCTION IF EXISTS update_remaining_lessons(UUID, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS reset_student_lessons(UUID) CASCADE;

-- 2. Создаем функцию расчета оставшихся уроков
CREATE OR REPLACE FUNCTION calculate_remaining_lessons(p_student_id UUID)
RETURNS INTEGER AS $$
DECLARE
    total_paid INTEGER;
    completed_count INTEGER;
BEGIN
    -- Получаем количество оплаченных уроков
    SELECT total_paid_lessons INTO total_paid
    FROM students
    WHERE id = p_student_id;
    
    -- Считаем проведенные уроки
    SELECT COUNT(*) INTO completed_count
    FROM lessons
    WHERE student_id = p_student_id
    AND status = 'completed';
    
    -- Возвращаем разницу (не может быть меньше 0)
    RETURN GREATEST(0, COALESCE(total_paid, 0) - COALESCE(completed_count, 0));
END;
$$ LANGUAGE plpgsql;

-- 3. Создаем функцию триггера для автоматического пересчета при изменении студента
CREATE OR REPLACE FUNCTION update_remaining_lessons_trigger()
RETURNS TRIGGER AS $$
BEGIN
    -- Пересчитываем remaining_lessons
    NEW.remaining_lessons := calculate_remaining_lessons(NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Создаем функцию триггера для пересчета при изменении уроков
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

-- 5. Создаем триггеры
CREATE TRIGGER recalculate_remaining_lessons_trigger
    BEFORE UPDATE OF total_paid_lessons ON students
    FOR EACH ROW
    EXECUTE FUNCTION update_remaining_lessons_trigger();

CREATE TRIGGER recalculate_remaining_on_lesson_change
    AFTER INSERT OR UPDATE OF status OR DELETE ON lessons
    FOR EACH ROW
    EXECUTE FUNCTION recalculate_student_remaining_lessons();

-- 6. Функция списания уроков
CREATE OR REPLACE FUNCTION deduct_lessons(
    p_student_id UUID, 
    p_lessons_count INTEGER, 
    p_reason TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
    current_total INTEGER;
BEGIN
    -- Получаем текущее количество оплаченных уроков
    SELECT total_paid_lessons INTO current_total
    FROM students
    WHERE id = p_student_id;
    
    -- Проверяем что есть что списывать
    IF current_total < p_lessons_count THEN
        RAISE EXCEPTION 'Недостаточно оплаченных уроков для списания. Доступно: %, запрошено: %', 
            current_total, p_lessons_count;
    END IF;
    
    -- Уменьшаем количество оплаченных уроков
    UPDATE students
    SET total_paid_lessons = GREATEST(0, total_paid_lessons - p_lessons_count)
    WHERE id = p_student_id;
    
    -- remaining_lessons пересчитается автоматически через триггер
END;
$$ LANGUAGE plpgsql;

-- 7. Функция добавления уроков
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

-- 8. Функция для прямого изменения remaining_lessons
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

-- 9. Функция обнуления уроков
CREATE OR REPLACE FUNCTION reset_student_lessons(p_student_id UUID)
RETURNS VOID AS $$
BEGIN
    -- Удаляем все запланированные уроки (не проведенные)
    DELETE FROM lessons
    WHERE student_id = p_student_id
    AND status IN ('scheduled', 'cancelled', 'missed');
    
    -- Обнуляем оплаченные уроки
    UPDATE students
    SET total_paid_lessons = 0
    WHERE id = p_student_id;
    
    -- remaining_lessons пересчитается автоматически через триггер
END;
$$ LANGUAGE plpgsql;

-- 10. Пересчитываем remaining_lessons для всех учеников
UPDATE students
SET remaining_lessons = calculate_remaining_lessons(id);
