insert into storage.buckets (id, name, public)
values
  ('source-documents', 'source-documents', false),
  ('calculator-templates', 'calculator-templates', false),
  ('generated-calculators', 'generated-calculators', false)
on conflict (id) do update set public = false;

create policy "members can upload source documents to org prefix"
on storage.objects for insert
with check (
  bucket_id = 'source-documents'
  and (storage.foldername(name))[1] in (
    select organisation_id::text from public.organisation_users where user_id = auth.uid()
  )
);

create policy "members can read source documents in org prefix"
on storage.objects for select
using (
  bucket_id = 'source-documents'
  and (storage.foldername(name))[1] in (
    select organisation_id::text from public.organisation_users where user_id = auth.uid()
  )
);

create policy "admins can manage calculator templates"
on storage.objects for all
using (
  bucket_id = 'calculator-templates'
  and public.is_org_admin(((storage.foldername(name))[1])::uuid)
)
with check (
  bucket_id = 'calculator-templates'
  and public.is_org_admin(((storage.foldername(name))[1])::uuid)
);

create policy "members can read generated calculators"
on storage.objects for select
using (
  bucket_id = 'generated-calculators'
  and (storage.foldername(name))[1] in (
    select organisation_id::text from public.organisation_users where user_id = auth.uid()
  )
);

create policy "members can insert generated calculators"
on storage.objects for insert
with check (
  bucket_id = 'generated-calculators'
  and (storage.foldername(name))[1] in (
    select organisation_id::text from public.organisation_users where user_id = auth.uid()
  )
);
