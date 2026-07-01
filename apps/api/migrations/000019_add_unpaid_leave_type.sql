ALTER TABLE leaves DROP CONSTRAINT IF EXISTS leaves_type_check;
ALTER TABLE leaves ADD CONSTRAINT leaves_type_check
  CHECK (type IN ('casual','sick','annual','maternity','paternity','unpaid'));
