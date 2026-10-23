"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Eye,
  EyeOff,
  Fingerprint,
  FolderLock,
  LockKeyhole,
  ShieldCheck,
  ArrowRight,
  LoaderCircle,
  Sparkles,
  Shield,
  Mail,
  ArrowLeft,
  CheckCircle2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type PageMode = "login" | "signup" | "forgot";

export default function LoginPage() {
  const router = useRouter();

  const [mode, setMode] = useState<PageMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const [error, setError] = useState("");
  const [resetMessage, setResetMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setResetMessage("");
    setLoading(true);

    try {
      const { data, error: authError } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      if (authError || !data.user) {
        setError(
          "Unable to sign in. Please check your email and password."
        );
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Unable to connect. Please check your connection.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setResetMessage("");
    setSuccessMessage("");

    if (password.length < 8) {
      setError("Use a password with at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const { data, error: signupError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { full_name: fullName.trim() },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (signupError) {
        setError(signupError.message);
        return;
      }

      if (data.session) {
        router.push("/dashboard");
        router.refresh();
        return;
      }

      setSuccessMessage("Account registration started. Check your email and click the confirmation link before signing in. If the email does not arrive, check your spam folder.");
    } catch {
      setError("Unable to create your account. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  function openSignup() {
    setMode("signup");
    setError("");
    setResetMessage("");
    setSuccessMessage("");
  }

  async function handleForgotPassword(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setError("");
    setResetMessage("");

    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setError("Please enter your email address.");
      return;
    }

    setResetLoading(true);

    try {
      const { error: resetError } =
        await supabase.auth.resetPasswordForEmail(trimmedEmail, {
          redirectTo: `${window.location.origin}/reset-password`,
        });

      if (resetError) {
        console.error(
          "Password reset request failed:",
          resetError.message
        );

        setError(`Password reset failed: ${resetError.message}`);
        return;
      }

      setResetMessage(
        "If an account exists for this email, a reset link will be sent. Check your inbox and spam folder."
      );
    } catch {
      setError("Unable to connect. Please check your connection.");
    } finally {
      setResetLoading(false);
    }
  }

  function openForgotPassword() {
    setMode("forgot");
    setError("");
    setResetMessage("");
    setSuccessMessage("");
  }

  function openLogin() {
    setMode("login");
    setError("");
    setResetMessage("");
    setSuccessMessage("");
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#050816] px-4 py-10 text-white selection:bg-blue-400/30">
      {/* Premium glass background */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_10%_10%,rgba(59,130,246,0.23),transparent_38%),radial-gradient(ellipse_at_90%_15%,rgba(139,92,246,0.20),transparent_36%),radial-gradient(ellipse_at_50%_100%,rgba(14,165,233,0.13),transparent_42%)]" />

      <div className="pointer-events-none absolute -left-32 top-1/4 h-80 w-80 animate-pulse rounded-full bg-blue-500/[0.08] blur-[110px]" />

      <div className="pointer-events-none absolute -right-24 bottom-1/4 h-80 w-80 animate-pulse rounded-full bg-violet-500/[0.08] blur-[110px]" />

      <div
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.35) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.35) 1px, transparent 1px)",
          backgroundSize: "54px 54px",
        }}
      />

      <div className="relative z-10 grid w-full max-w-6xl overflow-hidden rounded-[32px] border border-white/[0.16] bg-gradient-to-br from-white/[0.10] via-white/[0.045] to-blue-400/[0.035] shadow-[0_30px_100px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.15)] backdrop-blur-3xl lg:grid-cols-[1.05fr_0.95fr]">
        {/* Branding */}
        <section className="relative hidden flex-col justify-between overflow-hidden border-r border-white/[0.10] bg-white/[0.025] p-10 lg:flex xl:p-14">
          <div className="relative flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-300/30 bg-gradient-to-br from-blue-400/20 to-violet-500/10 shadow-[0_0_35px_rgba(59,130,246,0.15)]">
              <FolderLock size={25} className="text-blue-300" />
            </div>

            <div>
              <h1 className="text-xl font-bold tracking-tight">
                Trust<span className="text-blue-300">Vault</span>
              </h1>
              <p className="mt-1 text-[10px] uppercase tracking-[3px] text-slate-400">
                Secure document sharing
              </p>
            </div>
          </div>

          <div className="relative my-12">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/[0.07] px-3 py-2 text-xs text-emerald-200">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Security-focused workspace
            </div>

            <h2 className="max-w-md text-4xl font-semibold leading-[1.15] tracking-tight xl:text-5xl">
              Your documents.
              <br />
              <span className="bg-gradient-to-r from-blue-300 via-sky-200 to-violet-300 bg-clip-text text-transparent">
                Your control.
              </span>
            </h2>

            <p className="mt-6 max-w-md text-sm leading-7 text-slate-400">
              A modern workspace for document access, owner approvals,
              permission management, and traceable activity.
            </p>

            <div className="mt-10 space-y-3">
              {[
                {
                  icon: ShieldCheck,
                  title: "Controlled access",
                  description: "Owner-approved document permissions",
                },
                {
                  icon: Fingerprint,
                  title: "Identity protection",
                  description: "Account-based authentication",
                },
                {
                  icon: LockKeyhole,
                  title: "Activity tracking",
                  description: "Document events and audit history",
                },
              ].map((item) => {
                const Icon = item.icon;

                return (
                  <div
                    key={item.title}
                    className="group flex items-center gap-4 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-blue-300/20 hover:bg-white/[0.05]"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-300/15 bg-blue-400/[0.08]">
                      <Icon size={19} className="text-blue-300" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-200">
                        {item.title}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {item.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="relative flex items-center gap-3 border-t border-white/[0.10] pt-5">
            <Fingerprint size={25} className="text-blue-300" />
            <p className="text-xs leading-5 text-slate-500">
              Designed around identity, authorization, and accountability.
            </p>
          </div>
        </section>

        {/* Login and password recovery */}
        <section className="relative flex items-center justify-center p-6 sm:p-10 lg:p-12 xl:p-14">
          <div className="pointer-events-none absolute right-0 top-0 h-64 w-64 rounded-full bg-blue-400/[0.06] blur-[100px]" />

          <div className="relative w-full max-w-md">
            <div className="mb-9 flex items-center gap-3 lg:hidden">
              <FolderLock size={28} className="text-blue-300" />
              <h1 className="text-xl font-bold">
                Trust<span className="text-blue-300">Vault</span>
              </h1>
            </div>

            {mode === "login" ? (
              <>
                <div className="mb-9">
                  <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.12] bg-gradient-to-br from-white/[0.12] to-white/[0.025] shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]">
                    <LockKeyhole size={25} className="text-blue-300" />
                  </div>

                  <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[2.5px] text-blue-300">
                    <Sparkles size={14} />
                    Welcome back
                  </div>

                  <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                    Sign in to
                    <br />
                    <span className="bg-gradient-to-r from-white via-blue-100 to-slate-400 bg-clip-text text-transparent">
                      TrustVault
                    </span>
                  </h2>

                  <p className="mt-4 text-sm leading-6 text-slate-400">
                    Enter your credentials to continue to your secure workspace.
                  </p>
                </div>

                <form onSubmit={handleLogin} className="space-y-5">
                  <div>
                    <label
                      htmlFor="email"
                      className="mb-2.5 block text-xs font-medium text-slate-300"
                    >
                      Email address
                    </label>
                    <input
                      id="email"
                      type="email"
                      autoComplete="username"
                      required
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="you@example.com"
                      className="w-full rounded-2xl border border-white/[0.10] bg-[#070b16]/65 px-4 py-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-blue-400/60 focus:shadow-[0_0_0_4px_rgba(59,130,246,0.08)]"
                    />
                  </div>

                  <div>
                    <div className="mb-2.5 flex items-center justify-between gap-3">
                      <label
                        htmlFor="password"
                        className="text-xs font-medium text-slate-300"
                      >
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={openForgotPassword}
                        className="text-xs font-medium text-blue-300 transition hover:text-blue-200 hover:underline"
                      >
                        Forgot password?
                      </button>
                    </div>

                    <div className="relative">
                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        required
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="Enter your password"
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

                  {error && (
                    <div role="alert" className="rounded-2xl border border-rose-400/20 bg-rose-400/[0.07] px-4 py-3 text-sm leading-6 text-rose-200">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border border-blue-300/30 bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-500 px-4 py-4 text-sm font-semibold text-white shadow-[0_10px_35px_rgba(37,99,235,0.22)] transition hover:-translate-y-0.5 disabled:opacity-60"
                  >
                    {loading ? (
                      <>
                        <LoaderCircle size={17} className="animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      <>
                        Sign in securely
                        <ArrowRight size={17} />
                      </>
                    )}
                  </button>
                </form>
                <p className="mt-6 text-center text-sm text-slate-400">
                  New to TrustVault?{" "}
                  <button type="button" onClick={openSignup} className="font-semibold text-blue-300 hover:text-blue-200 hover:underline">Create an account</button>
                </p>
              </>
            ) : mode === "signup" ? (
              <>
                <button type="button" onClick={openLogin} className="mb-8 inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white">
                  <ArrowLeft size={16} /> Back to sign in
                </button>
                <div className="mb-8">
                  <div className="mb-3 text-xs font-semibold uppercase tracking-[2.5px] text-blue-300">Create your secure account</div>
                  <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Join <span className="bg-gradient-to-r from-white via-blue-100 to-slate-400 bg-clip-text text-transparent">TrustVault.</span></h2>
                  <p className="mt-4 text-sm leading-6 text-slate-400">Create an account to securely store and share documents.</p>
                </div>
                <form onSubmit={handleSignup} className="space-y-4">
                  <div>
                    <label htmlFor="full-name" className="mb-2 block text-xs font-medium text-slate-300">Full name</label>
                    <input id="full-name" type="text" autoComplete="name" required value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your full name" className="w-full rounded-2xl border border-white/[0.10] bg-[#070b16]/65 px-4 py-3.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-blue-400/60" />
                  </div>
                  <div>
                    <label htmlFor="signup-email" className="mb-2 block text-xs font-medium text-slate-300">Email address</label>
                    <input id="signup-email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" className="w-full rounded-2xl border border-white/[0.10] bg-[#070b16]/65 px-4 py-3.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-blue-400/60" />
                  </div>
                  <div>
                    <label htmlFor="signup-password" className="mb-2 block text-xs font-medium text-slate-300">Password (at least 8 characters)</label>
                    <input id="signup-password" type="password" autoComplete="new-password" minLength={8} required value={password} onChange={e => setPassword(e.target.value)} placeholder="Create a password" className="w-full rounded-2xl border border-white/[0.10] bg-[#070b16]/65 px-4 py-3.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-blue-400/60" />
                  </div>
                  <div>
                    <label htmlFor="confirm-password" className="mb-2 block text-xs font-medium text-slate-300">Confirm password</label>
                    <input id="confirm-password" type="password" autoComplete="new-password" minLength={8} required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Enter password again" className="w-full rounded-2xl border border-white/[0.10] bg-[#070b16]/65 px-4 py-3.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-blue-400/60" />
                  </div>
                  {error && <div role="alert" className="rounded-2xl border border-rose-400/20 bg-rose-400/[0.07] px-4 py-3 text-sm leading-6 text-rose-200">{error}</div>}
                  {successMessage && <div role="status" className="rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.07] px-4 py-3 text-sm leading-6 text-emerald-100">{successMessage}</div>}
                  <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-blue-300/30 bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-500 px-4 py-4 text-sm font-semibold text-white shadow-[0_10px_35px_rgba(37,99,235,0.22)] transition hover:-translate-y-0.5 disabled:opacity-60">
                    {loading ? <><LoaderCircle size={17} className="animate-spin" /> Creating account...</> : <>Create account <ArrowRight size={17} /></>}
                  </button>
                </form>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={openLogin}
                  className="mb-8 inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"
                >
                  <ArrowLeft size={16} />
                  Back to sign in
                </button>

                <div className="mb-8">
                  <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-blue-300/20 bg-blue-400/[0.08]">
                    <Mail size={25} className="text-blue-300" />
                  </div>

                  <div className="mb-3 text-xs font-semibold uppercase tracking-[2.5px] text-blue-300">
                    Account recovery
                  </div>

                  <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                    Reset your
                    <br />
                    <span className="bg-gradient-to-r from-white via-blue-100 to-slate-400 bg-clip-text text-transparent">
                      password.
                    </span>
                  </h2>

                  <p className="mt-4 text-sm leading-6 text-slate-400">
                    Enter your account email to request a password-reset link.
                  </p>
                </div>

                <form onSubmit={handleForgotPassword} className="space-y-5">
                  <div>
                    <label
                      htmlFor="reset-email"
                      className="mb-2.5 block text-xs font-medium text-slate-300"
                    >
                      Email address
                    </label>
                    <input
                      id="reset-email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="you@example.com"
                      className="w-full rounded-2xl border border-white/[0.10] bg-[#070b16]/65 px-4 py-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-blue-400/60 focus:shadow-[0_0_0_4px_rgba(59,130,246,0.08)]"
                    />
                  </div>

                  {error && (
                    <div role="alert" className="rounded-2xl border border-rose-400/20 bg-rose-400/[0.07] px-4 py-3 text-sm leading-6 text-rose-200">
                      {error}
                    </div>
                  )}

                  {resetMessage && (
                    <div role="status" className="flex gap-3 rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.07] px-4 py-3 text-sm leading-6 text-emerald-100">
                      <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-emerald-300" />
                      <span>{resetMessage}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border border-blue-300/30 bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-500 px-4 py-4 text-sm font-semibold text-white shadow-[0_10px_35px_rgba(37,99,235,0.22)] transition hover:-translate-y-0.5 disabled:opacity-60"
                  >
                    {resetLoading ? (
                      <>
                        <LoaderCircle size={17} className="animate-spin" />
                        Sending instructions...
                      </>
                    ) : (
                      <>
                        <Mail size={17} />
                        Send reset instructions
                        <ArrowRight size={17} />
                      </>
                    )}
                  </button>
                </form>

                <div className="mt-7 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4">
                  <div className="flex gap-3">
                    <ShieldCheck size={19} className="mt-0.5 shrink-0 text-emerald-300" />
                    <p className="text-xs leading-5 text-slate-400">
                      For your privacy, this message does not reveal whether an account exists for the email address.
                    </p>
                  </div>
                </div>
              </>
            )}

            <div className="my-7 flex items-center gap-3">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent to-white/[0.12]" />
              <span className="text-[10px] uppercase tracking-[2px] text-slate-500">
                Protected access
              </span>
              <div className="h-px flex-1 bg-gradient-to-l from-transparent to-white/[0.12]" />
            </div>

            <p className="text-center text-[10px] leading-5 text-slate-600">
              TrustVault Â· Secure Document Sharing
              <br />
              Unauthorized access is not permitted.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
