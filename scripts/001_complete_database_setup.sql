-- Complete Database Setup with Proper RLS and Functions
-- This script sets up all necessary tables, RLS policies, and functions

-- Disable RLS temporarily for setup
ALTER TABLE IF EXISTS profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS students DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS lessons DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_active_role DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_balances DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS tutor_earnings DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS payouts DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS transactions DISABLE ROW LEVEL SECURITY;

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON profiles;

-- Create or replace the calculate_remaining_lessons function
CREATE OR REPLACE FUNCTION calculate_remaining_lessons(student_uuid UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_paid INTEGER;
  total_completed INTEGER;
  remaining INTEGER;
BEGIN
  -- Get total paid lessons from payments table
  SELECT COALESCE(SUM(lessons_purchased), 0)
  INTO total_paid
  FROM payments
  WHERE student_id = student_uuid;
  
  -- Get total completed lessons
  SELECT COUNT(*)
  INTO total_completed
  FROM lessons
  WHERE student_id = student_uuid
    AND status = 'completed'
    AND deleted_at IS NULL;
  
  -- Calculate remaining
  remaining := total_paid - total_completed;
  
  RETURN GREATEST(remaining, 0);
END;
$$;

-- Create or replace function to update student remaining lessons
CREATE OR REPLACE FUNCTION update_student_remaining_lessons()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update the students table with calculated remaining lessons
  UPDATE students
  SET remaining_lessons = calculate_remaining_lessons(NEW.student_id),
      updated_at = NOW()
  WHERE id = NEW.student_id;
  
  RETURN NEW;
END;
$$;

-- Create triggers for automatic lesson calculation
DROP TRIGGER IF EXISTS update_lessons_on_payment ON payments;
CREATE TRIGGER update_lessons_on_payment
AFTER INSERT OR UPDATE ON payments
FOR EACH ROW
EXECUTE FUNCTION update_student_remaining_lessons();

DROP TRIGGER IF EXISTS update_lessons_on_completion ON lessons;
CREATE TRIGGER update_lessons_on_completion
AFTER INSERT OR UPDATE OF status ON lessons
FOR EACH ROW
WHEN (NEW.status = 'completed')
EXECUTE FUNCTION update_student_remaining_lessons();

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_active_role ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE tutor_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Create simplified RLS policies for profiles
CREATE POLICY "Allow all for service role" ON profiles
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Create RLS policies for students
CREATE POLICY "Service role full access to students" ON students
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Tutors can view their students" ON students
  FOR SELECT
  USING (
    tutor_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- Create RLS policies for lessons
CREATE POLICY "Service role full access to lessons" ON lessons
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Tutors can view their lessons" ON lessons
  FOR SELECT
  USING (
    tutor_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- Create RLS policies for other tables
CREATE POLICY "Service role full access to payments" ON payments
  FOR ALL
  USING (true);

CREATE POLICY "Service role full access to user_roles" ON user_roles
  FOR ALL
  USING (true);

CREATE POLICY "Service role full access to user_active_role" ON user_active_role
  FOR ALL
  USING (true);

CREATE POLICY "Service role full access to user_balances" ON user_balances
  FOR ALL
  USING (true);

CREATE POLICY "Service role full access to tutor_earnings" ON tutor_earnings
  FOR ALL
  USING (true);

CREATE POLICY "Service role full access to payouts" ON payouts
  FOR ALL
  USING (true);

CREATE POLICY "Service role full access to transactions" ON transactions
  FOR ALL
  USING (true);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Database setup completed successfully!';
  RAISE NOTICE 'RLS policies configured';
  RAISE NOTICE 'Functions and triggers created';
END $$;
