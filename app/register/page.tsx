"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Loader2, AlertCircle, ArrowRight, Eye, EyeOff, CheckCircle2, XCircle, Globe } from "lucide-react";

import { useForm, Controller, useWatch } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const passwordRules = [
  { id: "length",  label: "Min. 8 characters",       test: (v: string) => v.length >= 8 },
  { id: "upper",   label: "Uppercase letter (A-Z)",    test: (v: string) => /[A-Z]/.test(v) },
  { id: "lower",   label: "Lowercase letter (a-z)",      test: (v: string) => /[a-z]/.test(v) },
  { id: "number",  label: "Number (0-9)",             test: (v: string) => /[0-9]/.test(v) },
  { id: "special", label: "Special character (!@#)", test: (v: string) => /[^a-zA-Z0-9]/.test(v) },
];

const registerSchema = z.object({
  full_name: z.string().min(2, "Minimum 2 characters").regex(/^[a-zA-Z\s'-]+$/, "Cannot contain numbers"),
  username: z.string().min(3, "Min. 3 characters").max(20, "Max. 20 characters").regex(/^[a-z0-9_]+$/, "Lowercase, numbers, underscore only"),
  email: z.string().email("Invalid email format").regex(/^[^A-Z]+$/, "Email cannot contain uppercase letters"),
  phone: z.string().optional().refine((v) => !v || /^[0-9+\-\s()]*$/.test(v), "Cannot contain letters"),
  gender: z.enum(["male", "female"], { message: "Select gender" }),
  date_of_birth: z.string().optional(),
  password: z.string()
    .min(8, "Min. 8 characters")
    .regex(/[A-Z]/, "Must contain an uppercase letter")
    .regex(/[a-z]/, "Must contain a lowercase letter")
    .regex(/[0-9]/, "Must contain a number")
    .regex(/[^a-zA-Z0-9]/, "Must contain a special character"),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, { message: "Passwords do not match", path: ["confirmPassword"] });

type RegisterForm = z.infer<typeof registerSchema>;

// Shared input style
function GreenInput({
  id, type = "text", placeholder, hasError, inputMode, children, ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { hasError?: boolean }) {
  return (
    <div className="relative">
      <input
        id={id}
        type={type}
        placeholder={placeholder}
        inputMode={inputMode as React.HTMLAttributes<HTMLInputElement>["inputMode"]}
        className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
        style={{
          background: "#e8f0ea",
          color: "#1a4a35",
          border: hasError ? "1.5px solid #f87171" : "1.5px solid transparent",
        }}
        onFocus={(e) => { e.target.style.border = "1.5px solid #1a4a35"; }}
        onBlur={(e) => { e.target.style.border = hasError ? "1.5px solid #f87171" : "1.5px solid transparent"; }}
        autoComplete="off"
        {...props}
      />
      {children}
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-[11px] font-semibold tracking-widest text-slate-500 uppercase block mb-1.5">
      {children}
    </label>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div className="flex items-center gap-1 mt-1">
      <AlertCircle className="h-3 w-3 text-red-500 shrink-0" />
      <p className="text-xs text-red-500">{message}</p>
    </div>
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClient();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, control, formState: { errors }, setValue } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    mode: "onChange",
  });

  const watchedPassword = useWatch({ control, name: "password", defaultValue: "" });
  const watchedFullName = useWatch({ control, name: "full_name", defaultValue: "" });
  const watchedEmail    = useWatch({ control, name: "email", defaultValue: "" });
  const watchedPhone    = useWatch({ control, name: "phone", defaultValue: "" });

  const fullNameHasNumber = /[0-9]/.test(watchedFullName ?? "");
  const emailHasUpper     = /[A-Z]/.test(watchedEmail ?? "");
  const phoneHasLetter    = /[a-zA-Z]/.test(watchedPhone ?? "");

  const onSubmit = async (data: RegisterForm) => {
    setLoading(true);
    setServerError("");

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
    });

    if (authError) {
      if (authError.message.toLowerCase().includes("security purposes") || authError.message.toLowerCase().includes("after")) {
        setServerError("Please wait a few seconds and try again.");
      } else if (authError.message.toLowerCase().includes("already registered")) {
        setServerError("Email is already registered. Please login.");
      } else {
        setServerError(authError.message);
      }
      setLoading(false);
      return;
    }

    if (!authData.user) {
      setServerError("Registration failed. Please try again.");
      setLoading(false);
      return;
    }

    // Step 2: Insert profile via API route (uses service_role — bypasses RLS)
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: authData.user.id,
        email: data.email,
        username: data.username,
        full_name: data.full_name,
        phone: data.phone || null,
        gender: data.gender,
        date_of_birth: data.date_of_birth || null,
      }),
    });

    const result = await res.json();

    if (!res.ok) {
      setServerError(result.error || "Failed to save profile. Please try again.");
      setLoading(false);
      return;
    }

    router.push("/patient/dashboard");
    router.refresh();
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "#f0f1f5" }}>
      <div className="w-full max-w-4xl rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row" style={{ minHeight: 520 }}>

        {/* ── Left Panel: Form ── */}
        <div className="flex-1 bg-white px-10 py-8 flex flex-col justify-center overflow-y-auto relative">


          {/* Brand */}
          <div className="mb-6 mt-4 md:mt-0">
            <h1 className="text-3xl font-bold" style={{ color: "#1a4a35" }}>Create New Account</h1>
            <p className="text-sm text-slate-400 mt-0.5 tracking-wide">Start your dental health journey today</p>
          </div>

          {/* Error */}
          {serverError && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 mb-4">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" autoComplete="off">
            {/* Row 1: Full Name + Username */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <FieldLabel>Full Name</FieldLabel>
                <GreenInput
                  id="full_name"
                  placeholder="Andi Daniel"
                  hasError={!!errors.full_name || fullNameHasNumber}
                  {...register("full_name")}
                  onChange={(e) => setValue("full_name", e.target.value.replace(/[0-9]/g, ""), { shouldValidate: true })}
                />
                {fullNameHasNumber
                  ? <FieldError message="⚠ Cannot contain numbers!" />
                  : <FieldError message={errors.full_name?.message} />}
              </div>
              <div>
                <FieldLabel>Username</FieldLabel>
                <GreenInput
                  id="username"
                  placeholder="niel27"
                  hasError={!!errors.username}
                  {...register("username")}
                  onChange={(e) => setValue("username", e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""), { shouldValidate: true })}
                />
                <FieldError message={errors.username?.message} />
              </div>
            </div>

            {/* Email */}
            <div>
              <FieldLabel>Email Address</FieldLabel>
              <GreenInput
                id="email"
                type="text"
                inputMode="email"
                placeholder="daniel@gmail.com"
                hasError={!!errors.email || emailHasUpper}
                {...register("email")}
                onChange={(e) => setValue("email", e.target.value.replace(/[A-Z]/g, c => c.toLowerCase()), { shouldValidate: true })}
              />
              {emailHasUpper
                ? <FieldError message="⚠ Uppercase letters not allowed!" />
                : <FieldError message={errors.email?.message} />}
            </div>

            {/* Row 2: Email + Phone */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <FieldLabel>Phone Number</FieldLabel>
                <GreenInput
                  id="phone"
                  inputMode="tel"
                  placeholder="+628..."
                  hasError={!!errors.phone || phoneHasLetter}
                  {...register("phone")}
                  onChange={(e) => setValue("phone", e.target.value.replace(/[a-zA-Z]/g, ""), { shouldValidate: true })}
                />
                {phoneHasLetter
                  ? <FieldError message="⚠ Cannot contain letters!" />
                  : <FieldError message={errors.phone?.message} />}
              </div>
              <div>
                <FieldLabel>Gender</FieldLabel>
                <Controller
                  control={control}
                  name="gender"
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger
                        className="w-full rounded-xl h-[46px] text-sm border-0"
                        style={{ background: "#e8f0ea", color: "#1a4a35" }}
                      >
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                <FieldError message={errors.gender?.message} />
              </div>
            </div>

            {/* Date of Birth */}
            <div>
              <FieldLabel>Date of Birth</FieldLabel>
              <GreenInput id="date_of_birth" type="date" {...register("date_of_birth")} />
            </div>

            {/* Password */}
            <div>
              <FieldLabel>Password</FieldLabel>
              <GreenInput
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                hasError={!!errors.password}
                {...register("password")}
              >
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </GreenInput>

              {/* Password strength checklist */}
              {(watchedPassword?.length ?? 0) > 0 && (
                <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 px-1">
                  {passwordRules.map((rule) => {
                    const ok = rule.test(watchedPassword ?? "");
                    return (
                      <div key={rule.id} className={`flex items-center gap-1 text-xs ${ok ? "text-emerald-600" : "text-slate-400"}`}>
                        {ok ? <CheckCircle2 className="h-3 w-3 text-emerald-500" /> : <XCircle className="h-3 w-3 text-slate-300" />}
                        {rule.label}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <FieldLabel>Confirm Password</FieldLabel>
              <GreenInput
                id="confirmPassword"
                type={showConfirm ? "text" : "password"}
                placeholder="••••••••"
                hasError={!!errors.confirmPassword}
                {...register("confirmPassword")}
              >
                <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </GreenInput>
              <FieldError message={errors.confirmPassword?.message} />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm text-white transition-all hover:opacity-90 active:scale-95"
              style={{ background: "#1a4a35" }}
            >
              {loading
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Registering...</>
                : <>Register Now <ArrowRight className="h-4 w-4" /></>}
            </button>
          </form>

          <div className="mt-4 text-center space-y-1">
            <p className="text-xs text-slate-400">
              Already have an account?{" "}
              <Link href="/login" className="font-semibold hover:underline" style={{ color: "#1a4a35" }}>
                Login here
              </Link>
            </p>
            <button type="button" onClick={() => router.push("/")} className="text-xs text-slate-300 hover:text-slate-500 transition-colors">
              ← Back to Home
            </button>
          </div>
        </div>

        {/* ── Right Panel: Modern Graphics ── */}
        <div
          className="w-full md:w-80 relative overflow-hidden hidden md:flex flex-col items-center justify-center p-8 text-center"
          style={{ background: "#1a4a35" }}
        >  <div className="absolute inset-0">
            <div className="absolute" style={{ width: 280, height: 280, background: "rgba(255,255,255,0.06)", borderRadius: 24, top: -60, right: -80, transform: "rotate(-30deg)" }} />
            <div className="absolute" style={{ width: 200, height: 200, background: "rgba(255,255,255,0.05)", borderRadius: 20, top: "30%", left: "10%", transform: "rotate(15deg)" }} />
            <div className="absolute" style={{ width: 130, height: 130, background: "rgba(255,255,255,0.08)", borderRadius: 16, bottom: -30, left: -20, transform: "rotate(-20deg)" }} />
            <div className="absolute" style={{ width: 160, height: 160, background: "rgba(72,180,140,0.15)", borderRadius: 20, top: "20%", right: -40, transform: "rotate(25deg)" }} />
          </div>
        </div>
      </div>
    </div>
  );
}
