-- เก็บหลักฐานว่าลูกค้ากดยอมรับเงื่อนไขและยินดีรับข่าวสารตอนไหน
-- null = ไม่ได้ยอมรับ (ไม่ควรเกิด เพราะฟอร์มบังคับติ๊กก่อนส่ง)
alter table public.orders add column if not exists marketing_consent_at timestamptz;
