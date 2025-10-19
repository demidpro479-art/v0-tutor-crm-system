-- Создание bucket для чеков и квитанций
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', true)
ON CONFLICT (id) DO NOTHING;

-- Политики доступа для bucket receipts
CREATE POLICY "Менеджеры и ГА могут загружать чеки"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'receipts' AND
  (auth.uid() IN (
    SELECT id FROM profiles WHERE role IN ('admin', 'manager')
  ))
);

CREATE POLICY "Все могут просматривать чеки"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'receipts');
