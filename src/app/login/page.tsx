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
} from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { data, error: authError } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      if (authError || !data.user) {
        setError(
          "Unable to sign in. Please check your email and password.",
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

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#050816] px-4 py-10 text-white selection:bg-blue-400/30">
      {/* Background lighting */}

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_10%_10%,rgba(59,130,246,0.23),transparent_38%),radial-gradient(ellipse_at_90%_15%,rgba(139,92,246,0.20),transparent_36%),radial-gradient(ellipse_at_50%_100%,rgba(14,165,233,0.13),transparent_42%)]" />

      <div className="pointer-events-none absolute -left-32 top-1/4 h-80 w-80 animate-pulse rounded-full bg-blue-500/[0.08] blur-[110px]" />

      <div className="pointer-events-none absolute -right-24 bottom-1/4 h-80 w-80 animate-pulse rounded-full bg-violet-500/[0.08] blur-[110px]" />

      {/* Decorative background grid */}

      <div
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.35) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.35) 1px, transparent 1px)",
          backgroundSize: "54px 54px",
        }}
      />

      {/* Main glass panel */}

      <div className="relative z-10 grid w-full max-w-6xl overflow-hidden rounded-[32px] border border-white/[0.16] bg-gradient-to-br from-white/[0.10] via-white/[0.045] to-blue-400/[0.035] shadow-[0_30px_100px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.15)] backdrop-blur-3xl lg:grid-cols-[1.05fr_0.95fr]">
        {/* Left branding section */}

        <section className="relative hidden flex-col justify-between overflow-hidden border-r border-white/[0.10] bg-white/[0.025] p-10 lg:flex xl:p-14">
          <div className="pointer-events-none absolute -right-24 top-20 h-72 w-72 rounded-full border border-blue-300/[0.08]" />

          <div className="pointer-events-none absolute -right-12 top-32 h-48 w-48 rounded-full border border-violet-300/[0.10]" />

          {/* Brand */}

          <div className="relative flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-300/30 bg-gradient-to-br from-blue-400/20 to-violet-500/10 shadow-[0_0_35px_rgba(59,130,246,0.15)]">
              <img src="/trustvault-logo.png" alt="GTrustVault logo" className="h-full w-full object-cover" />
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

          {/* Hero content */}

          <div className="relative my-12">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/[0.07] px-3 py-2 text-xs text-emerald-200 shadow-[0_0_25px_rgba(52,211,153,0.04)]">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>

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

            {/* Feature cards */}

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
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-300/15 bg-blue-400/[0.08] transition-colors group-hover:bg-blue-400/[0.15]">
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

          {/* Footer */}

          <div className="relative flex items-center gap-3 border-t border-white/[0.10] pt-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04]">
              <Fingerprint size={19} className="text-blue-300" />
            </div>

            <p className="text-xs leading-5 text-slate-500">
              Designed around identity, authorization, and accountability.
            </p>
          </div>
        </section>

        {/* Right login section */}

        <section className="relative flex items-center justify-center p-6 sm:p-10 lg:p-12 xl:p-14">
          {/* Subtle light reflection */}

          <div className="pointer-events-none absolute right-0 top-0 h-64 w-64 rounded-full bg-blue-400/[0.06] blur-[100px]" />

          <div className="relative w-full max-w-md">
            {/* Mobile brand */}

            <div className="mb-9 flex items-center gap-3 lg:hidden">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-blue-300/30 bg-blue-400/10">
                <img src="/trustvault-logo.png" alt="GTrustVault logo" className="h-full w-full object-cover" />
              </div>

              <div>
                <h1 className="text-xl font-bold">
                  Trust<span className="text-blue-300">Vault</span>
                </h1>

                <p className="mt-1 text-[10px] uppercase tracking-[2px] text-slate-400">
                  Secure workspace
                </p>
              </div>
            </div>

            {/* Login heading */}

            <div className="mb-9">
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.12] bg-gradient-to-br from-white/[0.12] to-white/[0.025] shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_10px_30px_rgba(0,0,0,0.15)]">
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

            {/* Login form */}

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label
                  htmlFor="email"
                  className="mb-2.5 block text-xs font-medium text-slate-300"
                >
                  Email address
                </label>

                <div className="group relative">
                  <input
                    id="email"
                    type="email"
                    autoComplete="username"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-2xl border border-white/[0.10] bg-[#070b16]/65 px-4 py-4 text-sm text-white outline-none transition-all duration-300 placeholder:text-slate-600 hover:border-white/[0.18] focus:border-blue-400/60 focus:bg-blue-950/20 focus:shadow-[0_0_0_4px_rgba(59,130,246,0.08),0_0_25px_rgba(59,130,246,0.05)]"
                  />

                  <div className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.12] to-transparent" />
                </div>
              </div>

              <div>
                <div className="mb-2.5 flex items-center justify-between gap-3">
                  <label
                    htmlFor="password"
                    className="text-xs font-medium text-slate-300"
                  >
                    Password
                  </label>

                  <span className="flex items-center gap-1.5 text-[10px] text-slate-500">
                    <Shield size={12} />
                    Authorized users only
                  </span>
                </div>

                <div className="group relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter your password"
                    className="w-full rounded-2xl border border-white/[0.10] bg-[#070b16]/65 px-4 py-4 pr-12 text-sm text-white outline-none transition-all duration-300 placeholder:text-slate-600 hover:border-white/[0.18] focus:border-blue-400/60 focus:bg-blue-950/20 focus:shadow-[0_0_0_4px_rgba(59,130,246,0.08),0_0_25px_rgba(59,130,246,0.05)]"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-xl p-2 text-slate-400 transition hover:bg-white/[0.08] hover:text-white"
                  >
                    {showPassword ? (
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

              {/* Sign-in button */}

              <button
                type="submit"
                disabled={loading}
                className="group relative mt-2 flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl border border-blue-300/30 bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-500 px-4 py-4 text-sm font-semibold text-white shadow-[0_10px_35px_rgba(37,99,235,0.22),inset_0_1px_0_rgba(255,255,255,0.22)] transition-all duration-300 hover:-translate-y-0.5 hover:border-blue-200/50 hover:shadow-[0_15px_40px_rgba(37,99,235,0.32),inset_0_1px_0_rgba(255,255,255,0.3)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/[0.12] to-transparent transition-transform duration-700 group-hover:translate-x-full" />

                {loading ? (
                  <>
                    <LoaderCircle size={17} className="animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign in securely
                    <ArrowRight
                      size={17}
                      className="transition-transform duration-300 group-hover:translate-x-1"
                    />
                  </>
                )}
              </button>
            </form>

            {/* Divider */}

            <div className="my-7 flex items-center gap-3">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent to-white/[0.12]" />

              <span className="text-[10px] uppercase tracking-[2px] text-slate-500">
                Protected access
              </span>

              <div className="h-px flex-1 bg-gradient-to-l from-transparent to-white/[0.12]" />
            </div>

            {/* Security note */}

            <div className="rounded-2xl border border-white/[0.08] bg-gradient-to-br from-white/[0.055] to-white/[0.015] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
              <div className="flex gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-emerald-300/15 bg-emerald-300/[0.07]">
                  <ShieldCheck size={18} className="text-emerald-300" />
                </div>

                <div>
                  <p className="text-xs font-medium text-slate-200">
                    Identity and permissions matter
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Your account determines your access. Roles and permissions
                    must be enforced by the server.
                  </p>
                </div>
              </div>
            </div>

            <p className="mt-8 text-center text-[10px] leading-5 text-slate-600">
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
