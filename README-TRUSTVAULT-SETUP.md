# TrustVault — beginner setup guide (Windows / VS Code)

This package contains organization sharing, access requests and approvals, one-time access passwords, owner-managed view/modify/download grants, revocation, private file storage, password-protected file access, 10-minute viewer sessions, version history, replacement uploads, and an audit trail.

## A. Configure Supabase

1. In the project folder, copy `.env.example` to `.env.local` (the file must sit beside `package.json`).
2. Open `.env.local` and fill in:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tknmcorjcxcpaoroyskg.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=PASTE_YOUR_PUBLISHABLE_KEY
SUPABASE_SECRET_KEY=PASTE_YOUR_NEWLY_ROTATED_SECRET_KEY
```

3. Get the publishable key and secret key from Supabase Dashboard → Project → API Keys.
4. A publishable key alone is not enough for this package: server routes use `SUPABASE_SECRET_KEY` to read/write private files and enforce authorization after checking the logged-in user. Keep that secret server-side only; never prefix it with `NEXT_PUBLIC_`, put it in client code, commit it, or send it in chat. Rotate any secret previously exposed in a chat.
5. Save `.env.local`. Stop the dev server with Ctrl+C and restart after configuration changes.

## B. Apply the database migration

1. Open `supabase-migration.sql` in VS Code.
2. Press Ctrl+A, then Ctrl+C.
3. Open Supabase Dashboard → SQL Editor → New query.
4. Paste and run the SQL.

This adds document organization/version fields, grant flags, and the private `document_versions` history table. It also ensures `trustvault-documents` stays private. Do not make this bucket public.

## C. Install and run

In VS Code Terminal, from the extracted project folder:

```powershell
npm install
npm run dev
```

Open `http://localhost:3000`.

## D. Test the full workflow with two test accounts

1. Sign in with account A.
2. Create an organization. Copy the join code.
3. Sign in with account B and join the organization using that code.
4. On account A, select the organization before uploading a PDF/PNG/JPEG/WebP file. Set and confirm the owner document password.
5. On account B, locate the document and click **Request access**. Choose VIEW or MODIFY and optionally request download permission.
6. Return to account A and refresh the dashboard. In **Pending access requests**, click **Approve** or **Deny**. Approval creates a random one-time access password. Copy it from the popup and share it with account B over a separate trusted channel.
7. Account B clicks **Open securely** and enters the one-time access password. Incorrect passwords show an error. The owner enters the owner document password.
8. Account A can use **Manage access** to grant or revoke access for a member who already joined the organization. It also shows a one-time password after granting access directly.
9. VIEW users cannot use the app's modify or download controls. MODIFY users can replace the file after password verification; the old file is saved as a version snapshot. The owner and authorized members can use **Version history** to open earlier versions after verifying their access password.
10. A user with download permission can use **Download** after verifying their access password. Revocation invalidates existing server-side viewer sessions.
11. Use **Audit trail** to see recent activity. Leave a viewer session idle for 10 minutes and verify that it must be re-verified.

## E. What the permissions mean

- **VIEW**: open the document with a one-time access password. Download and modification are not granted by default.
- **VIEW + download**: open and use the explicit download control.
- **MODIFY**: replace the uploaded file and create a new version; download is also enabled.
- **REVOKE**: remove the grant and revoke active viewing sessions.
- Access grants expire after 30 days by default. The viewing session is shorter-lived (10 minutes).

## Important limitations

- Join codes are invitation tokens: anyone with a code can join. Share them privately. This build does not include join-code rotation UI.
- Modify means replacing the uploaded file with a new PDF/image; it does not edit PDF text or image pixels inside the browser.
- A browser cannot reliably prevent screenshots, photographs, or copying of bytes it is permitted to view. Do not promise screenshot prevention.
- The one-time access password is shown to the approving owner only once in the UI; share it securely. No automatic email delivery is configured for that password.
- This package is an integration build, not a production security audit. A full build/test could not be completed in this environment because dependencies could not be installed reliably. Test with non-confidential sample files and review RLS/storage policies before production.
