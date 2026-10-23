# TrustVault

TrustVault is a Next.js + Supabase secure document-sharing prototype with:

- Supabase email/password authentication and visible login errors.
- Organization creation and join codes.
- Owner-approved access requests and one-time per-viewer access passwords.
- Owner-managed VIEW, VIEW+download, MODIFY, and REVOKE workflows.
- Private Supabase Storage and server-side authorization checks.
- 10-minute viewer sessions and audit trail.
- Replacement uploads with preserved previous versions.

## Start locally

1. Copy `.env.example` to `.env.local` and fill in the Supabase URL, publishable key, and a newly rotated server-only secret key.
2. Run `supabase-migration.sql` in Supabase Dashboard → SQL Editor.
3. Run `npm install` and `npm run dev`.
4. Open `http://localhost:3000`.

Read `README-TRUSTVAULT-SETUP.md` for step-by-step Windows instructions.

**Security:** Keep `SUPABASE_SECRET_KEY` private and never use it in a `NEXT_PUBLIC_` variable. Keep the Storage bucket private. This project has not undergone a production security audit; no browser app can guarantee prevention of screenshots or copying.
