"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Sidebar } from "@/components/shared/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppointmentCard } from "@/components/shared/AppointmentCard";
import { formatCurrency } from "@/lib/utils/formatters";
import type { Appointment, DoctorStats } from "@/types";
import { Loader2, Calendar, Users, CheckCircle, Clock, TrendingUp } from "lucide-react";

export default function DoctorDashboard() {
  const supabase = createClient();
  const [stats, setStats] = useState<DoctorStats>({
    todayAppointments: 0,
    pendingAppointments: 0,
    totalPatients: 0,
    completedThisMonth: 0,
    earningsThisMonth: 0,
  });
  const [todayList, setTodayList] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const today = new Date().toISOString().split("T")[0];

      // Fetch today's appointments list (for display cards) via existing API
      const { data: doctor } = await supabase
        .from("doctors")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!doctor) { setLoading(false); return; }

      // Fetch today's appointment list for the card display
      const apptRes = await fetch(`/api/appointments?doctor_id=${doctor.id}&date=${today}`);
      if (apptRes.ok) {
        const apptData = await apptRes.json();
        apptData.sort((a: Appointment, b: Appointment) => a.slot_time.localeCompare(b.slot_time));
        setTodayList(apptData);
      }

      // Fetch all dashboard stats via server-side API (bypasses RLS)
      const statsRes = await fetch("/api/doctor/stats");
      if (statsRes.ok) {
        const s = await statsRes.json();
        setStats({
          todayAppointments: s.todayAppointments,
          pendingAppointments: s.pendingAppointments,
          totalPatients: s.totalPatients,
          completedThisMonth: s.completedThisMonth,
          earningsThisMonth: s.earningsThisMonth,
        });
      }

      setLoading(false);
    }
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading)
    return (
      <div className="min-h-screen" style={{ background: "#f0f1f5" }}>
        <Sidebar />
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin" style={{ color: "#1e40af" }} />
        </div>
      </div>
    );

  const statCards = [
    { label: "Hari Ini", value: stats.todayAppointments, icon: Calendar, color: "text-blue-700", bg: "bg-blue-50" },
    { label: "Menunggu", value: stats.pendingAppointments, icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Pasien", value: stats.totalPatients, icon: Users, color: "text-blue-700", bg: "bg-blue-50" },
    { label: "Selesai (Bulan)", value: stats.completedThisMonth, icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Pendapatan (Bulan)", value: formatCurrency(stats.earningsThisMonth || 0), icon: TrendingUp, color: "text-green-600", bg: "bg-green-50" },
  ];

  return (
    <div className="min-h-screen" style={{ background: "#f0f1f5" }}>
      <Sidebar />
      <main className="mx-auto max-w-7xl px-4 py-8 animate-fade-in">
        <h1 className="text-3xl font-bold mb-8" style={{ color: "#1e40af" }}>Beranda Dokter</h1>

        <div className="grid grid-cols-2 lg:grid-cols-6 gap-5 mb-8">
          {statCards.map((s, idx) => (
            <Card key={s.label} className={`border-0 shadow-lg rounded-3xl bg-white overflow-hidden ${idx === 4 ? 'col-span-2 lg:col-span-2' : 'col-span-1'}`}>
              <CardContent className="p-5">
                <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold tracking-widest text-slate-500 uppercase leading-snug">{s.label}</p>
                    <p className="text-xl xl:text-2xl font-bold mt-2" style={{ color: "#1e40af", wordBreak: "break-word" }}>{s.value}</p>
                  </div>
                  <div className={`p-3 rounded-2xl flex items-center justify-center h-12 w-12 flex-shrink-0 ${s.bg}`}>
                    {s.icon && <s.icon className={`h-6 w-6 ${s.color}`} />}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border-0 shadow-lg rounded-3xl bg-white">
          <CardHeader className="px-8 pt-8 pb-4">
            <CardTitle className="flex items-center gap-3 text-xl font-bold" style={{ color: "#1e40af" }}>
              <Calendar className="h-6 w-6 text-blue-600" />Janji Temu Hari Ini
            </CardTitle>
          </CardHeader>
          <CardContent className="px-8 pb-8">
            {todayList.length === 0 ? (
              <div className="text-center py-16 bg-blue-50/50 rounded-2xl">
                <Calendar className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 font-medium">Tidak ada janji temu hari ini</p>
              </div>
            ) : (
              <div className="space-y-4">
                {todayList.map(a => (
                  <AppointmentCard
                    key={a.id}
                    appointment={a}
                    linkPrefix="/doctor/appointments"
                    showPatient
                    showDoctor={false}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
