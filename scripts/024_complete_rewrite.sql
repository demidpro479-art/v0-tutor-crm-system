-- ПОЛНАЯ ПЕРЕЗАПИСЬ СИСТЕМЫ УПРАВЛЕНИЯ УРОКАМИ
-- Удаляем ВСЕ старые триггеры и функции, создаем новые простые

-- ============================================
-- ШАГ 1: УДАЛЕНИЕ ВСЕХ СТАРЫХ ТРИГГЕРОВ И ФУНКЦИЙ
-- ============================================

-- Удаляем все триггеры
DROP TRIGGER IF EXISTS update_remaining_lessons_trigger ON lessons;
DROP TRIGGER IF EXISTS recalculate_lessons_on_payment ON payments;
DROP TRIGGER IF EXISTS update_lessons_on_status_change ON lessons;
DROP TRIGGER IF EXISTS auto_deduct_lesson_trigger ON lessons;
DROP TRIGGER IF EXISTS recalculate_on_lesson_change ON lessons;
DROP TRIGGER IF EXISTS recalculate_on_payment_change ON payments;

-- Удаляем все функции
DROP FUNCTION IF EXISTS calculate_remaining_lessons(UUID);
DROP FUNCTION IF EXISTS update_remaining_lessons();
DROP FUNCTION IF EXISTS recalculate_student_lessons();
DROP FUNCTION IF EXISTS auto_deduct_lesson();
DROP FUNCTION IF EXISTS deduct_lessons(UUID, INTEGER);
DROP FUNCTION IF EXISTS add_lessons(UUID, INTEGER);
DROP FUNCTION IF EXISTS reset_student_lessons(UUID);
DROP FUNCTION IF EXISTS update_remaining_lessons_direct(UUID, INTEGER);
DROP FUNCTION IF EXISTS update_total_paid_lessons(UUID, INTEGER);
DROP FUNCTION IF EXISTS update_recurring_lessons(UUID, TIME, INTEGER[]);
DROP FUNCTION IF EXISTS update_recurring_schedule_and_lessons(UUID, TIME, INTEGER[]);

-- ============================================
-- ШАГ 2: СОЗДАНИЕ ПРОСТЫХ ФУНКЦИЙ
-- ============================================

-- Функция для подсчета проведенных уроков
CREATE OR REPLACE FUNCTION count_completed_lessons(p_student_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM lessons
    WHERE student_id = p_student_id
    AND status = 'completed'
    AND deleted_at IS NULL
  );
END;
$$ LANGUAGE plpgsql;

-- Функция для пересчета оставшихся уроков
CREATE OR REPLACE FUNCTION recalculate_remaining_lessons(p_student_id UUID)
RETURNS VOID AS $$
DECLARE
  v_total_paid INTEGER;
  v_completed INTEGER;
  v_remaining INTEGER;
BEGIN
  -- Получаем общее количество оплаченных уроков
  SELECT COALESCE(total_paid_lessons, 0) INTO v_total_paid
  FROM students
  WHERE id = p_student_id;
  
  -- Считаем проведенные уроки
  v_completed := count_completed_lessons(p_student_id);
  
  -- Вычисляем оставшиеся
  v_remaining := v_total_paid - v_completed;
  
  -- Обновляем
  UPDATE students
  SET remaining_lessons = v_remaining
  WHERE id = p_student_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ШАГ 3: ФУНКЦИИ ДЛЯ УПРАВЛЕНИЯ УРОКАМИ
-- ============================================

-- Добавить уроки
CREATE OR REPLACE FUNCTION add_paid_lessons(p_student_id UUID, p_amount INTEGER)
RETURNS VOID AS $$
BEGIN
  -- Увеличиваем total_paid_lessons
  UPDATE students
  SET total_paid_lessons = COALESCE(total_paid_lessons, 0) + p_amount
  WHERE id = p_student_id;
  
  -- Пересчитываем remaining_lessons
  PERFORM recalculate_remaining_lessons(p_student_id);
END;
$$ LANGUAGE plpgsql;

-- Списать уроки
CREATE OR REPLACE FUNCTION deduct_paid_lessons(p_student_id UUID, p_amount INTEGER)
RETURNS VOID AS $$
BEGIN
  -- Уменьшаем total_paid_lessons
  UPDATE students
  SET total_paid_lessons = GREATEST(COALESCE(total_paid_lessons, 0) - p_amount, 0)
  WHERE id = p_student_id;
  
  -- Пересчитываем remaining_lessons
  PERFORM recalculate_remaining_lessons(p_student_id);
END;
$$ LANGUAGE plpgsql;

-- Обнулить уроки
CREATE OR REPLACE FUNCTION reset_all_lessons(p_student_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE students
  SET total_paid_lessons = 0
  WHERE id = p_student_id;
  
  PERFORM recalculate_remaining_lessons(p_student_id);
END;
$$ LANGUAGE plpgsql;

-- Установить total_paid_lessons напрямую
CREATE OR REPLACE FUNCTION set_total_paid_lessons(p_student_id UUID, p_amount INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE students
  SET total_paid_lessons = p_amount
  WHERE id = p_student_id;
  
  PERFORM recalculate_remaining_lessons(p_student_id);
END;
$$ LANGUAGE plpgsql;

-- Установить remaining_lessons напрямую
CREATE OR REPLACE FUNCTION set_remaining_lessons(p_student_id UUID, p_amount INTEGER)
RETURNS VOID AS $$
DECLARE
  v_completed INTEGER;
BEGIN
  v_completed := count_completed_lessons(p_student_id);
  
  UPDATE students
  SET 
    total_paid_lessons = v_completed + p_amount,
    remaining_lessons = p_amount
  WHERE id = p_student_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ШАГ 4: ТРИГГЕР ДЛЯ АВТОМАТИЧЕСКОГО ПЕРЕСЧЕТА
-- ============================================

CREATE OR REPLACE FUNCTION trigger_recalculate_lessons()
RETURNS TRIGGER AS $$
BEGIN
  -- Пересчитываем для студента
  IF TG_OP = 'DELETE' THEN
    PERFORM recalculate_remaining_lessons(OLD.student_id);
  ELSE
    PERFORM recalculate_remaining_lessons(NEW.student_id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Создаем триггер на изменение статуса урока
CREATE TRIGGER auto_recalculate_on_lesson_change
AFTER INSERT OR UPDATE OR DELETE ON lessons
FOR EACH ROW
EXECUTE FUNCTION trigger_recalculate_lessons();

-- ============================================
-- ШАГ 5: ФУНКЦИЯ ДЛЯ ОБНОВЛЕНИЯ РЕГУЛЯРНОГО РАСПИСАНИЯ
-- ============================================

CREATE OR REPLACE FUNCTION update_recurring_schedule_time(
  p_schedule_id UUID,
  p_new_time TIME,
  p_new_days INTEGER[]
)
RETURNS VOID AS $$
DECLARE
  v_student_id UUID;
  v_old_time TIME;
  v_old_days INTEGER[];
BEGIN
  -- Получаем данные расписания
  SELECT student_id, lesson_time, days_of_week
  INTO v_student_id, v_old_time, v_old_days
  FROM recurring_schedules
  WHERE id = p_schedule_id;
  
  -- Обновляем расписание
  UPDATE recurring_schedules
  SET 
    lesson_time = p_new_time,
    days_of_week = p_new_days,
    updated_at = NOW()
  WHERE id = p_schedule_id;
  
  -- Удаляем все будущие уроки этого расписания со статусом 'scheduled'
  DELETE FROM lessons
  WHERE recurring_schedule_id = p_schedule_id
  AND status = 'scheduled'
  AND lesson_date >= CURRENT_DATE;
  
  -- Создаем новые уроки на основе оставшихся уроков
  -- Эта часть будет выполняться через отдельный вызов функции generate_recurring_lessons
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ШАГ 6: ПЕРЕСЧЕТ ВСЕХ ТЕКУЩИХ ДАННЫХ
-- ============================================

DO $$
DECLARE
  student_record RECORD;
BEGIN
  FOR student_record IN SELECT id FROM students WHERE deleted_at IS NULL
  LOOP
    PERFORM recalculate_remaining_lessons(student_record.id);
  END LOOP;
END $$;

-- ============================================
-- ГОТОВО! Система перезаписана с простой логикой
-- ============================================
