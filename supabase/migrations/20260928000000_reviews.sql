-- Reviews from people Anadi has worked with, collected at /review.
--
-- Only `api/review.ts` writes here, with the secret key. RLS is on with no
-- policies, so the publishable/anon key can read and write nothing. Every
-- review lands unapproved; flip `approved` to show one.

create table public.reviews (
  id          uuid primary key default gen_random_uuid(),
  rating      smallint not null check (rating between 1 and 5),
  review      text not null check (length(review) between 1 and 2000),
  name        text not null check (length(name) between 1 and 120),
  title       text not null check (length(title) between 1 and 120),
  company     text check (length(company) <= 120),
  photo_path  text,                                -- object name in the review-photos bucket
  approved    boolean not null default false,
  created_at  timestamptz not null default now()
);
create index reviews_approved_idx on public.reviews (approved, created_at desc);

alter table public.reviews enable row level security;
revoke all on public.reviews from anon, authenticated;

-- Reviewer photos. Public, because an approved review is shown with its photo;
-- the object names are random UUIDs, so nothing is listable by guessing.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('review-photos', 'review-photos', true, 1500000, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
