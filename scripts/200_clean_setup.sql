-- Clean database setup script that handles existing objects
-- Run this script to fix all database issues

-- Drop existing triggers to avoid conflicts
DROP TRIGGER IF EXISTS update_students_updated_at ON students;
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
DROP TRIGGER IF EXISTS update_lessons_updated_at ON lessons;
DROP TRIGGER IF EXISTS update_recurring_schedules_updated_at ON recurring_schedules;
DROP TRIGGER IF EXISTS update_conversations_updated_at ON conversations;

-- Drop existing functions
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS calculate_remaining_lessons(uuid) CASCADE;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create calculate_remaining_lessons function
CREATE OR REPLACE FUNCTION calculate_remaining_lessons(student_uuid uuid)
RETURNS integer AS $$
DECLARE
    total_purchased integer;
    total_completed integer;
    total_deducted integer;
BEGIN
    -- Get total purchased lessons
    SELECT COALESCE(SUM(lessons_purchased), 0)
    INTO total_purchased
    FROM payments
    WHERE student_id = student_uuid;

    -- Get total completed lessons
    SELECT COUNT(*)
    INTO total_completed
    FROM lessons
    WHERE student_id = student_uuid
    AND status = 'completed'
    AND deleted_at IS NULL;

    -- Get total deducted lessons
    SELECT COALESCE(SUM(lessons_deducted), 0)
    INTO total_deducted
    FROM lesson_deductions
    WHERE student_id = student_uuid;

    -- Return remaining lessons (cannot be negative)
    RETURN GREATEST(0, total_purchased - total_completed - total_deducted);
END;
$$ LANGUAGE plpgsql;

-- Remove check constraint if it exists
ALTER TABLE students DROP CONSTRAINT IF EXISTS students_remaining_lessons_nonneg;

-- Update all students' remaining_lessons using the function
UPDATE students
SET remaining_lessons = calculate_remaining_lessons(id)
WHERE id IS NOT NULL;

-- Create triggers for updated_at columns
CREATE TRIGGER update_students_updated_at
    BEFORE UPDATE ON students
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lessons_updated_at
    BEFORE UPDATE ON lessons
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recurring_schedules_updated_at
    BEFORE UPDATE ON recurring_schedules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at
    BEFORE UPDATE ON conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Ensure RLS is properly configured
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Allow service role full access to students" ON students;
DROP POLICY IF EXISTS "Allow service role full access to profiles" ON profiles;
DROP POLICY IF EXISTS "Allow service role full access to lessons" ON lessons;
DROP POLICY IF EXISTS "Allow service role full access to payments" ON payments;
DROP POLICY IF EXISTS "Allow service role full access to conversations" ON conversations;
DROP POLICY IF EXISTS "Allow service role full access to messages" ON messages;
DROP POLICY IF EXISTS "Allow service role full access to conversation_participants" ON conversation_participants;

-- Create permissive policies for service role
CREATE POLICY "Allow service role full access to students"
    ON students
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow service role full access to profiles"
    ON profiles
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow service role full access to lessons"
    ON lessons
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow service role full access to payments"
    ON payments
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow service role full access to conversations"
    ON conversations
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow service role full access to messages"
    ON messages
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow service role full access to conversation_participants"
    ON conversation_participants
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
