-- رسا | RASA — synthetic seed data (SAFE: no real patient data)
--
-- Usage:
--   1. Create a local Supabase stack:  npx supabase start
--   2. Apply migrations:             npx supabase db reset
--   3. Replace the placeholder DEMO_USER_ID below with a real auth user id
--      (created via the app's sign-up flow), then run this file.
--
-- All rows are flagged is_demo = true so they can never be confused with
-- real user records.

-- ---------------------------------------------------------------------------
-- Replace this with the id of the demo auth user (select id from auth.users).
-- ---------------------------------------------------------------------------
-- \set demo_user_id '00000000-0000-0000-0000-000000000001'

insert into public.profiles (id, display_name, personal_goal, jurisdiction, emergency_contacts, onboarded_at, is_demo)
values (
  '00000000-0000-0000-0000-000000000001',
  'کاربر نمایشی',
  'پیگیری منظم برنامه درمان',
  'ir',
  '[{"id":"demo-ec-1","label":"مرکز مشاوره (نمونه)","phone":"۰۲۱-۰۰۰۰۰۰۰"}]'::jsonb,
  now() - interval '45 days',
  true
)
on conflict (id) do nothing;

insert into public.medication_profiles (
  id, user_id, product_name, ingredient_name, formulation,
  tablet_strength_mg, concentration_mg_per_ml, prescribed_daily_amount,
  administrations_per_day, administration_times, regimen_start_date,
  duration_of_use_months, info_source, last_review_date, next_review_date, is_demo
)
values (
  '00000000-0000-0000-0000-000000000101',
  '00000000-0000-0000-0000-000000000001',
  'شربت متادون (نمونه نمایشی)',
  'متادون',
  'liquid',
  null,
  1.0000,
  35.0000,
  1,
  array['08:00'],
  current_date - 60,
  14,
  'clinician-approved',
  current_date - 14,
  current_date + 16,
  true
)
on conflict (id) do nothing;

insert into public.treatment_plans (
  id, user_id, version, title, status, source, authorization,
  authorized_by, authorized_at, effective_date, next_review_date, goal,
  milestones, notes, is_demo
)
values (
  '00000000-0000-0000-0000-000000000201',
  '00000000-0000-0000-0000-000000000001',
  2,
  'برنامه پایدارسازی و کاهش تدریجی (داده نمایشی)',
  'active',
  'clinician-approved',
  'authorized',
  'دکتر نمونه — کلینیک نمایشی',
  now() - interval '28 days',
  current_date - 28,
  current_date + 16,
  'reduce',
  '[
    {"id":"demo-ms-0","date":"' || to_char(current_date - 28, 'YYYY-MM-DD') || '","title":"هفته ۱ — مقدار روزانه ۳۵ میلی‌لیتر","amount":"35","unit":"mL","description":"شروع برنامه (نمونه نمایشی)"},
    {"id":"demo-ms-1","date":"' || to_char(current_date - 21, 'YYYY-MM-DD') || '","title":"هفته ۲ — مقدار روزانه ۳۳٫۵ میلی‌لیتر","amount":"33.5","unit":"mL","description":"کاهش کوچک ثبت‌شده در داده نمایشی"},
    {"id":"demo-ms-2","date":"' || to_char(current_date - 14, 'YYYY-MM-DD') || '","title":"هفته ۳ — مقدار روزانه ۳۲ میلی‌لیتر","amount":"32","unit":"mL","description":"کاهش کوچک ثبت‌شده در داده نمایشی"},
    {"id":"demo-ms-3","date":"' || to_char(current_date - 7,  'YYYY-MM-DD') || '","title":"هفته ۴ — مقدار روزانه ۳۰٫۵ میلی‌لیتر","amount":"30.5","unit":"mL","description":"کاهش کوچک ثبت‌شده در داده نمایشی"}
  ]'::jsonb,
  'داده نمایشی — از هیچ دستور پزشکی واقعی ساخته نشده است.',
  true
)
on conflict (id) do nothing;

insert into public.plan_events (user_id, plan_id, type, from_status, to_status, summary, at)
values
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000201', 'created', null, 'draft', 'ایجاد برنامه (داده نمایشی)', now() - interval '28 days'),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000201', 'authorized', 'awaiting-review', 'active', 'تأیید توسط «دکتر نمونه — کلینیک نمایشی» (داده نمایشی)', now() - interval '28 days' + interval '1 hour');

insert into public.reminders (user_id, medication, medication_times, checkin, checkin_time, log_review, log_review_time, review_lead_days, muted)
values ('00000000-0000-0000-0000-000000000001', true, array['08:00'], true, '20:00', true, '21:30', 3, false)
on conflict (user_id) do nothing;

-- 30 days of synthetic medication + symptom logs (deterministic pattern)
insert into public.daily_medication_logs (user_id, log_date, entries)
select
  '00000000-0000-0000-0000-000000000001',
  d::date,
  jsonb_build_array(
    jsonb_build_object(
      'id', 'demo-entry-' || to_char(d, 'YYYY-MM-DD'),
      'slotIndex', 0,
      'plannedTime', '08:00',
      'plannedAmount', case
        when d < current_date - 21 then '35'
        when d < current_date - 14 then '33.5'
        when d < current_date - 7  then '32'
        else '30.5'
      end,
      'status', case
        when extract(day from d)::int % 17 = 0 then 'missed'
        when extract(day from d)::int % 11 = 0 then 'delayed'
        else 'taken'
      end,
      'actualTime', case when extract(day from d)::int % 11 = 0 then '10:30' else '08:00' end,
      'actualAmount', case
        when extract(day from d)::int % 17 = 0 then null
        else case
          when d < current_date - 21 then '35'
          when d < current_date - 14 then '33.5'
          when d < current_date - 7  then '32'
          else '30.5'
        end
      end
    )
  )
from generate_series(current_date - 29, current_date - 1, interval '1 day') as d
on conflict (user_id, log_date) do nothing;

insert into public.daily_symptom_logs (
  user_id, log_date, sleep_quality, anxiety, craving, gi,
  sweating_chills, aches_restlessness, mood, adherence_difficulty, unsure
)
select
  '00000000-0000-0000-0000-000000000001',
  d::date,
  least(4, greatest(0, 2 + (extract(day from d)::int % 3) - 1)),
  least(4, greatest(0, 3 - (extract(day from d)::int % 3))),
  least(4, greatest(0, 3 - (extract(day from d)::int % 4))),
  least(4, greatest(0, 2 - (extract(day from d)::int % 3))),
  least(4, greatest(0, 1 - (extract(day from d)::int % 2))),
  least(4, greatest(0, 2 - (extract(day from d)::int % 3))),
  least(4, greatest(0, 2 + (extract(day from d)::int % 3))),
  case when extract(day from d)::int % 17 = 0 then 'major' else 'none' end,
  '{}'
from generate_series(current_date - 29, current_date - 1, interval '1 day') as d
on conflict (user_id, log_date) do nothing;

insert into public.audit_logs (user_id, action, entity, entity_id, summary)
values (
  '00000000-0000-0000-0000-000000000001',
  'demo.generated',
  'appData',
  null,
  'داده نمایشی از seed ساخته شد — جدای از داده‌های واقعی کاربران.'
);
