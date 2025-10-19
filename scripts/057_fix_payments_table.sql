-- Добавляем колонку receipt_url в таблицу payments для хранения чеков
ALTER TABLE payments ADD COLUMN IF NOT EXISTS receipt_url TEXT;

-- Создаем bucket для хранения чеков в Supabase Storage
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', true)
ON CONFLICT (id) DO NOTHING;

-- Настраиваем политики доступа для bucket receipts
CREATE POLICY "Менеджеры могут загружать чеки" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'receipts');

CREATE POLICY "Все могут просматривать чеки" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'receipts');
