-- ФИНАЛЬНАЯ РАБОЧАЯ СИСТЕМА УПРАВЛЕНИЯ УРОКАМИ
-- Основано на РЕАЛЬНОЙ схеме базы данных

-- ============================================
-- ШАГ 1: УДАЛЕНИЕ ВСЕХ СТАРЫХ ТРИГГЕРОВ И ФУНКЦИЙ
-- ============================================

DROP TRIGGER IF EXISTS update_remaining_lessons_trigger ON lessons CASCADE;
DROP TRIGGER IF EXISTS recalculate_lessons_on_payment ON payments CASCADE;
DROP TRIGGER IF EXISTS update_lessons_on_status_change ON lessons CASCADE;
DROP TRIGGER IF EXISTS auto_deduct_lesson_trigger ON lessons CASCADE;
DROP TRIGGER IF EXISTS recalculate_on_lesson_change ON lessons CASCADE;
DROP TRIGGER IF EXISTS recalculate_on_payment_change ON payments CASCADE;
DROP TRIGGER IF EXISTS auto_recalculate_on_lesson_change ON lessons CASCADE;
DROP TRIGGER IF EXISTS trigger_recalculate_lessons ON lessons CASCADE;

DROP FUNCTION IF EXISTS calculate_remaining_lessons(UUID) CASCADE;
DROP FUNCTION IF EXISTS update_remaining_lessons() CASCADE;
DROP FUNCTION IF EXISTS recalculate_student_lessons() CASCADE;
DROP FUNCTION IF EXISTS auto_deduct_lesson() CASCADE;
DROP FUNCTION IF EXISTS deduct_lessons(UUID, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS add_lessons(UUID, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS reset_student_lessons(UUID) CASCADE;
DROP FUNCTION IF EXISTS update_remaining_lessons_direct(UUID, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS update_total_paid_lessons(UUID, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS update_recurring_lessons(UUID, TIME, INTEGER[]) CASCADE;
DROP FUNCTION IF EXISTS update_recurring_schedule_and_lessons(UUID, TIME, INTEGER[]) CASCADE;
DROP FUNCTION IF EXISTS count_completed_lessons(UUID) CASCADE;
DROP FUNCTION IF EXISTS recalculate_remaining_lessons(UUID) CASCADE;
DROP FUNCTION IF EXISTS add_paid_lessons(UUID, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS deduct_paid_lessons(UUID, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS reset_all_lessons(UUID) CASCADE;
DROP FUNCTION IF EXISTS set_total_paid_lessons(UUID, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS set_remaining_lessons(UUID, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS trigger_recalculate_lessons() CASCADE;
DROP FUNCTION IF EXISTS update_recurring_schedule_time(UUID, TIME, INTEGER[]) CASCADE;

-- ============================================
-- ШАГ 2: СОЗДАНИЕ БАЗОВЫХ ФУНКЦИЙ
-- ============================================

-- Функция для подсчета проведенных уроков
CREATE OR REPLACE FUNCTION count_completed_lessons(p_student_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
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
  v_remaining := GREATEST(v_total_paid - v_completed, 0);
  
  -- Обновляем
  UPDATE students
  SET remaining_lessons = v_remaining,
      updated_at = NOW()
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
  UPDATE students
  SET total_paid_lessons = COALESCE(total_paid_lessons, 0) + p_amount,
      updated_at = NOW()
  WHERE id = p_student_id;
  
  PERFORM recalculate_remaining_lessons(p_student_id);
END;
$$ LANGUAGE plpgsql;

-- Списать уроки
CREATE OR REPLACE FUNCTION deduct_paid_lessons(p_student_id UUID, p_amount INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE students
  SET total_paid_lessons = GREATEST(COALESCE(total_paid_lessons, 0) - p_amount, 0),
      updated_at = NOW()
  WHERE id = p_student_id;
  
  PERFORM recalculate_remaining_lessons(p_student_id);
END;
$$ LANGUAGE plpgsql;

-- Обнулить уроки
CREATE OR REPLACE FUNCTION reset_all_lessons(p_student_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE students
  SET total_paid_lessons = 0,
      updated_at = NOW()
  WHERE id = p_student_id;
  
  PERFORM recalculate_remaining_lessons(p_student_id);
  
  -- Удаляем все запланированные уроки
  DELETE FROM lessons
  WHERE student_id = p_student_id
  AND status = 'scheduled';
END;
$$ LANGUAGE plpgsql;

-- Установить total_paid_lessons напрямую
CREATE OR REPLACE FUNCTION set_total_paid_lessons(p_student_id UUID, p_amount INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE students
  SET total_paid_lessons = GREATEST(p_amount, 0),
      updated_at = NOW()
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
    total_paid_lessons = v_completed + GREATEST(p_amount, 0),
    remaining_lessons = GREATEST(p_amount, 0),
    updated_at = NOW()
  WHERE id = p_student_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ШАГ 4: ТРИГГЕР ДЛЯ АВТОМАТИЧЕСКОГО ПЕРЕСЧЕТА
-- ============================================

CREATE OR REPLACE FUNCTION trigger_recalculate_lessons()
RETURNS TRIGGER AS $$
DECLARE
  v_student_id UUID;
BEGIN
  -- Определяем student_id
  IF TG_OP = 'DELETE' THEN
    v_student_id := OLD.student_id;
  ELSE
    v_student_id := NEW.student_id;
  END IF;
  
  -- Пересчитываем только если изменился статус на/с completed
  IF TG_OP = 'UPDATE' THEN
    IF OLD.status != NEW.status AND (OLD.status = 'completed' OR NEW.status = 'completed') THEN
      PERFORM recalculate_remaining_lessons(v_student_id);
    END IF;
  ELSIF TG_OP = 'INSERT' AND NEW.status = 'completed' THEN
    PERFORM recalculate_remaining_lessons(v_student_id);
  ELSIF TG_OP = 'DELETE' AND OLD.status = 'completed' THEN
    PERFORM recalculate_remaining_lessons(v_student_id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Создаем триггер
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
  p_new_day INTEGER
)
RETURNS VOID AS $$
DECLARE
  v_student_id UUID;
BEGIN
  -- Получаем student_id
  SELECT student_id INTO v_student_id
  FROM recurring_schedules
  WHERE id = p_schedule_id;
  
  -- Обновляем расписание
  UPDATE recurring_schedules
  SET 
    time_of_day = p_new_time,
    day_of_week = p_new_day
  WHERE id = p_schedule_id;
  
  -- Удаляем все будущие запланированные уроки этого ученика в этот день недели
  -- (так как у нас нет recurring_schedule_id в lessons, удаляем по дню недели)
  DELETE FROM lessons
  WHERE student_id = v_student_id
  AND status = 'scheduled'
  AND scheduled_at >= CURRENT_DATE
  AND EXTRACT(DOW FROM scheduled_at) = p_new_day;
  
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
