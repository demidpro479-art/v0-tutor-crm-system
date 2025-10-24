-- Complete Clean Database Setup
-- This script safely handles all existing objects

-- Drop all existing triggers first
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
DROP TRIGGER IF EXISTS update_students_updated_at ON students;
DROP TRIGGER IF EXISTS recalculate_on_lesson_trigger ON lessons;
DROP TRIGGER IF EXISTS recalculate_on_payment_trigger ON payments;
DROP TRIGGER IF EXISTS update_lessons_updated_at ON lessons;
DROP TRIGGER IF EXISTS update_payments_updated_at ON payments;

-- Drop all existing functions
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS calculate_remaining_lessons(uuid) CASCADE;
DROP FUNCTION IF EXISTS recalculate_student_lessons() CASCADE;

-- Drop existing check constraints
ALTER TABLE students DROP CONSTRAINT IF EXISTS students_remaining_lessons_nonneg;

-- Create tables if they don't exist
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  email text UNIQUE NOT NULL,
  full_name text,
  role text NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'tutor', 'admin')),
  tutor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  grade text,
  total_paid_lessons integer DEFAULT 0,
  completed_lessons integer DEFAULT 0,
  remaining_lessons integer DEFAULT 0,
  tutor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  tutor_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  scheduled_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  price numeric(10,2) DEFAULT 500,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount numeric(10,2) NOT NULL,
  lessons_count integer NOT NULL DEFAULT 1,
  payment_date timestamptz DEFAULT now(),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chat_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid REFERENCES chats(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  joined_at timestamptz DEFAULT now(),
  UNIQUE(chat_id, user_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid REFERENCES chats(id) ON DELETE CASCADE NOT NULL,
  sender_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  is_ai boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_lessons_student_id ON lessons(student_id);
CREATE INDEX IF NOT EXISTS idx_lessons_tutor_id ON lessons(tutor_id);
CREATE INDEX IF NOT EXISTS idx_lessons_status ON lessons(status);
CREATE INDEX IF NOT EXISTS idx_payments_student_id ON payments(student_id);
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_chat_participants_user_id ON chat_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_tutor_id ON profiles(tutor_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to calculate remaining lessons
CREATE OR REPLACE FUNCTION calculate_remaining_lessons(student_user_id uuid)
RETURNS integer AS $$
DECLARE
  total_paid integer;
  total_completed integer;
BEGIN
  SELECT COALESCE(SUM(lessons_count), 0) INTO total_paid
  FROM payments
  WHERE student_id = student_user_id;
  
  SELECT COUNT(*) INTO total_completed
  FROM lessons
  WHERE student_id = student_user_id AND status = 'completed';
  
  RETURN total_paid - total_completed;
END;
$$ LANGUAGE plpgsql;

-- Create function to recalculate student lessons
CREATE OR REPLACE FUNCTION recalculate_student_lessons()
RETURNS TRIGGER AS $$
DECLARE
  student_user_id uuid;
  remaining integer;
BEGIN
  IF TG_TABLE_NAME = 'lessons' THEN
    student_user_id := COALESCE(NEW.student_id, OLD.student_id);
  ELSIF TG_TABLE_NAME = 'payments' THEN
    student_user_id := COALESCE(NEW.student_id, OLD.student_id);
  END IF;
  
  remaining := calculate_remaining_lessons(student_user_id);
  
  UPDATE students
  SET remaining_lessons = remaining,
      updated_at = now()
  WHERE user_id = student_user_id;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_students_updated_at
  BEFORE UPDATE ON students
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lessons_updated_at
  BEFORE UPDATE ON lessons
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create triggers for automatic lesson calculation
CREATE TRIGGER recalculate_on_lesson_trigger
  AFTER INSERT OR UPDATE OR DELETE ON lessons
  FOR EACH ROW
  EXECUTE FUNCTION recalculate_student_lessons();

CREATE TRIGGER recalculate_on_payment_trigger
  AFTER INSERT OR UPDATE OR DELETE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION recalculate_student_lessons();

-- Disable RLS for all tables (admin access)
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE students DISABLE ROW LEVEL SECURITY;
ALTER TABLE lessons DISABLE ROW LEVEL SECURITY;
ALTER TABLE payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE chats DISABLE ROW LEVEL SECURITY;
ALTER TABLE chat_participants DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL ON profiles TO authenticated, service_role;
GRANT ALL ON students TO authenticated, service_role;
GRANT ALL ON lessons TO authenticated, service_role;
GRANT ALL ON payments TO authenticated, service_role;
GRANT ALL ON chats TO authenticated, service_role;
GRANT ALL ON chat_participants TO authenticated, service_role;
GRANT ALL ON messages TO authenticated, service_role;
