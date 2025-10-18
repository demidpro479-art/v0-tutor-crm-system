CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS students (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  tutor_id UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS lessons (
  id SERIAL PRIMARY KEY,
  tutor_id UUID REFERENCES users(id),
  student_id UUID REFERENCES users(id),
  date DATE NOT NULL,
  time TIME NOT NULL,
  duration INTEGER NOT NULL,
  status ENUM('planned', 'completed', 'canceled') DEFAULT 'planned',
  comment TEXT
);

CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  student_id UUID REFERENCES users(id),
  amount DECIMAL(10,2) NOT NULL,
  date DATE NOT NULL,
  check_url VARCHAR(255),
  comment TEXT
);

CREATE TABLE IF NOT EXISTS recurring_schedules (
  id SERIAL PRIMARY KEY,
  tutor_id UUID REFERENCES users(id),
  student_id UUID REFERENCES users(id),
  day_of_week INTEGER NOT NULL, -- 0-6 (воскресенье-суббота)
  time TIME NOT NULL,
  duration INTEGER NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE
);

CREATE TABLE IF NOT EXISTS user_roles (
  user_id UUID REFERENCES users(id),
  role VARCHAR(50) NOT NULL,
  PRIMARY KEY (user_id, role)
);

CREATE TABLE IF NOT EXISTS user_active_role (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  active_role VARCHAR(50) NOT NULL
);
