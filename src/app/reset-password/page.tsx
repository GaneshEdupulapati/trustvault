"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LockKeyhole,
  ShieldCheck,
  Eye,
  EyeOff,
  LoaderCircle,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [checkingSession, setCheckingSession] = useState(true);
  const [validSession, setValidSession] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function initializeRecovery() {
      try {
        const currentUrl = new URL(window.location.href);

        const queryError = currentUrl.searchParams.get("error_description");
        const hashParams = new URLSearchParams(
          currentUrl.hash.replace(/^#/, "")
        );

        const hashError = hashParams.get("error_description");
        const recoveryError = queryError || hashError;

        if (recoveryError) {
          throw new Error(recoveryError.replace(/\+/g, " "));
        }

        // PKCE flow: exchange the recovery code for a session.
        const code = currentUrl.searchParams.get("code");

        if (code) {
          const { error: exchangeError } =
            await supabase.auth.exchangeCodeForSession(code);

          if (exchangeError) {
            throw exchangeError;
          }

          // Remove the one-time code from the browser URL.
          window.history.replaceState(
            null,
            "",
            currentUrl.pathname
          );
        } else {
          // Hash-token flow: establish the recovery session.
          const accessToken = hashParams.get("access_token");
          const refreshToken = hashParams.get("refresh_token");
          const recoveryType = hashParams.get("type");

          if (
            accessToken &&
            refreshToken &&
            recoveryType === "recovery"
          ) {
            const { error: sessionError } =
              await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              });

            if (sessionError) {
              throw sessionError;
            }

            window.history.replaceState(
              null,
              "",
              currentUrl.pathname
            );
          }
        }

        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (!mounted) return;

        if (sessionError) {
          throw sessionError;
        }

        if (!session) {
          setValidSession(false);
          setError(
            "Your reset link is invalid, expired, or already used. Request a new password-reset email."
          );
        } else {
          setValidSession(true);
          setError("");
        }
      } catch (err: unknown) {
        if (!mounted) return;

        setValidSession(false);
        setError(
          err instanceof Error
            ? err.message
            : "Unable to verify your password-reset link."
        );
      } finally {
        if (mounted) {
          setCheckingSession(false);
        }
      }
    }

    initializeRecovery();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      if (
        (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") &&
        session
      ) {
        setValidSession(true);
        setError("");
        setCheckingSession(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleResetPassword(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Your password must contain at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }

    if (!validSession) {
      setError("Your recovery session has expired. Request a new link.");
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } =
        await supabase.auth.updateUser({ password });

      if (updateError) {
        setError(updateError.message);
        return;
      }

      setSuccess(true);
      setPassword("");
      setConfirmPassword("");
    } catch {
      setError("Unable to update your password. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#050816] px-4 py-10 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_10%_10%,rgba(59,130,246,0.23),transparent_38%),radial-gradient(ellipse_at_90%_15%,rgba(139,92,246,0.20),transparent_36%),radial-gradient(ellipse_at_50%_100%,rgba(14,165,233,0.13),transparent_42%)]" />

      <div
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.35) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.35) 1px, transparent 1px)",
          backgroundSize: "54px 54px",
        }}
      />

      <section className="relative w-full max-w-lg rounded-[32px] border border-white/[0.16] bg-gradient-to-br from-white/[0.10] via-white/[0.045] to-blue-400/[0.035] p-7 shadow-[0_30px_100px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.15)] backdrop-blur-3xl sm:p-10">
        <button
          type="button"
          onClick={() => router.push("/login")}
          className="mb-8 inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"
        >
          <ArrowLeft size={16} />
          Back to sign in
        </button>

        <div className="mb-7 flex h-14 w-14 items-center justify-center rounded-2xl border border-blue-300/20 bg-blue-400/[0.08]">
          <LockKeyhole size={26} className="text-blue-300" />
        </div>

        <p className="mb-3 text-xs font-semibold uppercase tracking-[2.5px] text-blue-300">
          Account security
        </p>

        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Create a new
          <br />
          <span className="bg-gradient-to-r from-white via-blue-100 to-slate-400 bg-clip-text text-transparent">
            password.
          </span>
        </h1>

        <p className="mt-4 text-sm leading-6 text-slate-400">
          Choose a new password to secure your TrustVault account.
        </p>

        {checkingSession ? (
          <div className="mt-8 flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4 text-sm text-slate-300">
            <LoaderCircle size={18} className="animate-spin text-blue-300" />
            Verifying your reset link...
          </div>
        ) : success ? (
          <div className="mt-8 space-y-5">
            <div className="flex gap-3 rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.07] p-4">
              <CheckCircle2
                size={22}
                className="mt-0.5 shrink-0 text-emerald-300"
              />
              <div>
                <p className="font-medium text-emerald-100">
                  Password updated successfully!
                </p>
                <p className="mt-2 text-sm leading-6 text-emerald-100/70">
                  Your new password has been saved. You can now sign in.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => router.push("/login")}
              className="w-full rounded-2xl border border-blue-300/30 bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-500 px-4 py-4 text-sm font-semibold transition hover:-translate-y-0.5"
            >
              Continue to sign in
            </button>
          </div>
        ) : !validSession ? (
          <div className="mt-8 space-y-5">
            <div className="flex gap-3 rounded-2xl border border-rose-400/20 bg-rose-400/[0.07] p-4">
              <AlertCircle
                size={21}
                className="mt-0.5 shrink-0 text-rose-300"
              />
              <p className="text-sm leading-6 text-rose-200">
                {error ||
                  "Your reset link is invalid or expired. Please request a new link."}
              </p>
            </div>

            <button
              type="button"
              onClick={() => router.push("/login")}
              className="w-full rounded-2xl border border-blue-300/30 bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-500 px-4 py-4 text-sm font-semibold transition hover:-translate-y-0.5"
            >
              Return to login
            </button>
          </div>
        ) : (
          <form onSubmit={handleResetPassword} className="mt-8 space-y-5">
            <div>
              <label
                htmlFor="new-password"
                className="mb-2.5 block text-xs font-medium text-slate-300"
              >
                New password
              </label>

              <div className="relative">
                <input
                  id="new-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  minLength={8}
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter a new password"
                  className="w-full rounded-2xl border border-white/[0.10] bg-[#070b16]/65 px-4 py-4 pr-12 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-blue-400/60 focus:shadow-[0_0_0_4px_rgba(59,130,246,0.08)]"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-xl p-2 text-slate-400 hover:bg-white/[0.08] hover:text-white"
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor="confirm-password"
                className="mb-2.5 block text-xs font-medium text-slate-300"
              >
                Confirm new password
              </label>

              <div className="relative">
                <input
                  id="confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  minLength={8}
                  required
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Re-enter your new password"
                  className="w-full rounded-2xl border border-white/[0.10] bg-[#070b16]/65 px-4 py-4 pr-12 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-blue-400/60 focus:shadow-[0_0_0_4px_rgba(59,130,246,0.08)]"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowConfirmPassword(!showConfirmPassword)
                  }
                  aria-label={
                    showConfirmPassword
                      ? "Hide confirmation"
                      : "Show confirmation"
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-xl p-2 text-slate-400 hover:bg-white/[0.08] hover:text-white"
                >
                  {showConfirmPassword ? (
                    <EyeOff size={17} />
                  ) : (
                    <Eye size={17} />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-2xl border border-rose-400/20 bg-rose-400/[0.07] px-4 py-3 text-sm leading-6 text-rose-200"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-blue-300/30 bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-500 px-4 py-4 text-sm font-semibold shadow-[0_10px_35px_rgba(37,99,235,0.22)] transition hover:-translate-y-0.5 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <LoaderCircle size={17} className="animate-spin" />
                  Updating password...
                </>
              ) : (
                <>
                  <ShieldCheck size={17} />
                  Update password
                </>
              )}
            </button>
          </form>
        )}

        <div className="mt-8 flex items-start gap-3 border-t border-white/[0.08] pt-5">
          <ShieldCheck
            size={18}
            className="mt-0.5 shrink-0 text-emerald-300"
          />
          <p className="text-xs leading-5 text-slate-500">
            Never share your password or password-reset link with anyone.
          </p>
        </div>
      </section>
    </main>
  );
}