-- TrustVault complete organization permissions + version history migration
-- Run in Supabase Dashboard -> SQL Editor. Safe to re-run.

-- Organization membership and document placement.
alter table public.documents
  add column if not exists organization_id uuid references public.organizations(id) on delete set null;
alter table public.documents
  add column if not exists version_number integer not null default 1;
alter table public.documents
  add column if not exists updated_at timestamptz not null default now();
create index if not exists documents_organization_id_idx on public.documents (organization_id);
create unique index if not exists organization_members_org_user_unique on public.organization_members (organization_id, user_id);

-- Granular grants. `permission` remains compatible with the existing view/modify check constraint.
alter table public.document_access_grants add column if not exists can_view boolean not null default true;
alter table public.document_access_grants add column if not exists can_edit boolean not null default false;
alter table public.document_access_grants add column if not exists can_download boolean not null default false;
update public.document_access_grants set can_view = true where can_view is distinct from true;
update public.document_access_grants set can_edit = true where permission = 'modify' and can_edit is distinct from true;
create index if not exists document_access_grants_doc_viewer_idx on public.document_access_grants (document_id, viewer_id, expires_at);

-- Every replaced file preserves a private snapshot of the previous version.
create table if not exists public.document_versions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  version_number integer not null check (version_number >= 1),
  storage_path text not null unique,
  original_filename text not null,
  mime_type text not null,
  file_size bigint not null default 0 check (file_size >= 0),
  changed_by uuid not null references auth.users(id),
  change_note text not null default 'Updated document',
  created_at timestamptz not null default now(),
  unique (document_id, version_number)
);
create index if not exists document_versions_doc_version_idx on public.document_versions (document_id, version_number desc);
alter table public.document_versions enable row level security;
-- No direct client policies are intentionally added. Access is through server routes that verify user, membership, grants, and document sessions.

-- Keep the file bucket private and enforce supported file types / size.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('trustvault-documents', 'trustvault-documents', false, 52428800,
  array['application/pdf', 'image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update set
  name = excluded.name,
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Do not make this bucket public or add broad public read policies.

-- Authenticated users may register only documents they own. This allows regular
-- users (not only the legacy admin/owner profile roles) to upload to their own workspace.
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'documents' and policyname = 'trustvault_insert_own_documents') then
    create policy trustvault_insert_own_documents on public.documents
      for insert to authenticated with check (owner_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'documents' and policyname = 'trustvault_select_own_documents') then
    create policy trustvault_select_own_documents on public.documents
      for select to authenticated using (owner_id = auth.uid());
  end if;
end $$;

-- Direct browser uploads are limited to each signed-in user's own storage folder.
-- All protected downloads, version snapshots, replacements, and deletes go through server routes.
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'trustvault_upload_to_own_folder') then
    create policy trustvault_upload_to_own_folder on storage.objects
      for insert to authenticated
      with check (bucket_id = 'trustvault-documents' and (storage.foldername(name))[1] = auth.uid()::text);
  end if;
end $$;
