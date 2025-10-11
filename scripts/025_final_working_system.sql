-- ============================================
-- ФИНАЛЬНАЯ РАБОЧАЯ СИСТЕМА УПРАВЛЕНИЯ УРОКАМИ (PostgreSQL)
-- ============================================

BEGIN;

-- ============================================
-- ШАГ 0: БЕЗОПАСНЫЕ ОГРАНИЧЕНИЯ (необяз., но полезны)
-- Пропускает, если столбцов/таблиц нет — адаптируйте под свою схему.
-- ============================================

-- total_paid_lessons и remaining_lessons не должны быть отрицательными
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='students' AND column_name='total_paid_lessons'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'students_total_paid_lessons_nonneg'
  ) THEN
    ALTER TABLE students
      ADD CONSTRAINT students_total_paid_lessons_nonneg CHECK (total_paid_lessons IS NULL OR total_paid_lessons >= 0);
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='students' AND column_name='remaining_lessons'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'students_remaining_lessons_nonneg'
  ) THEN
    ALTER TABLE students
      ADD CONSTRAINT students_remaining_lessons_nonneg CHECK (remaining_lessons IS NULL OR remaining_lessons >= 0);
  END IF;
END $$;

-- Индекс ускорит подсчёт завершённых уроков
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind='i' AND c.relname='idx_lessons_student_completed'
  ) THEN
    CREATE INDEX idx_lessons_student_completed
      ON lessons (student_id)
      WHERE status = 'completed' AND deleted_at IS NULL;
  END IF;
END $$;

-- ============================================
-- ШАГ 1: ДРОП СТАРЫХ ТРИГГЕРОВ/ФУНКЦИЙ
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
-- ШАГ 2: БАЗОВЫЕ ФУНКЦИИ (атомарные и идемпотентные)
-- ============================================

-- Подсчёт завершённых уроков (IMMUTABLE нельзя, т.к. читает таблицу)
CREATE OR REPLACE FUNCTION count_completed_lessons(p_student_id UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM lessons
  WHERE student_id = p_student_id
    AND status = 'completed'
    AND deleted_at IS NULL;
$$ LANGUAGE sql STABLE;

-- Пересчёт remaining без гонок: один UPDATE с встроенным COUNT
CREATE OR REPLACE FUNCTION recalculate_remaining_lessons(p_student_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE students s
  SET remaining_lessons = GREATEST(COALESCE(s.total_paid_lessons, 0) - (
                          SELECT COUNT(*)
                          FROM lessons l
                          WHERE l.student_id = s.id
                            AND l.status = 'completed'
                            AND l.deleted_at IS NULL
                        ), 0),
      updated_at = NOW()
  WHERE s.id = p_student_id;
END;
$$ LANGUAGE plpgsql;

-- Гарантия неотрицательных добавлений/списаний
CREATE OR REPLACE FUNCTION add_paid_lessons(p_student_id UUID, p_amount INTEGER)
RETURNS VOID AS $$
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'add_paid_lessons: p_amount must be positive' USING ERRCODE = '22023';
  END IF;

  UPDATE students
  SET total_paid_lessons = COALESCE(total_paid_lessons, 0) + p_amount,
      updated_at = NOW()
  WHERE id = p_student_id;

  PERFORM recalculate_remaining_lessons(p_student_id);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION deduct_paid_lessons(p_student_id UUID, p_amount INTEGER)
RETURNS VOID AS $$
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'deduct_paid_lessons: p_amount must be positive' USING ERRCODE = '22023';
  END IF;

  UPDATE students
  SET total_paid_lessons = GREATEST(COALESCE(total_paid_lessons, 0) - p_amount, 0),
      updated_at = NOW()
  WHERE id = p_student_id;

  PERFORM recalculate_remaining_lessons(p_student_id);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION reset_all_lessons(p_student_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE students
  SET total_paid_lessons = 0,
      updated_at = NOW()
  WHERE id = p_student_id;

  PERFORM recalculate_remaining_lessons(p_student_id);

  -- Удаляем все БУДУЩИЕ запланированные уроки (безопаснее, чем все scheduled)
  DELETE FROM lessons
  WHERE student_id = p_student_id
    AND status = 'scheduled'
    AND (scheduled_at IS NULL OR scheduled_at >= NOW());
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION set_total_paid_lessons(p_student_id UUID, p_amount INTEGER)
RETURNS VOID AS $$
BEGIN
  IF p_amount IS NULL OR p_amount < 0 THEN
    RAISE EXCEPTION 'set_total_paid_lessons: p_amount must be >= 0' USING ERRCODE = '22023';
  END IF;

  UPDATE students
  SET total_paid_lessons = p_amount,
      updated_at = NOW()
  WHERE id = p_student_id;

  PERFORM recalculate_remaining_lessons(p_student_id);
END;
$$ LANGUAGE plpgsql;

-- Жёстко задать remaining: total_paid = completed + remaining, без отрицаний
CREATE OR REPLACE FUNCTION set_remaining_lessons(p_student_id UUID, p_amount INTEGER)
RETURNS VOID AS $$
DECLARE
  v_completed INTEGER;
  v_remaining INTEGER;
BEGIN
  IF p_amount IS NULL OR p_amount < 0 THEN
    RAISE EXCEPTION 'set_remaining_lessons: p_amount must be >= 0' USING ERRCODE = '22023';
  END IF;

  v_completed := count_completed_lessons(p_student_id);
  v_remaining := GREATEST(p_amount, 0);

  UPDATE students
  SET total_paid_lessons = v_completed + v_remaining,
      remaining_lessons   = v_remaining,
      updated_at          = NOW()
  WHERE id = p_student_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ШАГ 3: ТРИГГЕР АВТО-ПЕРЕСЧЁТА ПО ИЗМЕНЕНИЯМ В lessons
-- ============================================

/*
  Логика:
  - INSERT: если вставлен completed → пересчитать
  - UPDATE:
      * если сменился student_id → пересчитать ДВОИХ: OLD.student_id и NEW.student_id
      * если изменился status и одно из значений = 'completed' → пересчитать для соответствующего ученика
      * если пометили deleted_at/восстановили при status='completed' → тоже пересчитать
  - DELETE: если удалили completed → пересчитать для OLD.student_id

  AFTER-триггер в PostgreSQL должен возвращать NULL (возвращаемое значение игнорируется).
*/

CREATE OR REPLACE FUNCTION trigger_recalculate_lessons()
RETURNS TRIGGER AS $$
DECLARE
  was_completed BOOLEAN := FALSE;
  now_completed BOOLEAN := FALSE;
BEGIN
  IF TG_OP = 'INSERT' THEN
    now_completed := (NEW.status = 'completed' AND (NEW.deleted_at IS NULL));
    IF now_completed THEN
      PERFORM recalculate_remaining_lessons(NEW.student_id);
    END IF;
    RETURN NULL;
  ELSIF TG_OP = 'UPDATE' THEN
    -- если поменялся ученик — обязательно пересчитать обоих
    IF NEW.student_id IS DISTINCT FROM OLD.student_id THEN
      PERFORM recalculate_remaining_lessons(OLD.student_id);
      PERFORM recalculate_remaining_lessons(NEW.student_id);
      RETURN NULL;
    END IF;

    -- статус/soft-delete могли изменить вклад completed
    was_completed := (OLD.status = 'completed' AND OLD.deleted_at IS NULL);
    now_completed := (NEW.status = 'completed' AND NEW.deleted_at IS NULL);

    IF was_completed IS DISTINCT FROM now_completed THEN
      PERFORM recalculate_remaining_lessons(NEW.student_id);
    END IF;

    RETURN NULL;
  ELSIF TG_OP = 'DELETE' THEN
    was_completed := (OLD.status = 'completed' AND OLD.deleted_at IS NULL);
    IF was_completed THEN
      PERFORM recalculate_remaining_lessons(OLD.student_id);
    END IF;
    RETURN NULL;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_recalculate_on_lesson_change
AFTER INSERT OR UPDATE OR DELETE ON lessons
FOR EACH ROW
EXECUTE FUNCTION trigger_recalculate_lessons();

-- ============================================
-- ШАГ 4: ОБНОВЛЕНИЕ РЕГУЛЯРНОГО РАСПИСАНИЯ
-- ============================================

/*
  Важно: так как у lessons нет recurring_schedule_id,
  мы аккуратно удаляем ТОЛЬКО будущие "scheduled" по совпадающему дню недели.
  Добавлена защита: p_new_day ∈ [0..6].
*/

CREATE OR REPLACE FUNCTION update_recurring_schedule_time(
  p_schedule_id UUID,
  p_new_time TIME,
  p_new_day  INTEGER
)
RETURNS VOID AS $$
DECLARE
  v_student_id UUID;
BEGIN
  IF p_new_day IS NULL OR p_new_day < 0 OR p_new_day > 6 THEN
    RAISE EXCEPTION 'update_recurring_schedule_time: p_new_day must be between 0 (Sun) and 6 (Sat)';
  END IF;

  SELECT student_id INTO v_student_id
  FROM recurring_schedules
  WHERE id = p_schedule_id;

  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'update_recurring_schedule_time: schedule % not found or has no student', p_schedule_id;
  END IF;

  UPDATE recurring_schedules
  SET time_of_day = p_new_time,
      day_of_week = p_new_day
  WHERE id = p_schedule_id;

  DELETE FROM lessons
  WHERE student_id = v_student_id
    AND status = 'scheduled'
    AND scheduled_at >= CURRENT_DATE
    AND EXTRACT(DOW FROM scheduled_at) = p_new_day;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ШАГ 5: ПЕРЕСЧЁТ ВСЕХ ТЕКУЩИХ ДАННЫХ
-- ============================================

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM students WHERE deleted_at IS NULL LOOP
    PERFORM recalculate_remaining_lessons(r.id);
  END LOOP;
END $$;

COMMIT;
