"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Navbar } from "@/components/shared/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppointmentCard } from "@/components/shared/AppointmentCard";
import { formatCurrency } from "@/lib/utils/formatters";
import type { Appointment, DoctorStats } from "@/types";
import { Loader2, Calendar, Users, CheckCircle, Clock, DollarSign } from "lucide-react";

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
        <Navbar />
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin" style={{ color: "#1e40af" }} />
        </div>
      </div>
    );

  const statCards = [
    { label: "Today", value: stats.todayAppointments, icon: Calendar, color: "text-blue-700", bg: "bg-blue-50" },
    { label: "Pending", value: stats.pendingAppointments, icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Patients", value: stats.totalPatients, icon: Users, color: "text-blue-700", bg: "bg-blue-50" },
    { label: "Completed (Month)", value: stats.completedThisMonth, icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Earnings (Month)", value: formatCurrency(stats.earningsThisMonth || 0), icon: DollarSign, color: "text-green-600", bg: "bg-green-50" },
  ];

  return (
    <div className="min-h-screen" style={{ background: "#f0f1f5" }}>
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-8 animate-fade-in">
        <h1 className="text-3xl font-bold mb-8" style={{ color: "#1e40af" }}>Doctor Dashboard</h1>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-5 mb-8">
          {statCards.map(s => (
            <Card key={s.label} className="border-0 shadow-lg rounded-3xl bg-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-semibold tracking-widest text-slate-500 uppercase">{s.label}</p>
                    <p className="text-2xl font-bold mt-2 truncate" style={{ color: "#1e40af" }}>{s.value}</p>
                  </div>
                  <div className={`p-4 rounded-2xl ${s.bg}`}>
                    <s.icon className={`h-7 w-7 ${s.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border-0 shadow-lg rounded-3xl bg-white">
          <CardHeader className="px-8 pt-8 pb-4">
            <CardTitle className="flex items-center gap-3 text-xl font-bold" style={{ color: "#1e40af" }}>
              <Calendar className="h-6 w-6 text-blue-600" />Today&apos;s Appointments
            </CardTitle>
          </CardHeader>
          <CardContent className="px-8 pb-8">
            {todayList.length === 0 ? (
              <div className="text-center py-16 bg-blue-50/50 rounded-2xl">
                <Calendar className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 font-medium">No appointments today</p>
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
