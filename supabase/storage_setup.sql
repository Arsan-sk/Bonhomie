-- Create storage buckets if they don't exist
insert into storage.buckets (id, name, public)
values ('payment_proofs', 'payment_proofs', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('event_images', 'event_images', true)
on conflict (id) do nothing;

-- Enable RLS on storage.objects
alter table storage.objects enable row level security;

-- Policies for 'payment_proofs'
create policy "Authenticated users can upload payment proofs"
on storage.objects for insert
with check (
  bucket_id = 'payment_proofs' AND
  auth.uid() IS NOT NULL
);

create policy "Users can view their own payment proofs"
on storage.objects for select
using (
  bucket_id = 'payment_proofs' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Admin and Faculty can view all payment proofs"
on storage.objects for select
using (
  bucket_id = 'payment_proofs' AND
  exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'faculty'))
);

-- Policies for 'event_images'
create policy "Public can view event images"
on storage.objects for select
using ( bucket_id = 'event_images' );

create policy "Admin and Faculty can upload event images"
on storage.objects for insert
with check (
  bucket_id = 'event_images' AND
  exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'faculty'))
);
