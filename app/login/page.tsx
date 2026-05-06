"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Loader2, AlertCircle, ArrowRight, Eye, EyeOff, Globe } from "lucide-react";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const loginSchema = z.object({
  email: z.string().email("Format email tidak valid"),
  password: z.string().min(1, "Password wajib diisi"),
});

type LoginForm = z.infer<typeof loginSchema>;

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const role = searchParams.get("role") || "patient";
  const message = searchParams.get("message");

  const supabase = createClient();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);


  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  // Role-based styling
  const isDoctor = role === "doctor";
  const isOwner = role === "owner";

  let primaryColor = "#1a4a35"; // Default Patient (Green)
  let inputBg = "#e8f0ea";
  let overlayColor1 = "rgba(72,180,140,0.15)";
  
  if (isDoctor) {
    primaryColor = "#1e40af"; // Blue
    inputBg = "#eff6ff";
    overlayColor1 = "rgba(59,130,246,0.15)";
  } else if (isOwner) {
    primaryColor = "#6b21a8"; // Purple
    inputBg = "#faf5ff";
    overlayColor1 = "rgba(168,85,247,0.15)";
  }

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    setError("");

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (authError) {
      setError("Email atau password salah. Silakan coba lagi.");
      setLoading(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();

      const userRole = profile?.role || "patient";
      router.push(`/${userRole}/dashboard`);
      router.refresh();
    }
    setLoading(false);
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: "#f0f1f5" }}
    >
      <div className="w-full max-w-3xl rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row" style={{ minHeight: 420 }}>
        
        {/* ── Left Panel: Form ── */}
        <div className="flex-1 bg-white px-12 py-10 flex flex-col justify-center relative">


          <div className="mb-8 mt-4 sm:mt-0">
            <h1 className="text-3xl font-bold capitalize" style={{ color: primaryColor }}>Login {role === "patient" ? "" : role}</h1>
            <p className="text-sm text-slate-400 mt-0.5 tracking-wide">NielCare Clinical Excellence</p>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 mb-4">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {message && !error && (
            <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 mb-4">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" autoComplete="off">
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold tracking-widest text-slate-500 uppercase">
                Email Address
              </label>
              <input
                type="email"
                placeholder="daniel@gmail.com"
                autoComplete="off"
                {...register("email")}
                className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
                style={{
                  background: inputBg,
                  color: primaryColor,
                  border: errors.email ? "1.5px solid #f87171" : "1.5px solid transparent",
                }}
                onFocus={(e) => { e.target.style.border = `1.5px solid ${primaryColor}`; }}
                onBlur={(e) => { e.target.style.border = errors.email ? "1.5px solid #f87171" : "1.5px solid transparent"; }}
              />
              {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold tracking-widest text-slate-500 uppercase">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  {...register("password")}
                  className="w-full px-4 py-3 rounded-xl text-sm pr-10 outline-none transition-all"
                  style={{
                    background: inputBg,
                    color: primaryColor,
                    border: errors.password ? "1.5px solid #f87171" : "1.5px solid transparent",
                  }}
                  onFocus={(e) => { e.target.style.border = `1.5px solid ${primaryColor}`; }}
                  onBlur={(e) => { e.target.style.border = errors.password ? "1.5px solid #f87171" : "1.5px solid transparent"; }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm text-white transition-all hover:opacity-90 active:scale-95 mt-2"
              style={{ background: primaryColor }}
            >
              {loading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Logging in...</>
              ) : (
                <>Login <ArrowRight className="h-4 w-4" /></>
              )}
            </button>
          </form>

          <div className="mt-6 text-center space-y-1">
            {!isDoctor && !isOwner && (
              <p className="text-xs text-slate-400 mb-2">
                Don't have an account?{" "}
                <Link href="/register" className="font-semibold hover:underline" style={{ color: primaryColor }}>
                  Register as Patient
                </Link>
              </p>
            )}
            <button onClick={() => router.push("/")} className="text-xs text-slate-300 hover:text-slate-500 transition-colors mt-2">
              ← Back
            </button>
          </div>
        </div>

        {/* ── Right Panel: Abstract Geometric (No Text) ── */}
        <div
          className="w-full md:w-80 relative overflow-hidden hidden md:flex items-center justify-center"
          style={{ background: primaryColor }}
        >
          <div className="absolute inset-0">
            <div
              className="absolute"
              style={{
                width: 300,
                height: 300,
                background: "rgba(255,255,255,0.06)",
                borderRadius: 24,
                top: -60,
                right: -80,
                transform: "rotate(-30deg)",
              }}
            />
            <div
              className="absolute"
              style={{
                width: 220,
                height: 220,
                background: "rgba(255,255,255,0.05)",
                borderRadius: 20,
                top: "30%",
                left: "10%",
                transform: "rotate(15deg)",
              }}
            />
            <div
              className="absolute"
              style={{
                width: 140,
                height: 140,
                background: "rgba(255,255,255,0.08)",
                borderRadius: 16,
                bottom: -30,
                left: -20,
                transform: "rotate(-20deg)",
              }}
            />
            <div
              className="absolute"
              style={{
                width: 180,
                height: 180,
                background: overlayColor1,
                borderRadius: 20,
                top: "20%",
                right: -40,
                transform: "rotate(25deg)",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f0f1f5] flex items-center justify-center"><Loader2 className="animate-spin text-emerald-600" /></div>}>
      <LoginFormContent />
    </Suspense>
  );
}
