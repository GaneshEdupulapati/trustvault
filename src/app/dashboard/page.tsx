"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  LayoutDashboard,
  Files,
  Users,
  History,
  Settings,
  LogOut,
  LockKeyhole,
  UploadCloud,
  Clock3,
  ArrowUpRight,
  LoaderCircle,
  ShieldAlert,
  Waves,
  Activity,
  FileCheck2,
  Fingerprint,
  ChevronRight,
  Sparkles,
  Search,
  Bell,
  CheckCircle2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type UserRole = "admin" | "owner" | "viewer";

type NavigationItem = {
  label: string;
  icon: typeof LayoutDashboard;
  badge?: number;
};

type DocumentRow = {
  id: string;
  owner_id?: string;
  organization_id?: string | null;
  title: string;
  original_filename: string;
  mime_type: string;
  file_size: number;
  created_at: string;
  storage_path: string;
  version_number?: number;
  can_view?: boolean;
  can_edit?: boolean;
  can_download?: boolean;
};

type AuditLogRow = {
  id: string;
  action: string;
  document_id: string | null;
  target_user_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
};

type AccessRequestRow = {
  id: string;
  document_id: string;
  requester_id: string;
  can_edit: boolean;
  can_download: boolean;
  created_at: string;
  document_title: string;
  requester_email: string;
};

const glassCard =
  "trustvault-card relative overflow-hidden rounded-[24px] border border-fuchsia-400/40 bg-[#170d32]/75 text-white shadow-[0_0_20px_rgba(190,50,255,0.12)] backdrop-blur-2xl";

function formatTimestamp(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Time unavailable";
  }

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

export default function DashboardPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState("");
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [accessRequests, setAccessRequests] = useState<AccessRequestRow[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogRow[]>([]);
  const [organizations, setOrganizations] = useState<Array<{ id: string; name: string; organization_code: string; role: string }>>([]);
  const [organizationName, setOrganizationName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [selectedOrganizationId, setSelectedOrganizationId] = useState("");
  const [documentFilterId, setDocumentFilterId] = useState("all");
  const [deletingOrganizationId, setDeletingOrganizationId] = useState("");
  const [organizationBusy, setOrganizationBusy] = useState(false);
  const [organizationMessage, setOrganizationMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [checking, setChecking] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState("");
  const [securityBusy, setSecurityBusy] = useState(false);
  const [securityMessage, setSecurityMessage] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [activePage, setActivePage] = useState("Overview");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadDashboard() {
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          router.replace("/login");
          return;
        }

        if (!mounted) return;

        setEmail(user.email ?? "");
        setUserId(user.id);

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role, is_active")
          .eq("id", user.id)
          .maybeSingle();

        if (!mounted) return;

        if (profileError) {
          console.error("TrustVault profile lookup failed:", profileError.code);
          setError(
            "We couldn't verify your account profile. Please try again or contact an administrator."
          );
          return;
        }

        if (!profile || profile.is_active !== true) {
          setError(
            "Your account profile is missing or inactive. Ask an administrator to check your account."
          );
          return;
        }

        if (
          profile.role !== "admin" &&
          profile.role !== "owner" &&
          profile.role !== "viewer"
        ) {
          setError("Your account has an unrecognized role.");
          return;
        }

        setRole(profile.role as UserRole);

        const orgResponse = await fetch("/api/organizations", {
          credentials: "same-origin",
          cache: "no-store",
        });
        const orgResult = await orgResponse.json().catch(() => null);
        if (mounted && orgResponse.ok) {
          const loadedOrganizations = orgResult?.organizations ?? [];
          setOrganizations(loadedOrganizations);
          setDocuments((orgResult?.documents ?? []) as DocumentRow[]);
          setDocumentFilterId(loadedOrganizations[0]?.id ?? "personal");
        } else if (mounted) {
          const { data: ownedDocuments, error: documentsError } = await supabase
            .from("documents")
            .select("id, owner_id, title, original_filename, mime_type, file_size, created_at, storage_path")
            .eq("owner_id", user.id)
            .order("created_at", { ascending: false });
          if (documentsError) {
            console.error("TrustVault document lookup failed:", documentsError.code);
            setError("Your dashboard loaded, but your document list could not be retrieved. Check the server-only Supabase secret key and database migration.");
          } else {
            setDocuments((ownedDocuments ?? []) as DocumentRow[]);
          }
        }
        const requestResponse = await fetch("/api/access-requests", { credentials: "same-origin", cache: "no-store" });
        const requestResult = await requestResponse.json().catch(() => null);
        if (mounted && requestResponse.ok) setAccessRequests((requestResult?.requests ?? []) as AccessRequestRow[]);
        const auditResponse = await fetch("/api/audit-logs", { credentials: "same-origin", cache: "no-store" });
        const auditResult = await auditResponse.json().catch(() => null);
        if (mounted && auditResponse.ok) setAuditLogs((auditResult?.logs ?? []) as AuditLogRow[]);
      } catch (cause) {
        console.error("TrustVault dashboard initialization failed:", cause);
        if (mounted) {
          setError("Unable to load your dashboard. Please try again.");
        }
      } finally {
        if (mounted) setChecking(false);
      }
    }

    void loadDashboard();

    return () => {
      mounted = false;
    };
  }, [router]);

  async function submitOrganization(action: "create" | "join") {
    setOrganizationMessage("");
    setError("");
    const value = action === "create" ? organizationName.trim() : joinCode.trim();
    if (!value) {
      setOrganizationMessage(action === "create" ? "Enter an organization name." : "Enter an organization join code.");
      return;
    }
    setOrganizationBusy(true);
    try {
      const response = await fetch("/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        cache: "no-store",
        body: JSON.stringify(action === "create" ? { action, name: value } : { action, code: value }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.success) {
        setOrganizationMessage(result?.error || "Organization request failed.");
        return;
      }
      if (action === "create") setOrganizationName("");
      else setJoinCode("");
      setOrganizationMessage(result.message || "Organization updated.");
      const refresh = await fetch("/api/organizations", { credentials: "same-origin", cache: "no-store" });
      const refreshed = await refresh.json().catch(() => null);
      if (refresh.ok) {
        setOrganizations(refreshed?.organizations ?? []);
        setDocuments((refreshed?.documents ?? []) as DocumentRow[]);
        if (action === "create" && result.organization?.id) {
          setSelectedOrganizationId(result.organization.id);
          setDocumentFilterId(result.organization.id);
        }
        if (action === "join" && result.organization?.id) setDocumentFilterId(result.organization.id);
      }
    } catch {
      setOrganizationMessage("Unable to connect to TrustVault. Please try again.");
    } finally {
      setOrganizationBusy(false);
    }
  }

  async function handleDeleteOrganization(org: { id: string; name: string }) {
    const confirmed = window.confirm(
      `Permanently delete "${org.name}" and ALL documents, saved versions, access permissions, and memberships associated with this organization? This cannot be undone. Personal documents and other organizations should remain untouched.`
    );
    if (!confirmed) return;

    setOrganizationMessage("");
    setError("");
    setDeletingOrganizationId(org.id);

    try {
      const response = await fetch(`/api/organizations/${encodeURIComponent(org.id)}`, {
        method: "DELETE",
        credentials: "same-origin",
        cache: "no-store",
      });
      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.success) {
        setOrganizationMessage(result?.error || "Unable to delete this organization.");
        return;
      }

      const refresh = await fetch("/api/organizations", {
        credentials: "same-origin",
        cache: "no-store",
      });
      const refreshed = await refresh.json().catch(() => null);

      if (!refresh.ok || !refreshed?.success) {
        setOrganizationMessage(
          "The organization was deleted, but the dashboard could not refresh. Please reload the page."
        );
        return;
      }

      setOrganizations(refreshed.organizations ?? []);
      setDocuments((refreshed.documents ?? []) as DocumentRow[]);
      if (selectedOrganizationId === org.id) setSelectedOrganizationId("");
      if (documentFilterId === org.id) setDocumentFilterId("all");
      setOrganizationMessage(result.message || `Organization "${org.name}" was deleted.`);
    } catch (cause) {
      console.error("TrustVault organization deletion failed:", cause);
      setOrganizationMessage("Unable to connect while deleting the organization. Refresh and check its status before trying again.");
    } finally {
      setDeletingOrganizationId("");
    }
  }

  async function handleFileSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    setError("");

    const allowedTypes = [
      "application/pdf",
      "image/png",
      "image/jpeg",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      setError("Unsupported file type. Upload a PDF, PNG, JPEG, or WebP file.");
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setError("This file is larger than the bucket's 50 MB upload limit.");
      return;
    }

    if (!userId) {
      setError(
        "Your secure session could not be verified. Refresh the page and try again."
      );
      return;
    }

    const password = window.prompt(
      "Create a password for this document (8 to 128 characters):"
    );

    if (password === null) {
      setError("Upload cancelled.");
      return;
    }

    if (password.length < 8 || password.length > 128) {
      setError("Password must be between 8 and 128 characters.");
      return;
    }

    const passwordConfirmation = window.prompt(
      "Confirm the document password:"
    );

    if (passwordConfirmation === null) {
      setError("Upload cancelled.");
      return;
    }

    if (password !== passwordConfirmation) {
      setError("Passwords do not match. Please upload again.");
      return;
    }

    setUploading(true);

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `${userId}/${crypto.randomUUID()}-${safeName}`;

    try {
      const { error: storageError } = await supabase.storage
        .from("trustvault-documents")
        .upload(storagePath, file, {
          contentType: file.type,
          upsert: false,
        });

      if (storageError) {
        console.error("TrustVault storage upload failed:", storageError.message);
        setError(`Upload failed: ${storageError.message}`);
        return;
      }

      const { data: savedDocument, error: metadataError } = await supabase
        .from("documents")
        .insert({
          owner_id: userId,
          title: file.name.replace(/\.[^.]+$/, "") || file.name,
          storage_path: storagePath,
          original_filename: file.name,
          mime_type: file.type,
          file_size: file.size,
          organization_id: selectedOrganizationId || null,
        })
        .select(
          "id, owner_id, organization_id, title, original_filename, mime_type, file_size, created_at, storage_path"
        )
        .single();

      if (metadataError) {
        console.error(
          "TrustVault document metadata insert failed:",
          metadataError.code
        );
        setError(
          `The file reached Storage, but its document record could not be saved: ${metadataError.message}. Do not retry yet; the uploaded file may already exist.`
        );
        return;
      }

      const passwordResponse = await fetch("/api/documents/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          documentId: savedDocument.id,
          password,
        }),
      });

      const passwordResult = await passwordResponse.json().catch(() => null);

      if (!passwordResponse.ok || !passwordResult?.success) {
        console.error(
          "TrustVault document password setup failed:",
          passwordResult?.error
        );
        setError(
          "The document record was created, but password protection could not be confirmed. Do not share or use this document until the password issue is resolved."
        );
        return;
      }

      setDocuments((current) => [savedDocument as DocumentRow, ...current]);
      setError(`Successfully uploaded ${file.name} with password protection.`);
    } catch (cause) {
      console.error("TrustVault upload failed:", cause);
      setError("An unexpected error interrupted the upload. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  // Use the protected API route instead of creating a direct Storage URL.
  async function handleDeleteDocument(document: DocumentRow) {
    const confirmed = window.confirm(
      `Permanently delete "${document.original_filename}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    setError("");

    try {
      const response = await fetch(
        `/api/documents/${encodeURIComponent(document.id)}`,
        {
          method: "DELETE",
          credentials: "same-origin",
          cache: "no-store",
        }
      );

      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.success) {
        setError(result?.error || "Unable to delete this document.");
        return;
      }

      setDocuments((current) =>
        current.filter((item) => item.id !== document.id)
      );

      setError("Document deleted successfully.");
    } catch (cause) {
      console.error("TrustVault deletion failed:", cause);
      setError("Unable to complete deletion. Refresh the dashboard and check the document list.");
    }
  }
  async function handleOpenDocument(document: DocumentRow) {
    setError("");

    const password = window.prompt(
      `Enter your one-time access password for "${document.original_filename}". If you own this file, enter the document password:`
    );

    if (password === null) return;

    if (password.length < 8 || password.length > 128) {
      setError("Password must be between 8 and 128 characters.");
      return;
    }

    // Open a temporary tab immediately so the browser does not block it.
    const opened = window.open("about:blank", "_blank");

    if (!opened) {
      setError(
        "Your browser blocked the document window. Allow pop-ups and try again."
      );
      return;
    }

    opened.document.title = "TrustVault | Secure Document";
    opened.document.body.textContent = "Verifying document password...";

    try {
      // STEP 1: Verify the password.
      const verifyResponse = await fetch("/api/document-access/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        cache: "no-store",
        body: JSON.stringify({ documentId: document.id, password }),
      });

      const verifyResult = await verifyResponse.json().catch(() => null);

      if (!verifyResponse.ok || verifyResult?.success !== true) {
        if (!opened.closed) opened.close();

        if (
          verifyResponse.status === 403 &&
          typeof verifyResult?.error === "string" &&
          verifyResult.error.toLowerCase().includes("incorrect document password") &&
          document.owner_id !== userId
        ) {
          const requestNow = window.confirm(
            "The password was incorrect. Would you like to request access from the document owner now?"
          );

          if (requestNow) {
            await handleRequestAccess(document);
          } else {
            setError("Password incorrect. You can try again or request access from the document owner at any time.");
          }
        } else if (verifyResponse.status === 403) {
          setError(
            verifyResult?.error ||
              "Wrong password. Please enter the correct password."
          );
        } else {
          setError(
            verifyResult?.error ||
              "Password verification failed. Please try again."
          );
        }
        return;
      }

      // STEP 2: Retrieve the protected document.
      opened.document.title = "TrustVault | Opening Document";
      opened.document.body.textContent =
        "Password verified. Opening your document...";

      const fileResponse = await fetch(
        `/api/document-access/file?documentId=${encodeURIComponent(document.id)}`,
        {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store",
        }
      );

      if (!fileResponse.ok) {
        const fileResult = await fileResponse.json().catch(() => null);
        if (!opened.closed) opened.close();

        setError(
          fileResult?.error ||
            "Your password was verified, but the document could not be opened."
        );
        return;
      }

      // STEP 3: Convert the response to a browser-readable file.
      const fileBlob = await fileResponse.blob();

      if (fileBlob.size === 0) {
        if (!opened.closed) opened.close();
        setError("The document file is empty. Please check the uploaded file.");
        return;
      }

      const objectUrl = URL.createObjectURL(fileBlob);

      // STEP 4: Display the document in a viewer with a 10-minute countdown.
      if (opened.closed) {
        URL.revokeObjectURL(objectUrl);
        setError(
          "The document window was closed before the file could open. Please try again."
        );
        return;
      }

      const viewerDocument = opened.document;
      viewerDocument.open();
      viewerDocument.write(`
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>TrustVault Secure Document Viewer</title>
            <style>
              * { box-sizing: border-box; }
              body { margin: 0; background: #08051b; color: #fff; font-family: Arial, sans-serif; }
              .toolbar { position: sticky; top: 0; z-index: 10; display: flex; justify-content: space-between; align-items: center; gap: 16px; padding: 14px 20px; background: #170d32; border-bottom: 1px solid rgba(255,255,255,.15); }
              .brand { font-size: 16px; font-weight: bold; }
              .timer { color: #67e8f9; font-weight: bold; font-size: 15px; }
              .warning { padding: 8px 20px; background: #25143d; color: #ddd6fe; font-size: 12px; text-align: center; }
              iframe { display: block; width: 100%; height: calc(100vh - 100px); border: none; background: #fff; }
              .expired { display: flex; min-height: 100vh; align-items: center; justify-content: center; padding: 24px; text-align: center; }
              .expired-card { max-width: 480px; padding: 32px; border: 1px solid rgba(103,232,249,.3); border-radius: 20px; background: #170d32; }
              .expired h1 { color: #67e8f9; }
              .expired button { margin-top: 16px; padding: 12px 20px; border: none; border-radius: 10px; background: #67e8f9; color: #08051b; font-weight: bold; cursor: pointer; }
            </style>
          </head>
          <body>
            <header class="toolbar">
              <div class="brand">TrustVault Â· Secure Viewer</div>
              <div>Time remaining: <span class="timer" id="trustvault-countdown">10:00</span></div>
            </header>
            <div class="warning">This viewing session will close when the countdown reaches zero.</div>
            <iframe id="trustvault-document-frame" title="Secure document" referrerpolicy="no-referrer"></iframe>
          </body>
        </html>
      `);
      viewerDocument.close();

      const documentFrame = viewerDocument.getElementById(
        "trustvault-document-frame"
      ) as HTMLIFrameElement | null;
      const countdownElement = viewerDocument.getElementById(
        "trustvault-countdown"
      );

      if (!documentFrame || !countdownElement) {
        URL.revokeObjectURL(objectUrl);
        if (!opened.closed) opened.close();
        setError("Could not initialize the secure document viewer.");
        return;
      }

      documentFrame.src = objectUrl;
      let remainingSeconds = 10 * 60;

      const formatRemainingTime = (totalSeconds: number) => {
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
      };

      countdownElement.textContent = formatRemainingTime(remainingSeconds);

      const countdownInterval = window.setInterval(() => {
        if (opened.closed) {
          window.clearInterval(countdownInterval);
          URL.revokeObjectURL(objectUrl);
          return;
        }

        remainingSeconds -= 1;
        if (remainingSeconds > 0) {
          countdownElement.textContent = formatRemainingTime(remainingSeconds);
          return;
        }

        window.clearInterval(countdownInterval);
        documentFrame.src = "about:blank";
        URL.revokeObjectURL(objectUrl);

        viewerDocument.body.innerHTML = `
          <main class="expired">
            <section class="expired-card">
              <h1>Viewing Session Expired</h1>
              <p>Your 10-minute document viewing session has ended.</p>
              <p>Return to TrustVault and verify access again to reopen this document.</p>
              <button id="trustvault-close-viewer" type="button">Close Viewer</button>
            </section>
          </main>
        `;

        viewerDocument
          .getElementById("trustvault-close-viewer")
          ?.addEventListener("click", () => opened.close());

        window.setTimeout(() => {
          if (!opened.closed) opened.close();
        }, 5000);
      }, 1000);
    } catch (cause) {
      console.error("TrustVault document opening failed:", cause);

      if (!opened.closed) opened.close();

      setError(
        "Unable to securely open the document. Please check your connection and try again."
      );
    }
  }

  async function handleRequestAccess(document: DocumentRow) {
    const choice = window.prompt("Request permission: type VIEW or MODIFY.", "VIEW");
    if (!choice) return;
    const normalized = choice.trim().toLowerCase();
    if (normalized !== "view" && normalized !== "modify") {
      setError("Choose VIEW or MODIFY.");
      return;
    }
    let canDownload = normalized === "modify";
    if (normalized === "view") {
      const downloadChoice = window.prompt("Would you also like to request download permission? Type YES or NO.", "NO");
      if (downloadChoice === null) return;
      canDownload = downloadChoice.trim().toLowerCase() === "yes";
    }
    try {
      const response = await fetch("/api/access-requests", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", cache: "no-store", body: JSON.stringify({ documentId: document.id, canEdit: normalized === "modify", canDownload }) });
      const result = await response.json().catch(() => null);
      setError(response.ok && result?.success ? result.message : (result?.error || "Could not request access."));
    } catch {
      setError("Unable to send the access request.");
    }
  }

  async function handleAccessDecision(requestId: string, decision: "approved" | "denied") {
    try {
      const response = await fetch(`/api/access-requests/${encodeURIComponent(requestId)}/decision`, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", cache: "no-store", body: JSON.stringify({ decision }) });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.success) {
        setError(result?.error || "Could not update the access request.");
        return;
      }
      if (decision === "approved" && result.access?.password) {
        window.alert(`Access approved. Copy this one-time access password and share it with ${requestId ? "the requester" : "the user"} through a separate secure channel:\n\n${result.access.password}\n\nThis password is shown only once. The viewer must also sign in and have active permission.`);
      }
      setError(decision === "approved" ? "Access approved. Share the one-time password securely with the requester." : "Access request denied.");
      const refreshed = await fetch("/api/access-requests", { credentials: "same-origin", cache: "no-store" });
      const list = await refreshed.json().catch(() => null);
      if (refreshed.ok) setAccessRequests((list?.requests ?? []) as AccessRequestRow[]);
    } catch {
      setError("Unable to update the access request.");
    }
  }

  async function handleManagePermissions(document: DocumentRow) {
    if (document.owner_id !== userId) {
      setError("Only the document owner can manage permissions.");
      return;
    }
    const emailToShare = window.prompt("Enter the exact email address of a user who has already joined this document's organization:");
    if (!emailToShare) return;
    const permission = window.prompt("Type VIEW for view-only, MODIFY for edit + download, or REVOKE to remove access.", "VIEW");
    if (!permission) return;
    const normalized = permission.trim().toLowerCase();
    if (normalized !== "view" && normalized !== "modify" && normalized !== "revoke") {
      setError("Permission must be VIEW, MODIFY, or REVOKE.");
      return;
    }
    let canDownload = normalized === "modify";
    if (normalized === "view") {
      const downloadChoice = window.prompt("Allow this user to download the document? Type YES or NO.", "NO");
      if (downloadChoice === null) return;
      canDownload = downloadChoice.trim().toLowerCase() === "yes";
    }
    try {
      const response = await fetch(`/api/documents/${encodeURIComponent(document.id)}/permissions`, {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", cache: "no-store",
        body: JSON.stringify(normalized === "revoke"
          ? { action: "revoke", email: emailToShare.trim() }
          : { email: emailToShare.trim(), permission: normalized, canDownload, expiresDays: 30 }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.success) {
        setError(result?.error || "Could not save document permissions.");
        return;
      }
      if (result.accessPassword) {
        window.alert(`${result.message}\n\nONE-TIME ACCESS PASSWORD:\n${result.accessPassword}\n\nCopy it now and send it to the user through a separate secure channel. It will not be shown again.`);
      }
      setError(result.message || "Permissions updated.");
      const refreshed = await fetch("/api/organizations", { credentials: "same-origin", cache: "no-store" });
      const list = await refreshed.json().catch(() => null);
      if (refreshed.ok) setDocuments((list?.documents ?? []) as DocumentRow[]);
    } catch {
      setError("Unable to connect while saving permissions.");
    }
  }

  async function handleReplaceDocument(document: DocumentRow) {
    const password = window.prompt(`Enter your access password before modifying "${document.original_filename}" (the owner enters the document password)`);
    if (password === null) return;
    try {
      const verify = await fetch("/api/document-access/verify", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", cache: "no-store",
        body: JSON.stringify({ documentId: document.id, password }),
      });
      const verified = await verify.json().catch(() => null);
      if (!verify.ok || !verified?.success) {
        setError(verified?.error || "Document password verification failed.");
        return;
      }
    } catch {
      setError("Unable to verify the document password.");
      return;
    }
    const input = window.document.createElement("input");
    input.type = "file";
    input.accept = ".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/png,image/jpeg,image/webp";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const note = window.prompt("What changed in this version?", "Updated document") ?? "Updated document";
      const form = new FormData();
      form.set("file", file);
      form.set("note", note);
      setError("");
      try {
        const response = await fetch(`/api/documents/${encodeURIComponent(document.id)}/versions`, { method: "POST", credentials: "same-origin", cache: "no-store", body: form });
        const result = await response.json().catch(() => null);
        if (!response.ok || !result?.success) {
          setError(result?.error || "Could not save the new version.");
          return;
        }
        setError(result.message || "New version saved.");
        const refreshed = await fetch("/api/organizations", { credentials: "same-origin", cache: "no-store" });
        const list = await refreshed.json().catch(() => null);
        if (refreshed.ok) setDocuments((list?.documents ?? []) as DocumentRow[]);
      } catch {
        setError("Unable to upload the replacement file.");
      }
    };
    input.click();
  }

  async function handleViewVersions(document: DocumentRow) {
    setError("");
    const password = window.prompt(
      `Enter your access password to view history for "${document.original_filename}".`
    );
    if (password === null) return;

    try {
      const verify = await fetch("/api/document-access/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        cache: "no-store",
        body: JSON.stringify({ documentId: document.id, password }),
      });
      const verified = await verify.json().catch(() => null);
      if (!verify.ok || !verified?.success) {
        setError(verified?.error || "Document password verification failed.");
        return;
      }

      const response = await fetch(
        `/api/documents/${encodeURIComponent(document.id)}/versions`,
        { credentials: "same-origin", cache: "no-store" }
      );
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.success) {
        setError(result?.error || "Could not load version history.");
        return;
      }

      const versions = (result.versions ?? []) as Array<{
        id: string;
        version_number: number;
        original_filename: string;
        created_at: string;
        change_note: string;
      }>;

      if (versions.length === 0) {
        window.alert(
          `Version history for "${document.original_filename}"\\n\\nNo previous versions have been saved yet.`
        );
        return;
      }

      const details = versions
        .map(
          (version) =>
            `Version ${version.version_number} Ã¢â‚¬â€ ${version.original_filename}\\n` +
            `${new Date(version.created_at).toLocaleString()}\\n` +
            `Note: ${version.change_note || "No change note"}`
        )
        .join("\\n\\n");

      const choice = window.prompt(
        `Version history for ${document.original_filename}\\n\\n${details}\\n\\nEnter the version number to open:`
      );
      if (!choice) return;

      const selected = versions.find(
        (version) => String(version.version_number) === choice.trim()
      );
      if (!selected) {
        setError("That version number was not found. Please open history and choose a listed version.");
        return;
      }

      const versionResponse = await fetch(
        `/api/documents/${encodeURIComponent(document.id)}/versions/${encodeURIComponent(selected.id)}`,
        { credentials: "same-origin", cache: "no-store" }
      );

      if (!versionResponse.ok) {
        const versionResult = await versionResponse.json().catch(() => null);
        setError(versionResult?.error || "Could not open the selected version.");
        return;
      }

      const blob = await versionResponse.blob();
      if (!blob.size) {
        setError("The selected version is empty.");
        return;
      }

      const objectUrl = URL.createObjectURL(blob);
      const tab = window.open(objectUrl, "_blank");
      if (!tab) {
        URL.revokeObjectURL(objectUrl);
        setError("Your browser blocked the version window. Allow pop-ups and try again.");
        return;
      }
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 120_000);
    } catch (cause) {
      console.error("TrustVault version history failed:", cause);
      setError("Unable to load version history. Please try again.");
    }
  }

  async function handleDownloadDocument(document: DocumentRow) {
    const password = window.prompt(`Enter your access password to download "${document.original_filename}" (the owner enters the document password)`);
    if (password === null) return;
    try {
      const verify = await fetch("/api/document-access/verify", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", cache: "no-store", body: JSON.stringify({ documentId: document.id, password }) });
      const verified = await verify.json().catch(() => null);
      if (!verify.ok || !verified?.success) {
        setError(verified?.error || "Document password verification failed.");
        return;
      }
      const response = await fetch(`/api/document-access/file?documentId=${encodeURIComponent(document.id)}&download=1`, { credentials: "same-origin", cache: "no-store" });
      if (!response.ok) {
        const result = await response.json().catch(() => null);
        setError(result?.error || "Download was denied.");
        return;
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = window.document.createElement("a");
      link.href = url;
      link.download = document.original_filename || "trustvault-document";
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Unable to download this document.");
    }
  }

  useEffect(() => {
    const selector = ".trustvault-card, .trustvault-shine";

    function handleMouseMove(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const element = target.closest<HTMLElement>(selector);
      if (!element) return;

      const rect = element.getBoundingClientRect();

      element.style.setProperty("--mouse-x", `${event.clientX - rect.left}px`);
      element.style.setProperty("--mouse-y", `${event.clientY - rect.top}px`);
    }

    document.addEventListener("mousemove", handleMouseMove);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  async function handleUpdatePassword() {
    setSecurityMessage("");

    if (newPassword.length < 8 || newPassword.length > 128) {
      setSecurityMessage("Password must be between 8 and 128 characters.");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setSecurityMessage("The new passwords do not match.");
      return;
    }

    setSecurityBusy(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        console.error("TrustVault password update failed:", updateError.message);
        setSecurityMessage("Password update failed. Please sign in again and retry.");
        return;
      }

      setNewPassword("");
      setConfirmNewPassword("");
      setSecurityMessage("Your account password was updated successfully.");
    } catch (cause) {
      console.error("TrustVault password update failed:", cause);
      setSecurityMessage("Unable to update your password right now. Please try again.");
    } finally {
      setSecurityBusy(false);
    }
  }

  async function handleSignOut() {
    setSigningOut(true);
    setError("");

    try {
      const { error: signOutError } = await supabase.auth.signOut();

      if (signOutError) {
        setError("Unable to sign out. Please try again.");
        setSigningOut(false);
        return;
      }

      router.replace("/login");
      router.refresh();
    } catch {
      setError("Unable to sign out. Please try again.");
      setSigningOut(false);
    }
  }

  // A user's account role and their ownership of an individual document are
  // different. Keep the account role intact, but recognize document owners
  // from the documents they actually uploaded.
  const ownsAnyDocument = documents.some((document) => document.owner_id === userId);

  const roleLabel =
    role === "admin"
      ? "Administrator"
      : role === "owner" || ownsAnyDocument
        ? "Document Owner"
        : "Viewer";

  const navigation: NavigationItem[] = [
    { label: "Overview", icon: LayoutDashboard },
    { label: "Documents", icon: Files },
    ...(role === "admin"
      ? [{ label: "User Management", icon: Users }]
      : []),
    ...(role === "owner" || ownsAnyDocument
      ? [{ label: "Pending Access Requests", icon: Users, badge: accessRequests.length }]
      : []),
    { label: "Audit Trail", icon: History },
    { label: "Security Settings", icon: Settings },
  ];

  function handleNavigation(label: string) {
    setActivePage(label);

    if (label === "Overview") {
      router.push("/dashboard");
      return;
    }

    if (label === "Documents") {
      document.getElementById("trustvault-documents")?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    if (label === "Access Requests" || label === "Pending Access Requests") {
      document.getElementById("trustvault-access-requests")?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    if (label === "Audit Trail") {
      document.getElementById("trustvault-audit-trail")?.scrollIntoView({ behavior: "smooth" });
      return;
    }

    if (label === "Security Settings") {
      document.getElementById("trustvault-security-settings")?.scrollIntoView({ behavior: "smooth" });
      return;
    }

    setError(`${label} is not available for this account.`);
  }

  if (checking) {
    return (
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#08051b] px-5 text-white">
        <div
          className="pointer-events-none fixed inset-0"
          style={{
            background:
              "radial-gradient(ellipse at 10% 10%, rgba(214,41,255,.25), transparent 38%), radial-gradient(ellipse at 90% 10%, rgba(41,139,255,.2), transparent 38%), linear-gradient(135deg,#09051c,#11072b,#070c27)",
          }}
        />
        <div className="trustvault-card flex items-center gap-3 rounded-3xl px-7 py-6">
          <LoaderCircle className="animate-spin text-fuchsia-300" size={23} />
          <span className="text-sm font-medium text-violet-100">
            Verifying your secure session...
          </span>
        </div>
      </main>
    );
  }

  if (!role) {
    return (
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#08051b] p-5 text-white">
        <section className="trustvault-card w-full max-w-lg p-8">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-fuchsia-300/50 bg-fuchsia-500/15 text-fuchsia-200">
            <ShieldAlert size={27} />
          </div>
          <h1 className="text-2xl font-bold text-white">
            Account verification
          </h1>
          <p className="mt-3 text-sm leading-6 text-violet-200">
            {error || "We couldn't verify your account."}
          </p>
          <button
            type="button"
            onClick={() => router.replace("/login")}
            className="glass-button glass-button-primary mt-6"
          >
            Return to login
          </button>
        </section>
      </main>
    );
  }

  const statCards = [
    {
      label: "Your documents",
      value: String(documents.length),
      note: "Documents in your workspace",
      icon: Files,
      tone: "blue",
    },
    {
      label: "Access requests",
      value: String(accessRequests.length),
      note: "Pending owner decisions",
      icon: Users,
      tone: "pink",
    },
    {
      label: "Recent activity",
      value: String(auditLogs.length),
      note:
        auditLogs.length === 0
          ? "No audit events recorded yet"
          : auditLogs.length === 1
            ? "Recorded security event"
            : "Recorded security events",
      icon: History,
      tone: "cyan",
    },
    {
      label: "Security status",
      value: "Active",
      note: "Supabase session verified",
      icon: LockKeyhole,
      tone: "green",
    },
  ];

  const quickActions = [
    {
      title: "Document workspace",
      description: "View and organize documents",
      icon: Files,
    },
    {
      title: "Upload a document",
      description: "Add a PDF or image to your workspace",
      icon: UploadCloud,
    },
    {
      title: role === "admin" ? "Manage users" : "Access requests",
      description:
        role === "admin"
          ? "Manage accounts and assigned roles"
          : "Review document access requests",
      icon: Users,
    },
    {
      title: "Recent audit activity",
      description: "Review security events",
      icon: History,
    },
  ];

  const filteredDocuments = documents.filter((document) => {
    if (documentFilterId === "personal") return !document.organization_id;
    if (documentFilterId === "all") return true;
    return document.organization_id === documentFilterId;
  });

  const organizationNameById = new Map(
    organizations.map((organization) => [organization.id, organization.name])
  );

  const filteredActions = quickActions.filter((action) =>
    `${action.title} ${action.description}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#08051b] text-white selection:bg-fuchsia-500/40">
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 8% 12%, rgba(214,41,255,.25), transparent 35%), radial-gradient(ellipse at 94% 8%, rgba(41,139,255,.25), transparent 36%), radial-gradient(ellipse at 50% 100%, rgba(123,45,255,.14), transparent 40%), linear-gradient(135deg,#09051c,#11072b,#070c27)",
        }}
      />

      <div className="relative mx-auto flex min-h-screen max-w-[1800px] gap-4 p-3 sm:p-5">
        {/* Sidebar */}
        <aside className="trustvault-card sticky top-5 hidden h-[calc(100vh-40px)] w-[218px] shrink-0 flex-col rounded-[26px] border border-fuchsia-300/40 bg-[#16082b]/80 p-4 shadow-[0_0_30px_rgba(190,50,255,.14)] backdrop-blur-2xl lg:flex">
          <div className="flex items-center gap-3 px-1 py-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-fuchsia-300/60 bg-fuchsia-500/20 text-fuchsia-100 shadow-[0_0_20px_rgba(217,70,255,.2)]">
              <img src="/trustvault-logo.png" alt="GTrustVault logo" className="h-full w-full rounded-xl object-cover" />
            </div>
            <div>
              <p className="text-base font-black tracking-tight text-white">
                TRUST<span className="text-fuchsia-300">VAULT</span>
              </p>
              <p className="text-[9px] text-violet-200">
                Secure Document Sharing
              </p>
            </div>
          </div>

          <div className="mb-3 mt-7 flex items-center justify-between px-2">
            <span className="text-[9px] font-bold uppercase tracking-[0.22em] text-violet-300/80">
              Workspace
            </span>
            <Waves size={13} className="text-cyan-300" />
          </div>

          <nav className="space-y-1.5">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = activePage === item.label;

              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => handleNavigation(item.label)}
                  className={`group flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left text-sm transition duration-200 ${
                    active
                      ? "border-fuchsia-300/80 bg-gradient-to-r from-fuchsia-600 to-violet-700 text-white shadow-[0_0_22px_rgba(217,70,255,.4)]"
                      : "border-transparent text-violet-200 hover:border-fuchsia-300/30 hover:bg-white/[0.06] hover:text-white"
                  }`}
                >
                  <Icon size={17} />
                  <span className="flex-1">{item.label}</span>
                  {item.label === "Pending Access Requests" && (
                    <span className={`min-w-6 rounded-full px-2 py-0.5 text-center text-[10px] font-black ${item.badge ? "bg-amber-300 text-[#21103b]" : "border border-white/15 bg-white/5 text-violet-200"}`}>
                      {item.badge ?? 0}
                    </span>
                  )}
                  {active && <ChevronRight size={15} />}
                </button>
              );
            })}
          </nav>

          <div className="mt-auto rounded-2xl border border-cyan-300/30 bg-gradient-to-br from-cyan-500/[0.12] to-fuchsia-500/[0.10] p-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-cyan-300/30 bg-cyan-500/10 text-cyan-200">
                <LockKeyhole size={15} />
              </div>
              <div>
                <p className="text-xs font-bold text-white">Session status</p>
                <p className="text-[9px] text-emerald-300">
                  Authentication verified
                </p>
              </div>
            </div>
          </div>
        </aside>

        {/* Main dashboard */}
        <section className="min-w-0 flex-1">
          {/* Top bar */}
          <header className="trustvault-card mb-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-fuchsia-300/40 bg-[#160c30]/75 px-5 py-4 shadow-[0_0_24px_rgba(190,50,255,.10)] backdrop-blur-2xl sm:px-7">
            <div className="flex items-center gap-3 lg:hidden">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-fuchsia-300/50 bg-fuchsia-500/15 text-fuchsia-200">
                <img src="/trustvault-logo.png" alt="GTrustVault logo" className="h-full w-full rounded-xl object-cover" />
              </div>
              <div>
                <p className="font-bold text-white">
                  TRUST<span className="text-fuchsia-300">VAULT</span>
                </p>
                <p className="text-[10px] text-violet-300">
                  Secure Document Sharing
                </p>
              </div>
            </div>

            <div className="hidden text-xs text-violet-300 sm:block">
              Workspace
              <span className="mx-2 text-fuchsia-400">/</span>
              <span className="font-semibold text-white">{activePage}</span>
            </div>

            <div className="ml-auto flex items-center gap-2 sm:gap-3">
              <label className="hidden items-center gap-2 rounded-xl border border-violet-400/40 bg-[#0c0927]/80 px-3 py-2.5 text-violet-300 sm:flex">
                <Search size={16} />
                <input
                  aria-label="Search dashboard actions"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search workspace..."
                  className="w-36 bg-transparent text-xs text-white outline-none placeholder:text-violet-400/80 lg:w-44"
                />
              </label>

              <button
                type="button"
                aria-label="Notifications"
                onClick={() => setError("You have no new notifications.")}
                className="trustvault-shine rounded-xl border border-violet-400/40 bg-white/5 p-2.5 text-violet-200 transition hover:border-fuchsia-300 hover:text-white"
              >
                <Bell size={17} />
              </button>

              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-fuchsia-300/70 bg-gradient-to-br from-fuchsia-500/40 to-blue-500/30 text-sm font-bold text-white shadow-[0_0_18px_rgba(217,70,255,.28)]">
                {(email.charAt(0) || "U").toUpperCase()}
              </div>

              <button
                type="button"
                onClick={handleSignOut}
                disabled={signingOut}
                className="glass-button"
              >
                {signingOut ? (
                  <LoaderCircle size={15} className="animate-spin" />
                ) : (
                  <LogOut size={15} />
                )}
                <span className="hidden sm:inline">
                  {signingOut ? "Signing outÃ¢â‚¬Â¦" : "Sign out"}
                </span>
              </button>
            </div>
          </header>

          {/* Welcome */}
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4 px-1 sm:px-3">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-fuchsia-300/40 bg-fuchsia-500/[0.10] px-3 py-1.5 text-[10px] font-bold text-fuchsia-100">
                <Sparkles size={12} />
                Your secure workspace
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_8px_rgba(52,211,153,.9)]" />
              </div>
              <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
                Welcome back
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-violet-200">
                Manage documents, access permissions, and security activity from
                one secure workspace.
              </p>
            </div>

            <div className="flex items-center gap-2 rounded-2xl border border-fuchsia-300/40 bg-[#180d35]/75 px-4 py-3 shadow-[0_0_18px_rgba(190,50,255,.10)]">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-300/30 bg-emerald-500/10 text-emerald-300">
                <ShieldCheck size={19} />
              </div>
              <div>
                <p className="text-[10px] text-violet-300">Signed in as</p>
                <p className="text-xs font-bold text-white">{roleLabel}</p>
              </div>
            </div>
          </div>

          {/* Error / success message */}
          {error && (
            <div
              role="status"
              className="mb-5 flex items-start justify-between gap-4 rounded-2xl border border-amber-300/40 bg-amber-500/[0.09] px-4 py-3 text-sm text-amber-100"
            >
              <span>{error}</span>
              <button
                type="button"
                onClick={() => setError("")}
                className="shrink-0 font-semibold hover:text-white"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Summary cards */}
          <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {statCards.map((card) => {
              const Icon = card.icon;
              const tone =
                card.tone === "blue"
                  ? "border-blue-300/40 bg-blue-500/15 text-blue-200"
                  : card.tone === "pink"
                    ? "border-fuchsia-300/40 bg-fuchsia-500/15 text-fuchsia-200"
                    : card.tone === "cyan"
                      ? "border-cyan-300/40 bg-cyan-500/15 text-cyan-200"
                      : "border-emerald-300/40 bg-emerald-500/15 text-emerald-200";

              return (
                <article
                  key={card.label}
                  className={`${glassCard} p-4 transition duration-200 hover:-translate-y-0.5 hover:border-fuchsia-300/70`}
                >
                  <div className="mb-4 flex items-center justify-between">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-2xl border ${tone}`}
                    >
                      <Icon size={20} />
                    </div>
                    <ArrowUpRight size={16} className="text-violet-300" />
                  </div>
                  <p className="text-xs font-medium text-violet-200">
                    {card.label}
                  </p>
                  <p className="mt-1 text-2xl font-black text-white">
                    {card.value}
                  </p>
                  <p className="mt-2 text-[10px] leading-4 text-violet-300">
                    {card.note}
                  </p>
                </article>
              );
            })}
          </div>

          {/* Quick actions */}
          <div className="mb-5 grid grid-cols-1 items-stretch gap-4">
            <article className={`${glassCard} p-5 shadow-[0_0_26px_rgba(217,70,255,.14)] sm:p-6`}>
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <p className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-fuchsia-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-fuchsia-300" />
                    Workspace tools
                  </p>
                  <h2 className="text-lg font-bold text-white">Quick actions</h2>
                  <p className="mt-1 text-xs text-violet-200">
                    Access your workspace tools.
                  </p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-fuchsia-300/40 bg-fuchsia-500/10 text-fuchsia-200">
                  <LayoutDashboard size={19} />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {filteredActions.map((action, index) => {
                  const Icon = action.icon;

                  return (
                    <button
                      key={action.title}
                      type="button"
                      onClick={() => {
                        if (action.title === "Document workspace") {
                          handleNavigation("Documents");
                        } else if (action.title === "Upload a document") {
                          fileInputRef.current?.click();
                        } else if (
                          action.title === "Manage users" ||
                          action.title === "Access requests"
                        ) {
                          handleNavigation(
                            action.title === "Manage users"
                              ? "User Management"
                              : "Access Requests"
                          );
                        } else {
                          handleNavigation("Audit Trail");
                        }
                      }}
                      className="trustvault-shine group flex min-h-[112px] w-full items-center gap-3 rounded-[20px] border border-violet-300/40 bg-gradient-to-br from-white/[0.055] to-blue-500/[0.08] p-4 text-left transition duration-200 hover:-translate-y-0.5 hover:border-fuchsia-300/80 hover:shadow-[0_0_22px_rgba(217,70,255,.22)]"
                    >
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border ${
                          index % 2 === 0
                            ? "border-fuchsia-300/50 bg-fuchsia-500/20 text-fuchsia-200 shadow-[0_0_16px_rgba(217,70,255,.16)]"
                            : "border-cyan-300/50 bg-blue-500/20 text-cyan-100 shadow-[0_0_16px_rgba(41,139,255,.16)]"
                        }`}
                      >
                        <Icon size={21} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-white">
                          {action.title}
                        </p>
                        <p className="mt-1.5 text-[10px] leading-4 text-violet-200">
                          {action.description}
                        </p>
                      </div>
                      <ArrowUpRight
                        size={17}
                        className="shrink-0 text-violet-300 transition group-hover:text-white"
                      />
                    </button>
                  );
                })}

                {filteredActions.length === 0 && (
                  <p className="col-span-full rounded-xl border border-violet-400/30 p-4 text-sm text-violet-200">
                    No actions match your search.
                  </p>
                )}
              </div>

              <div className="mt-5 flex items-start gap-3 rounded-2xl border border-cyan-300/25 bg-cyan-500/[0.06] p-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cyan-300/30 bg-cyan-500/10 text-cyan-200">
                  <FileCheck2 size={18} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">
                    Your documents, under your control
                  </p>
                  <p className="mt-1 text-[10px] leading-4 text-violet-200">
                    Uploads are stored in your private bucket. Secure sharing
                    workflows and audit logging still require implementation.
                  </p>
                </div>
              </div>
            </article>


          </div>

          {/* Organization workspace */}
          <section className={`${glassCard} mb-5 p-5 sm:p-6`}>
            <div className="mb-5">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-300">Team workspace</p>
              <h2 className="text-xl font-bold text-white">Organizations</h2>
              <p className="mt-1.5 text-sm text-violet-200">Create an organization and share its join code with trusted members. Members must request owner approval and use the one-time access password issued with that permission.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-violet-300/20 bg-white/[0.03] p-4">
                <label htmlFor="organization-name" className="mb-2 block text-xs font-semibold text-violet-100">Create an organization</label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input id="organization-name" value={organizationName} onChange={(e) => setOrganizationName(e.target.value)} maxLength={120} placeholder="e.g. Data Science Team" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#08051b]/70 px-3 py-3 text-sm text-white outline-none placeholder:text-violet-400 focus:border-cyan-300/50" />
                  <button type="button" disabled={organizationBusy} onClick={() => void submitOrganization("create")} className="glass-button glass-button-primary disabled:opacity-50">{organizationBusy ? "WorkingÃ¢â‚¬Â¦" : "Create"}</button>
                </div>
              </div>
              <div className="rounded-2xl border border-violet-300/20 bg-white/[0.03] p-4">
                <label htmlFor="organization-code" className="mb-2 block text-xs font-semibold text-violet-100">Join with a code</label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input id="organization-code" value={joinCode} onChange={(e) => setJoinCode(e.target.value)} maxLength={40} placeholder="Paste organization code" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#08051b]/70 px-3 py-3 text-sm text-white outline-none placeholder:text-violet-400 focus:border-cyan-300/50" />
                  <button type="button" disabled={organizationBusy} onClick={() => void submitOrganization("join")} className="glass-button disabled:opacity-50">Join</button>
                </div>
              </div>
            </div>
            {organizationMessage && <p role="status" className="mt-3 rounded-xl border border-cyan-300/20 bg-cyan-300/[0.06] p-3 text-sm text-cyan-100">{organizationMessage}</p>}
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {organizations.map((org) => (
                <div key={org.id} className="rounded-2xl border border-cyan-300/20 bg-[#0c0927]/65 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div><p className="font-semibold text-white">{org.name}</p><p className="mt-1 text-xs text-violet-300">Your role: {org.role}</p></div>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => { setSelectedOrganizationId(org.id); setOrganizationMessage(`Uploads will be saved to ${org.name}.`); }} className={`rounded-lg border px-3 py-2 text-xs ${selectedOrganizationId === org.id ? "border-emerald-300/40 bg-emerald-300/10 text-emerald-200" : "border-white/10 text-violet-200 hover:border-cyan-300/40"}`}>{selectedOrganizationId === org.id ? "Selected for upload" : "Select for upload"}</button>
                      {org.role === "admin" && (
                        <button
                          type="button"
                          disabled={deletingOrganizationId === org.id}
                          onClick={() => void handleDeleteOrganization(org)}
                          className="rounded-lg border border-rose-400/40 px-3 py-2 text-xs text-rose-200 hover:border-rose-300 hover:bg-rose-500/10 disabled:opacity-50"
                        >
                          {deletingOrganizationId === org.id ? "Deleting..." : "Delete organization"}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/20 p-3"><span className="text-[10px] uppercase tracking-wider text-violet-300">Join code</span><code className="select-all text-sm font-bold tracking-widest text-cyan-200">{org.organization_code}</code><button type="button" onClick={() => { void navigator.clipboard.writeText(org.organization_code); setOrganizationMessage("Organization code copied."); }} className="text-xs text-blue-300 hover:text-white">Copy code</button></div>
                </div>
              ))}
            </div>
            {organizations.length === 0 && <p className="mt-4 text-xs text-violet-300">You have not joined an organization yet.</p>}
            <p className="mt-3 text-[11px] leading-5 text-amber-200/80">Only share join codes with trusted people. Organization members can see listed file metadata, but opening a protected file requires an owner-approved permission grant and a one-time access password. Use the selection button before uploading to place a document in an organization. Each document remains owned by its uploader.</p>
          </section>

          <section id="trustvault-access-requests" className={`${glassCard} mb-5 p-5 sm:p-6`}>
            {accessRequests.length > 0 ? (
              <>
              <div className="mb-4">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-amber-300">Permission workflow</p>
                <h2 className="text-xl font-bold text-white">Pending access requests</h2>
                <p className="mt-1 text-sm text-violet-200">Approve or deny requests for documents you own. Approval creates a one-time access password.</p>
              </div>
              <div className="space-y-3">
                {accessRequests.map((request) => (
                  <div key={request.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-amber-300/20 bg-white/[0.03] p-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-white">{request.document_title}</p>
                      <p className="mt-1 text-xs text-violet-200">Requested by {request.requester_email}</p>
                      <p className="mt-1 text-xs text-violet-300">{request.can_edit ? "Modify requested" : "View-only requested"}{request.can_download ? " Ã‚Â· Download requested" : ""} Ã‚Â· {formatTimestamp(request.created_at)}</p>
                    </div>
                    <button type="button" onClick={() => void handleAccessDecision(request.id, "approved")} className="glass-button glass-button-primary">Approve</button>
                    <button type="button" onClick={() => void handleAccessDecision(request.id, "denied")} className="glass-button border border-rose-400/40 text-rose-200">Deny</button>
                  </div>
                ))}
              </div>
              </>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-white">Pending access requests</h2>
                  <p className="mt-1 text-sm text-violet-200">No pending requests for documents you own.</p>
                </div>
                <button type="button" onClick={async () => { const r = await fetch("/api/access-requests", { credentials: "same-origin", cache: "no-store" }); const d = await r.json().catch(() => null); if (r.ok) setAccessRequests((d?.requests ?? []) as AccessRequestRow[]); }} className="glass-button">Refresh</button>
              </div>
            )}
          </section>

          {/* Document workspace */}
          <section
            id="trustvault-documents"
            className={`${glassCard} p-5 sm:p-6`}
          >
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-fuchsia-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-fuchsia-300" />
                  Secure files
                </p>
                <h2 className="text-xl font-bold text-white">
                  Your documents
                </h2>
                <p className="mt-1.5 text-sm text-violet-200">
                  Choose a workspace to view its documents separately.
                </p>
                <label htmlFor="document-organization-filter" className="mt-3 block text-xs font-semibold text-violet-100">
                  Show documents from
                </label>
                <select
                  id="document-organization-filter"
                  value={documentFilterId}
                  onChange={(event) => setDocumentFilterId(event.target.value)}
                  className="mt-1.5 w-full max-w-sm rounded-xl border border-violet-300/30 bg-[#08051b] px-3 py-3 text-sm text-white outline-none focus:border-cyan-300/60"
                >
                  <option value="all">All documents</option>
                  <option value="personal">Personal documents</option>
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>{org.name}</option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="glass-button glass-button-primary"
              >
                {uploading ? (
                  <LoaderCircle size={16} className="animate-spin" />
                ) : (
                  <UploadCloud size={16} />
                )}
                <span>{uploading ? "UploadingÃ¢â‚¬Â¦" : "Upload document"}</span>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={handleFileSelected}
              />
            </div>

            {filteredDocuments.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-violet-300/30 bg-white/[0.03] px-5 py-10 text-center">
                <Files size={30} className="mx-auto text-violet-300" />
                <p className="mt-3 font-semibold text-white">
                  No documents in this workspace
                </p>
                <p className="mt-1 text-sm text-violet-200">
                  Select another workspace, upload a document, or join an organization to see its files.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredDocuments.map((document) => (
                  <div
                    key={document.id}
                    className="flex flex-wrap items-center gap-3 rounded-2xl border border-violet-300/20 bg-white/[0.03] p-4 transition hover:border-fuchsia-300/40"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-300/30 bg-cyan-500/10 text-cyan-200">
                      <Files size={20} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="break-words text-sm font-semibold text-white">
                        {document.title}
                      </p>
                      <p className="mt-1 text-xs text-violet-300">
                        {document.original_filename} Ã‚Â·{" "}
                        {(document.file_size / (1024 * 1024)).toFixed(2)} MB
                        {" Ã‚Â· "}
                        {formatTimestamp(document.created_at)}
                      </p>
                      <p className="mt-2 inline-flex rounded-full border border-cyan-300/20 bg-cyan-300/[0.06] px-2.5 py-1 text-[10px] text-cyan-100">
                        {document.organization_id
                          ? `Organization: ${organizationNameById.get(document.organization_id) ?? "Organization"}`
                          : "Personal document"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleOpenDocument(document)}
                      className="glass-button"
                    >
                      <LockKeyhole size={15} />
                      Open securely
                    </button>
                    {document.owner_id !== userId && document.organization_id && (
                      <button
                        type="button"
                        onClick={() => void handleRequestAccess(document)}
                        className="glass-button"
                      >
                        <Users size={15} /> Request access
                      </button>
                    )}
                    {(document.owner_id === userId || document.can_edit) && (
                      <button type="button" onClick={() => void handleViewVersions(document)} className="glass-button">
                        <History size={15} /> Version history
                      </button>
                    )}
                    {(document.owner_id === userId || document.can_download) && (
                      <button type="button" onClick={() => void handleDownloadDocument(document)} className="glass-button">
                        <ArrowUpRight size={15} /> Download
                      </button>
                    )}
                    {document.owner_id === userId && document.organization_id && (
                      <button type="button" onClick={() => void handleManagePermissions(document)} className="glass-button">
                        <Users size={15} /> Manage access
                      </button>
                    )}
                    {document.owner_id === userId && (
                      <button
                        type="button"
                        onClick={() => void handleDeleteDocument(document)}
                        className="glass-button border border-rose-400/50 text-rose-200 hover:border-rose-300 hover:bg-rose-500/10"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section id="trustvault-audit-trail" className={`${glassCard} mt-5 p-5 sm:p-6`}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-300">Security history</p>
                <h2 className="text-xl font-bold text-white">Audit trail</h2>
                <p className="mt-1 text-sm text-violet-200">Recent activity involving your account and documents you own or share.</p>
              </div>
              <button type="button" onClick={async () => { const r = await fetch("/api/audit-logs", { credentials: "same-origin", cache: "no-store" }); const d = await r.json().catch(() => null); if (r.ok) setAuditLogs((d?.logs ?? []) as AuditLogRow[]); }} className="glass-button">Refresh activity</button>
            </div>
            {auditLogs.length === 0 ? <p className="rounded-xl border border-white/10 p-4 text-sm text-violet-300">No audit events are available yet.</p> : (
              <div className="space-y-2">
                {auditLogs.slice(0, 30).map((log) => (
                  <div key={log.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.025] px-4 py-3">
                    <div className="min-w-0">
                      <p className="break-words text-sm font-semibold text-white">{log.action.replaceAll("_", " ")}</p>
                      <p className="mt-1 text-[11px] text-violet-300">{log.document_id ? `Document ${log.document_id}` : "Account / organization activity"}</p>
                    </div>
                    <time className="text-[11px] text-violet-300">{formatTimestamp(log.created_at)}</time>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section
            id="trustvault-security-settings"
            className={`${glassCard} mt-5 p-5 sm:p-6`}
          >
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-300/40 bg-cyan-500/10 text-cyan-200">
                <Settings size={21} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Security Settings</h2>
                <p className="mt-1 text-sm text-violet-200">
                  Manage your account password and review the protections currently enforced by TrustVault.
                </p>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-violet-300/20 bg-white/[0.03] p-4">
                <h3 className="font-semibold text-white">Change account password</h3>
                <p className="mt-1 text-xs leading-5 text-violet-200">
                  This changes your TrustVault sign-in password. It does not change the separate password for any uploaded document.
                </p>
                <form
                  className="mt-4 space-y-3"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void handleUpdatePassword();
                  }}
                >
                  <label className="block text-xs font-semibold text-violet-100" htmlFor="trustvault-new-password">
                    New account password
                  </label>
                  <input
                    id="trustvault-new-password"
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    maxLength={128}
                    required
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-[#08051b]/70 px-3 py-3 text-sm text-white outline-none focus:border-cyan-300/50"
                    placeholder="At least 8 characters"
                  />
                  <label className="block text-xs font-semibold text-violet-100" htmlFor="trustvault-confirm-password">
                    Confirm new password
                  </label>
                  <input
                    id="trustvault-confirm-password"
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    maxLength={128}
                    required
                    value={confirmNewPassword}
                    onChange={(event) => setConfirmNewPassword(event.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-[#08051b]/70 px-3 py-3 text-sm text-white outline-none focus:border-cyan-300/50"
                    placeholder="Enter the new password again"
                  />
                  <button
                    type="submit"
                    disabled={securityBusy}
                    className="glass-button glass-button-primary disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {securityBusy ? "Updating password..." : "Update account password"}
                  </button>
                </form>
                {securityMessage && (
                  <p role="status" className="mt-3 rounded-xl border border-cyan-300/20 bg-cyan-300/[0.06] p-3 text-sm text-cyan-100">
                    {securityMessage}
                  </p>
                )}
              </div>

              <div className="rounded-2xl border border-violet-300/20 bg-white/[0.03] p-4">
                <h3 className="font-semibold text-white">Active document protections</h3>
                <div className="mt-3 space-y-3 text-sm">
                  <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-3">
                    <div>
                      <p className="font-medium text-white">Document viewing session</p>
                      <p className="mt-1 text-xs leading-5 text-violet-200">Viewing sessions are configured to expire after 10 minutes, subject to the permission grant's expiry.</p>
                    </div>
                    <span className="rounded-full border border-emerald-300/30 bg-emerald-400/10 px-2 py-1 text-xs text-emerald-200">10 minutes</span>
                  </div>
                  <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-3">
                    <div>
                      <p className="font-medium text-white">Private document storage</p>
                      <p className="mt-1 text-xs leading-5 text-violet-200">Documents should be accessed through the protected API rather than public Storage URLs.</p>
                    </div>
                    <span className="rounded-full border border-cyan-300/30 bg-cyan-400/10 px-2 py-1 text-xs text-cyan-200">Configured</span>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-white">Permission enforcement</p>
                      <p className="mt-1 text-xs leading-5 text-violet-200">Owners and approved viewers use different authorization checks. Test each role before using sensitive files.</p>
                    </div>
                    <span className="rounded-full border border-amber-300/30 bg-amber-400/10 px-2 py-1 text-xs text-amber-200">Test required</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleNavigation("Audit Trail")}
                  className="glass-button mt-4"
                >
                  <History size={15} /> Review audit trail
                </button>
              </div>
            </div>
          </section>

          <footer className="flex flex-col gap-3 border-t border-violet-300/20 py-6 text-xs text-violet-300 sm:flex-row sm:items-center sm:justify-between">
            <p>Ã‚Â© 2026 TrustVault Ã‚Â· Secure Document Sharing</p>
            <p className="flex items-center gap-2">
              <CheckCircle2 size={15} className="text-emerald-300" />
              Role verified through Supabase
            </p>
          </footer>
        </section>
      </div>
    </main>
  );
}

