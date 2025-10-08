-- ФИНАЛЬНОЕ ИСПРАВЛЕНИЕ ЛОГИКИ ПОДСЧЕТА УРОКОВ
-- Главное правило: урок списывается ТОЛЬКО когда он проведен (status = 'completed')

-- Удаляем все старые триггеры и функции, которые могут конфликтовать
DROP TRIGGER IF EXISTS lesson_status_change_trigger ON lessons;
DROP TRIGGER IF EXISTS auto_deduct_lesson_trigger ON lessons;
DROP TRIGGER IF EXISTS update_remaining_lessons_on_lesson_change ON lessons;
DROP TRIGGER IF EXISTS update_remaining_lessons_on_payment ON payments;
DROP FUNCTION IF EXISTS auto_deduct_lesson() CASCADE;
DROP FUNCTION IF EXISTS update_remaining_lessons_trigger() CASCADE;

-- Создаем правильную функцию для расчета оставшихся уроков
-- Оставшиеся уроки = Всего оплачено - Количество проведенных уроков
CREATE OR REPLACE FUNCTION calculate_remaining_lessons(student_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
    total_paid INTEGER;
    completed_count INTEGER;
BEGIN
    -- Получаем общее количество оплаченных уроков
    SELECT COALESCE(total_paid_lessons, 0) INTO total_paid
    FROM students
    WHERE id = student_uuid;
    
    -- Считаем количество ПРОВЕДЕННЫХ уроков (только status = 'completed')
    SELECT COUNT(*) INTO completed_count
    FROM lessons
    WHERE student_id = student_uuid AND status = 'completed';
    
    -- Возвращаем разницу (не может быть меньше 0)
    RETURN GREATEST(total_paid - completed_count, 0);
END;
$$ LANGUAGE plpgsql;

-- Создаем триггер для автоматического пересчета remaining_lessons при изменении урока
CREATE OR REPLACE FUNCTION recalculate_remaining_lessons()
RETURNS TRIGGER AS $$
BEGIN
    -- Пересчитываем remaining_lessons для студента
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
    
    RETURN CASE 
        WHEN TG_OP = 'DELETE' THEN OLD
        ELSE NEW
    END;
END;
$$ LANGUAGE plpgsql;

-- Триггер на изменение статуса урока
CREATE TRIGGER recalculate_on_lesson_change
    AFTER INSERT OR UPDATE OR DELETE ON lessons
    FOR EACH ROW
    EXECUTE FUNCTION recalculate_remaining_lessons();

-- Триггер на добавление платежа
CREATE OR REPLACE FUNCTION recalculate_on_payment()
RETURNS TRIGGER AS $$
BEGIN
    -- Обновляем total_paid_lessons
    UPDATE students
    SET total_paid_lessons = total_paid_lessons + NEW.lessons_purchased
    WHERE id = NEW.student_id;
    
    -- Пересчитываем remaining_lessons
    UPDATE students
    SET remaining_lessons = calculate_remaining_lessons(NEW.student_id)
    WHERE id = NEW.student_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER recalculate_on_payment_trigger
    AFTER INSERT ON payments
    FOR EACH ROW
    EXECUTE FUNCTION recalculate_on_payment();

-- Пересчитываем remaining_lessons для ВСЕХ студентов (исправляем текущие данные)
UPDATE students
SET remaining_lessons = calculate_remaining_lessons(id);

-- Создаем функцию для получения статистики по ученику
CREATE OR REPLACE FUNCTION get_student_stats(student_uuid UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_paid_lessons', s.total_paid_lessons,
        'remaining_lessons', s.remaining_lessons,
        'completed_lessons', (
            SELECT COUNT(*) FROM lessons 
            WHERE student_id = student_uuid AND status = 'completed'
        ),
        'scheduled_lessons', (
            SELECT COUNT(*) FROM lessons 
            WHERE student_id = student_uuid AND status = 'scheduled'
        ),
        'cancelled_lessons', (
            SELECT COUNT(*) FROM lessons 
            WHERE student_id = student_uuid AND status = 'cancelled'
        ),
        'missed_lessons', (
            SELECT COUNT(*) FROM lessons 
            WHERE student_id = student_uuid AND status = 'missed'
        )
    ) INTO result
    FROM students s
    WHERE s.id = student_uuid;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Обновляем функцию создания уроков из регулярного расписания
-- Теперь она НЕ списывает уроки при создании, только создает со статусом 'scheduled'
CREATE OR REPLACE FUNCTION create_lessons_from_schedule()
RETURNS TEXT AS $$
DECLARE
    schedule_record RECORD;
    lesson_date TIMESTAMP WITH TIME ZONE;
    lessons_created INTEGER := 0;
    current_week_start DATE;
    next_week_end DATE;
BEGIN
    current_week_start := date_trunc('week', CURRENT_DATE)::DATE;
    next_week_end := (current_week_start + INTERVAL '2 weeks')::DATE;
    
    FOR schedule_record IN
        SELECT rs.*, s.name as student_name, s.remaining_lessons
        FROM recurring_schedules rs
        JOIN students s ON s.id = rs.student_id
        WHERE rs.is_active = true 
        AND s.is_active = true
        -- Проверяем что у ученика есть оплаченные уроки
        AND s.remaining_lessons > 0
    LOOP
        lesson_date := current_week_start + 
                      (schedule_record.day_of_week || ' days')::INTERVAL +
                      schedule_record.time_of_day::INTERVAL;
        
        WHILE lesson_date < next_week_end LOOP
            -- Проверяем, что урок еще не создан
            IF NOT EXISTS (
                SELECT 1 FROM lessons
                WHERE student_id = schedule_record.student_id
                AND scheduled_at = lesson_date
            ) THEN
                -- Создаем урок со статусом 'scheduled' (НЕ списываем сразу)
                INSERT INTO lessons (
                    student_id,
                    title,
                    scheduled_at,
                    duration_minutes,
                    status,
                    lesson_type,
                    original_time
                ) VALUES (
                    schedule_record.student_id,
                    'Регулярный урок',
                    lesson_date,
                    schedule_record.duration_minutes,
                    'scheduled', -- Статус 'scheduled', урок НЕ списан
                    'regular',
                    schedule_record.time_of_day
                );
                
                lessons_created := lessons_created + 1;
            END IF;
            
            lesson_date := lesson_date + INTERVAL '1 week';
        END LOOP;
    END LOOP;
    
    RETURN format('Создано %s уроков', lessons_created);
END;
$$ LANGUAGE plpgsql;

-- Комментарий для понимания логики:
-- 1. total_paid_lessons - общее количество ОПЛАЧЕННЫХ уроков (увеличивается при платеже)
-- 2. remaining_lessons - АВТОМАТИЧЕСКИ рассчитывается как: total_paid_lessons - количество completed уроков
-- 3. Уроки со статусом 'scheduled', 'cancelled', 'missed' НЕ списываются
-- 4. Урок списывается ТОЛЬКО когда статус меняется на 'completed'
