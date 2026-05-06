"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Sidebar } from "@/components/shared/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AppointmentCard } from "@/components/shared/AppointmentCard";
import type { User, Appointment, PatientStats } from "@/types";
import Link from "next/link";
import { CalendarPlus, Calendar, CheckCircle, Bell, User as UserIcon, Clock, Loader2 } from "lucide-react";

export default function PatientDashboard() {
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<PatientStats>({ upcomingAppointments: 0, completedAppointments: 0, unreadNotifications: 0 });
  const [upcomingList, setUpcomingList] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;
      const { data: profile } = await supabase.from("users").select("*").eq("id", authUser.id).single();
      if (profile) setUser(profile as User);
      const { data: upcoming } = await supabase.from("appointments").select(`*, doctor:doctors!appointments_doctor_id_fkey(*, user:users!doctors_user_id_fkey(*))`).eq("patient_id", authUser.id).in("status", ["pending", "approved"]).gte("appointment_date", new Date().toISOString().split("T")[0]).order("emergency_level", { ascending: true }).order("appointment_date", { ascending: true }).limit(5);
      if (upcoming) setUpcomingList(upcoming as Appointment[]);
      const { count: upcomingCount } = await supabase.from("appointments").select("*", { count: "exact", head: true }).eq("patient_id", authUser.id).in("status", ["pending", "approved"]);
      const { count: completedCount } = await supabase.from("appointments").select("*", { count: "exact", head: true }).eq("patient_id", authUser.id).eq("status", "done");
      const { count: notifCount } = await supabase.from("notifications").select("*", { count: "exact", head: true }).eq("user_id", authUser.id).eq("is_read", false);
      setStats({ upcomingAppointments: upcomingCount || 0, completedAppointments: completedCount || 0, unreadNotifications: notifCount || 0 });
      setLoading(false);
    }
    fetchData();
  }, []);

  if (loading) {
    return (<div className="min-h-screen" style={{ background: "#f0f1f5" }}><Sidebar /><div className="flex items-center justify-center h-[60vh]"><Loader2 className="h-8 w-8 animate-spin" style={{ color: "#1a4a35" }} /></div></div>);
  }

  const statCards = [
    { label: "Akan Datang", value: stats.upcomingAppointments, icon: Calendar, color: "text-emerald-700", bg: "bg-[#e8f0ea]" },
    { label: "Selesai", value: stats.completedAppointments, icon: CheckCircle, color: "text-emerald-700", bg: "bg-[#e8f0ea]" },
    { label: "Notifikasi", value: stats.unreadNotifications, icon: Bell, color: "text-amber-600", bg: "bg-amber-50" },
  ];

  return (
    <div className="min-h-screen" style={{ background: "#f0f1f5" }}>
      <Sidebar />
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold" style={{ color: "#1a4a35" }}>Selamat Datang, {user?.full_name?.split(" ")[0]}</h1>
            <p className="text-slate-500 mt-1 tracking-wide">Berikut adalah ringkasan perjalanan kesehatan gigi Anda</p>
          </div>
          <Link href="/patient/book">
            <Button size="lg" className="rounded-xl shadow-md hover:shadow-lg transition-all text-white font-semibold" style={{ background: "#1a4a35" }}>
              <CalendarPlus className="h-5 w-5 mr-2" /> Buat Janji
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
          {statCards.map((s) => (
            <Card key={s.label} className="border-0 shadow-lg rounded-3xl bg-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-semibold tracking-widest text-slate-500 uppercase">{s.label}</p>
                    <p className="text-4xl font-bold mt-2" style={{ color: "#1a4a35" }}>{s.value}</p>
                  </div>
                  <div className={`p-4 rounded-2xl ${s.bg}`}>
                    <s.icon className={`h-7 w-7 ${s.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <Card className="border-0 shadow-lg rounded-3xl text-white hover:shadow-xl transition-all cursor-pointer group" style={{ background: "#1a4a35" }}>
            <Link href="/patient/book">
              <CardContent className="p-8">
                <CalendarPlus className="h-10 w-10 mb-4 text-emerald-200 group-hover:scale-110 transition-transform" />
                <h3 className="font-bold text-xl tracking-wide">Buat Janji</h3>
                <p className="text-emerald-100/80 text-sm mt-2 leading-relaxed">Jadwalkan kunjungan baru dengan triase AI</p>
              </CardContent>
            </Link>
          </Card>
          <Card className="border-0 shadow-lg rounded-3xl text-white hover:shadow-xl transition-all cursor-pointer group relative overflow-hidden" style={{ background: "#246045" }}>
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at right bottom, white, transparent 70%)" }} />
            <Link href="/patient/appointments">
              <CardContent className="p-8 relative z-10">
                <Clock className="h-10 w-10 mb-4 text-emerald-200 group-hover:scale-110 transition-transform" />
                <h3 className="font-bold text-xl tracking-wide">Riwayat Janji</h3>
                <p className="text-emerald-100/80 text-sm mt-2 leading-relaxed">Lihat dan kelola riwayat janji temu Anda</p>
              </CardContent>
            </Link>
          </Card>
          <Card className="border-0 shadow-lg rounded-3xl text-white hover:shadow-xl transition-all cursor-pointer group relative overflow-hidden" style={{ background: "#2e7655" }}>
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at left top, white, transparent 70%)" }} />
            <Link href="/patient/profile">
              <CardContent className="p-8 relative z-10">
                <UserIcon className="h-10 w-10 mb-4 text-emerald-200 group-hover:scale-110 transition-transform" />
                <h3 className="font-bold text-xl tracking-wide">Profil Kesehatan</h3>
                <p className="text-emerald-100/80 text-sm mt-2 leading-relaxed">Perbarui informasi pribadi dan kesehatan Anda</p>
              </CardContent>
            </Link>
          </Card>
        </div>

        <Card className="border-0 shadow-lg rounded-3xl bg-white">
          <CardHeader className="px-8 pt-8 pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-3 text-xl font-bold" style={{ color: "#1a4a35" }}>
                <Calendar className="h-6 w-6 text-emerald-600" />Janji Temu Akan Datang
              </CardTitle>
              <Link href="/patient/appointments">
                <Button variant="ghost" size="sm" className="text-slate-500 hover:text-slate-900 rounded-xl">Lihat Semua →</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="px-8 pb-8">
            {upcomingList.length === 0 ? (
              <div className="text-center py-16 bg-[#e8f0ea]/50 rounded-2xl">
                <Calendar className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 font-medium">Tidak ada janji temu akan datang</p>
                <Link href="/patient/book">
                  <Button className="mt-5 rounded-xl font-semibold text-white" style={{ background: "#1a4a35" }} size="sm">
                    <CalendarPlus className="h-4 w-4 mr-2" /> Buat Sekarang
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">{upcomingList.map((a) => (<AppointmentCard key={a.id} appointment={a} linkPrefix="/patient/appointments" />))}</div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
