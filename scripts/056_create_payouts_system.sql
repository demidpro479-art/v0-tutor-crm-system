-- Создаю таблицы для системы выплат и операций менеджеров

-- Таблица балансов пользователей
CREATE TABLE IF NOT EXISTS user_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  balance DECIMAL(10, 2) DEFAULT 0,
  total_earned DECIMAL(10, 2) DEFAULT 0,
  total_withdrawn DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Таблица выплат
CREATE TABLE IF NOT EXISTS payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, partially_approved, rejected, cancelled
  payment_method TEXT NOT NULL, -- card, bank_transfer, etc
  payment_details TEXT NOT NULL, -- реквизиты
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  processed_by UUID REFERENCES users(id)
);

-- Таблица деталей выплат (какие уроки/операции входят в выплату)
CREATE TABLE IF NOT EXISTS payout_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payout_id UUID NOT NULL REFERENCES payouts(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL, -- lesson, operation, weekly_salary
  item_id UUID, -- ID урока или операции
  amount DECIMAL(10, 2) NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица операций менеджеров
CREATE TABLE IF NOT EXISTS manager_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  operation_type TEXT NOT NULL, -- lessons_purchase, other
  lessons_count INTEGER DEFAULT 0,
  receipt_url TEXT, -- ссылка на чек
  receipt_notes TEXT,
  manager_commission DECIMAL(10, 2) DEFAULT 0, -- 5% от суммы
  status TEXT NOT NULL DEFAULT 'completed',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица истории начислений на баланс
CREATE TABLE IF NOT EXISTS balance_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  transaction_type TEXT NOT NULL, -- lesson_completed, operation_commission, weekly_salary, payout, adjustment
  reference_id UUID, -- ID урока, операции или выплаты
  description TEXT NOT NULL,
  balance_before DECIMAL(10, 2) NOT NULL,
  balance_after DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для производительности
CREATE INDEX IF NOT EXISTS idx_user_balances_user_id ON user_balances(user_id);
CREATE INDEX IF NOT EXISTS idx_payouts_user_id ON payouts(user_id);
CREATE INDEX IF NOT EXISTS idx_payouts_status ON payouts(status);
CREATE INDEX IF NOT EXISTS idx_payout_items_payout_id ON payout_items(payout_id);
CREATE INDEX IF NOT EXISTS idx_manager_operations_manager_id ON manager_operations(manager_id);
CREATE INDEX IF NOT EXISTS idx_manager_operations_student_id ON manager_operations(student_id);
CREATE INDEX IF NOT EXISTS idx_balance_transactions_user_id ON balance_transactions(user_id);

-- Функция для обновления баланса
CREATE OR REPLACE FUNCTION update_user_balance(
  p_user_id UUID,
  p_amount DECIMAL,
  p_transaction_type TEXT,
  p_reference_id UUID,
  p_description TEXT
) RETURNS void AS $$
DECLARE
  v_current_balance DECIMAL;
  v_new_balance DECIMAL;
BEGIN
  -- Получаем текущий баланс или создаем запись
  INSERT INTO user_balances (user_id, balance)
  VALUES (p_user_id, 0)
  ON CONFLICT (user_id) DO NOTHING;
  
  SELECT balance INTO v_current_balance
  FROM user_balances
  WHERE user_id = p_user_id;
  
  v_new_balance := v_current_balance + p_amount;
  
  -- Обновляем баланс
  UPDATE user_balances
  SET balance = v_new_balance,
      total_earned = CASE WHEN p_amount > 0 THEN total_earned + p_amount ELSE total_earned END,
      total_withdrawn = CASE WHEN p_amount < 0 THEN total_withdrawn + ABS(p_amount) ELSE total_withdrawn END,
      updated_at = NOW()
  WHERE user_id = p_user_id;
  
  -- Записываем транзакцию
  INSERT INTO balance_transactions (
    user_id, amount, transaction_type, reference_id, description, balance_before, balance_after
  ) VALUES (
    p_user_id, p_amount, p_transaction_type, p_reference_id, p_description, v_current_balance, v_new_balance
  );
END;
$$ LANGUAGE plpgsql;

-- Отключаем RLS для новых таблиц
ALTER TABLE user_balances DISABLE ROW LEVEL SECURITY;
ALTER TABLE payouts DISABLE ROW LEVEL SECURITY;
ALTER TABLE payout_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE manager_operations DISABLE ROW LEVEL SECURITY;
ALTER TABLE balance_transactions DISABLE ROW LEVEL SECURITY;
