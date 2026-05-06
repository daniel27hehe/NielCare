"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import type { User } from "@/types";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { getInitials } from "@/lib/utils/formatters";

import {
  Menu,
  X,
  LogOut,
  Stethoscope,
  LayoutDashboard,
  CalendarDays,
  History,
  User as UserIcon,
  Users,
  Clock,
  CalendarCheck,
  FileBarChart
} from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    async function getUser() {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        const { data } = await supabase
          .from("users")
          .select("*")
          .eq("id", authUser.id)
          .single();
        if (data) {
          setUser(data as User);
        } else {
          const pathRole = pathname.startsWith("/owner") ? "owner"
            : pathname.startsWith("/doctor") ? "doctor"
            : "patient";
          setUser({
            id: authUser.id,
            email: authUser.email || "",
            role: authUser.user_metadata?.role || pathRole,
            full_name: authUser.user_metadata?.full_name || authUser.email?.split("@")[0] || "User",
          } as User);
        }
      }
    }
    getUser();
  }, [pathname]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  const roleLinks: Record<string, { label: string; href: string, icon: React.ElementType }[]> = {
    patient: [
      { label: "Beranda", href: "/patient/dashboard", icon: LayoutDashboard },
      { label: "Buat Janji", href: "/patient/book", icon: CalendarPlus },
      { label: "Riwayat", href: "/patient/appointments", icon: History },
      { label: "Profil Saya", href: "/patient/profile", icon: UserIcon },
    ],
    doctor: [
      { label: "Beranda", href: "/doctor/dashboard", icon: LayoutDashboard },
      { label: "Janji Temu", href: "/doctor/appointments", icon: CalendarDays },
      { label: "Daftar Pasien", href: "/doctor/patients", icon: Users },
      { label: "Jadwal", href: "/doctor/schedule", icon: CalendarCheck },
      { label: "Ketersediaan", href: "/doctor/availability", icon: Clock },
    ],
    owner: [
      { label: "Beranda", href: "/owner/dashboard", icon: LayoutDashboard },
      { label: "Daftar Dokter", href: "/owner/doctors", icon: Stethoscope },
      { label: "Laporan Klinik", href: "/owner/reports", icon: FileBarChart },
    ],
  };

  const links = user ? roleLinks[user.role] || [] : [];

  let themeColor = "green";
  if (user?.role === "doctor") themeColor = "blue";
  if (user?.role === "owner") themeColor = "purple";

  const colorStyles = {
    green: {
      text: "text-green-700",
      bg: "bg-green-50",
      hover: "hover:bg-green-50 hover:text-green-700",
      gradient: "from-green-500 to-emerald-600",
      textGradient: "from-green-600 to-emerald-600",
    },
    blue: {
      text: "text-blue-700",
      bg: "bg-blue-50",
      hover: "hover:bg-blue-50 hover:text-blue-700",
      gradient: "from-blue-500 to-indigo-600",
      textGradient: "from-blue-600 to-indigo-600",
    },
    purple: {
      text: "text-purple-700",
      bg: "bg-purple-50",
      hover: "hover:bg-purple-50 hover:text-purple-700",
      gradient: "from-purple-500 to-fuchsia-600",
      textGradient: "from-purple-600 to-fuchsia-600",
    }
  };

  const theme = colorStyles[themeColor as keyof typeof colorStyles];

  return (
    <>
      {/* GLOBAL STYLE TO PUSH MAIN CONTENT ON DESKTOP */}
      <style dangerouslySetInnerHTML={{__html: `
        @media (min-width: 768px) {
          main {
            margin-left: 16rem !important; /* 64 = 16rem */
            max-width: calc(100% - 16rem) !important;
            padding-left: 2rem !important;
            padding-right: 2rem !important;
          }
        }
      `}} />

      {/* MOBILE NAVBAR HEADER */}
      <div className="md:hidden sticky top-0 z-40 w-full border-b border-slate-200 bg-white/80 backdrop-blur-lg px-4 h-16 flex items-center justify-between">
        <Link href={user ? `/${user.role}/dashboard` : "/login"} className="flex items-center gap-2">
          <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br ${colorStyles.green.gradient} shadow-sm`}>
            <Stethoscope className="h-4 w-4 text-white" />
          </div>
          <span className={`text-lg font-bold bg-gradient-to-r ${colorStyles.green.textGradient} bg-clip-text text-transparent`}>
            NielCare
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 rounded-lg text-slate-600 hover:bg-slate-100">
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* SIDEBAR (DESKTOP) & MOBILE MENU */}
      <aside className={`fixed top-0 left-0 z-50 h-screen w-64 bg-white border-r border-slate-200 transform transition-transform duration-300 ease-in-out ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 flex flex-col`}>
        
        {/* Sidebar Header */}
        <div className="h-16 flex items-center px-6 border-b border-slate-100 mb-4">
          <Link href={user ? `/${user.role}/dashboard` : "/login"} className="flex items-center gap-2 group w-full" onClick={() => setMobileMenuOpen(false)}>
            <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br ${colorStyles.green.gradient} shadow-md group-hover:shadow-lg transition-all`}>
              <Stethoscope className="h-4 w-4 text-white" />
            </div>
            <span className={`text-xl font-bold bg-gradient-to-r ${colorStyles.green.textGradient} bg-clip-text text-transparent`}>
              NielCare
            </span>
          </Link>
          <button onClick={() => setMobileMenuOpen(false)} className="md:hidden p-1 text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Sidebar Links */}
        <div className="flex-1 overflow-y-auto px-4 space-y-1">
          <div className="mb-6 px-2">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Menu Utama</p>
            {links.map((link) => {
              const isActive = pathname === link.href;
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all mb-1 ${
                    isActive
                      ? `${theme.bg} ${theme.text}`
                      : `text-slate-600 ${theme.hover}`
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Sidebar Footer (User Profile) */}
        {user && (
          <div className="p-4 border-t border-slate-100">
            <div className="flex items-center gap-3 px-2 py-2 mb-2">
              <Avatar className="h-10 w-10 border border-slate-100">
                <AvatarFallback className={`bg-slate-100 ${theme.text} font-bold`}>
                  {getInitials(user.full_name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-900 truncate">
                  {user.full_name}
                </p>
                <p className="text-xs text-slate-500 capitalize">
                  {user.role === 'owner' ? 'Admin' : user.role === 'patient' ? 'Pasien' : 'Dokter'}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Keluar
            </Button>
          </div>
        )}
      </aside>

      {/* Overlay for mobile */}
      {mobileMenuOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-slate-900/20 z-40 backdrop-blur-sm"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
    </>
  );
}

// Icon workaround for CalendarPlus
function CalendarPlus(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <path d="M21 13V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h8" />
      <path d="M3 10h18" />
      <path d="M16 19h6" />
      <path d="M19 16v6" />
    </svg>
  )
}
