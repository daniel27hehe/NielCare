"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserCircle2, Stethoscope, Briefcase, ChevronRight, X } from "lucide-react";

type Role = "patient" | "doctor" | "owner";

const roles = [
  {
    id: "patient" as Role,
    label: "Patient",
    sub: "Booking & consultation",
    icon: <UserCircle2 className="h-7 w-7" />,
    color: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-200 hover:border-emerald-500",
    dot: "bg-emerald-500",
    showRegister: true,
  },
  {
    id: "doctor" as Role,
    label: "Doctor",
    sub: "Manage schedule & patients",
    icon: <Stethoscope className="h-7 w-7" />,
    color: "text-blue-700",
    bg: "bg-blue-50",
    border: "border-blue-200 hover:border-blue-500",
    dot: "bg-blue-500",
    showRegister: false,
  },
  {
    id: "owner" as Role,
    label: "Owner",
    sub: "Clinic management",
    icon: <Briefcase className="h-7 w-7" />,
    color: "text-purple-700",
    bg: "bg-purple-50",
    border: "border-purple-200 hover:border-purple-500",
    dot: "bg-purple-500",
    showRegister: false,
  },
];

export default function IntroPage() {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: "linear-gradient(145deg, #edeef6 0%, #e8eaf2 50%, #eaecf5 100%)" }}
    >
      {/* Center content */}
      <div className="text-center select-none">
        <div className="mb-10">
          <h1
            className="text-4xl md:text-5xl font-semibold mb-4 tracking-tight"
            style={{ color: "#1a4a35", fontFamily: "'Georgia', 'Times New Roman', serif" }}
          >
            Your Smile, Our Priority
          </h1>
          <h3 className="text-lg md:text-xl text-slate-500 font-medium max-w-lg mx-auto">
            Welcome to NielCare. Get the best dental care easily, quickly, and professionally.
          </h3>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-12 py-3.5 rounded-full text-white font-medium text-base transition-all duration-200 hover:opacity-90 hover:scale-105 active:scale-95 shadow-md"
          style={{ background: "#1a4a35" }}
        >
          Start
        </button>
      </div>

      {/* Role Selection Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.25)", backdropFilter: "blur(4px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}
        >
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 relative animate-fade-in">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <h2
              className="text-xl font-semibold text-center mb-1"
              style={{ color: "#1a4a35" }}
            >
              Login As
            </h2>
            <p className="text-sm text-slate-400 text-center mb-6">Choose your role</p>

            <div className="space-y-3">
              {roles.map((role) => (
                <div key={role.id} className="space-y-1">
                  <button
                    onClick={() => router.push(`/login?role=${role.id}`)}
                    className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all duration-150 group ${role.bg} ${role.border}`}
                  >
                    <div className={`${role.color} opacity-80 group-hover:opacity-100`}>
                      {role.icon}
                    </div>
                    <div className="text-left flex-1">
                      <p className={`font-semibold text-sm ${role.color}`}>{role.label}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{role.sub}</p>
                    </div>
                    <ChevronRight className={`h-4 w-4 ${role.color} opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all`} />
                  </button>

                  {role.showRegister && (
                    <p className="text-xs text-center text-slate-400 pb-1">
                      Don't have an account?{" "}
                      <button
                        onClick={() => { setShowModal(false); router.push("/register"); }}
                        className="font-semibold hover:underline"
                        style={{ color: "#1a4a35" }}
                      >
                        Register here
                      </button>
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
