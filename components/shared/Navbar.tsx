"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import type { User } from "@/types";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { getInitials } from "@/lib/utils/formatters";
import { NotificationBell } from "./NotificationBell";
import {
  Menu,
  X,
  LogOut,
  Stethoscope,
  Globe
} from "lucide-react";


export function Navbar() {
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
          // Fallback: detect role from current path
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

  const roleLinks: Record<string, { label: string; href: string }[]> = {
    patient: [
      { label: "Dashboard", href: "/patient/dashboard" },
      { label: "Appointments", href: "/patient/book" },
      { label: "History", href: "/patient/appointments" },
      { label: "Profile", href: "/patient/profile" },
    ],
    doctor: [
      { label: "Dashboard", href: "/doctor/dashboard" },
      { label: "Appointments", href: "/doctor/appointments" },
      { label: "Patients", href: "/doctor/patients" },
      { label: "Schedule", href: "/doctor/schedule" },
      { label: "Availability", href: "/doctor/availability" },
    ],
    owner: [
      { label: "Dashboard", href: "/owner/dashboard" },
      { label: "Doctors", href: "/owner/doctors" },
      { label: "Services", href: "/owner/services" },
      { label: "Reports", href: "/owner/reports" },
    ],
  };

  const links = user ? roleLinks[user.role] || [] : [];

  return (
    <nav className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/80 backdrop-blur-lg">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link
            href={user ? `/${user.role}/dashboard` : "/login"}
            className="flex items-center gap-2 group"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 shadow-md group-hover:shadow-lg transition-shadow">
              <Stethoscope className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
              NielCare
            </span>
            <span className="text-xs font-medium text-slate-400 hidden sm:block">
              Dental
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {links.map((link) => {
              const isActive = pathname === link.href;
              let activeBg = "bg-green-50 text-green-700";
              if (user?.role === "doctor") activeBg = "bg-blue-50 text-blue-700";
              if (user?.role === "owner") activeBg = "bg-purple-50 text-purple-700";

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? activeBg
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2 sm:gap-3">


            {user && <NotificationBell userId={user.id} />}

            {user && (
              <div className="hidden md:flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-slate-900">
                    {user.full_name}
                  </p>
                  <p className="text-xs text-slate-500 capitalize">
                    {user.role}
                  </p>
                </div>
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="text-xs">
                    {getInitials(user.full_name)}
                  </AvatarFallback>
                </Avatar>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleLogout}
                  className="text-slate-400 hover:text-red-500"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white">
          <div className="px-4 py-3 space-y-1">
            {links.map((link) => {
              const isActive = pathname === link.href;
              let activeBg = "bg-green-50 text-green-700";
              if (user?.role === "doctor") activeBg = "bg-blue-50 text-blue-700";
              if (user?.role === "owner") activeBg = "bg-purple-50 text-purple-700";
              
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? activeBg
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
            {user && (
              <button
                onClick={handleLogout}
                className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50"
              >
                Logout
              </button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
