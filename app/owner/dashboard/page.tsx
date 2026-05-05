"use client";

import { useEffect, useState } from "react";
import { Navbar } from "@/components/shared/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils/formatters";
import { Loader2, Users, Calendar, DollarSign, Stethoscope, TrendingUp, BarChart3 } from "lucide-react";

interface MonthlyBreakdown {
  month: string;
  label: string;
  appointments: number;
  revenue: number;
}

export default function OwnerDashboard() {
  const [stats, setStats] = useState({
    totalPatients: 0,
    totalAppointments: 0,
    totalRevenue: 0,
    totalDoctors: 0,
  });
  const [monthlyBreakdown, setMonthlyBreakdown] = useState<MonthlyBreakdown[]>([]);
  const [popularServices, setPopularServices] = useState<{ name: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      const res = await fetch("/api/owner/stats");
      if (res.ok) {
        const data = await res.json();
        setStats({
          totalPatients: data.totalPatients,
          totalAppointments: data.totalAppointments,
          totalRevenue: data.totalRevenue,
          totalDoctors: data.totalDoctors,
        });
        setPopularServices(data.popularServices || []);
        setMonthlyBreakdown(data.monthlyBreakdown || []);
      }
      setLoading(false);
    }
    fetchStats();
  }, []);

  if (loading)
    return (
      <div className="min-h-screen" style={{ background: "#f0f1f5" }}>
        <Navbar />
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin" style={{ color: "#6b21a8" }} />
        </div>
      </div>
    );

  const statCards = [
    { label: "Total Patients", value: stats.totalPatients, icon: Users, color: "text-purple-700", bg: "bg-purple-50" },
    { label: "Total Appointments", value: stats.totalAppointments, icon: Calendar, color: "text-purple-700", bg: "bg-purple-50" },
    { label: "Total Revenue", value: formatCurrency(stats.totalRevenue), icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Active Doctors", value: stats.totalDoctors, icon: Stethoscope, color: "text-amber-600", bg: "bg-amber-50" },
  ];

  const maxRevenue = Math.max(...monthlyBreakdown.map(m => m.revenue), 1);
  const maxAppts = Math.max(...monthlyBreakdown.map(m => m.appointments), 1);

  return (
    <div className="min-h-screen" style={{ background: "#f0f1f5" }}>
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-8 animate-fade-in">
        <h1 className="text-3xl font-bold mb-8" style={{ color: "#6b21a8" }}>Owner Dashboard</h1>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          {statCards.map(s => (
            <Card key={s.label} className="border-0 shadow-lg rounded-3xl bg-white">
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-semibold tracking-widest text-slate-500 uppercase">{s.label}</p>
                    <p className="text-2xl sm:text-3xl font-bold mt-2" style={{ color: "#6b21a8" }}>{s.value}</p>
                  </div>
                  <div className={`p-4 rounded-2xl ${s.bg}`}>
                    <s.icon className={`h-7 w-7 ${s.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Monthly breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Monthly Appointments Bar Chart */}
          <Card className="border-0 shadow-lg rounded-3xl bg-white">
            <CardHeader className="px-8 pt-8 pb-4">
              <CardTitle className="flex items-center gap-3 text-xl font-bold" style={{ color: "#6b21a8" }}>
                <BarChart3 className="h-6 w-6 text-purple-600" />Appointments per Month
              </CardTitle>
            </CardHeader>
            <CardContent className="px-8 pb-8">
              <div className="flex items-end gap-2 h-44">
                {monthlyBreakdown.map(m => (
                  <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-xs font-semibold text-slate-700">{m.appointments}</span>
                    <div
                      className="w-full rounded-t-lg bg-gradient-to-t from-purple-600 to-purple-400 transition-all"
                      style={{
                        height: `${(m.appointments / maxAppts) * 130}px`,
                        minHeight: m.appointments > 0 ? "8px" : "2px",
                      }}
                    />
                    <span className="text-[10px] text-slate-400 text-center leading-tight">{m.label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Monthly Revenue Bar Chart */}
          <Card className="border-0 shadow-lg rounded-3xl bg-white">
            <CardHeader className="px-8 pt-8 pb-4">
              <CardTitle className="flex items-center gap-3 text-xl font-bold" style={{ color: "#6b21a8" }}>
                <TrendingUp className="h-6 w-6 text-emerald-600" />Revenue per Month
              </CardTitle>
            </CardHeader>
            <CardContent className="px-8 pb-8">
              <div className="flex items-end gap-2 h-44">
                {monthlyBreakdown.map(m => (
                  <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[10px] font-semibold text-slate-700">{formatCurrency(m.revenue)}</span>
                    <div
                      className="w-full rounded-t-lg bg-gradient-to-t from-emerald-600 to-emerald-400 transition-all"
                      style={{
                        height: `${(m.revenue / maxRevenue) * 130}px`,
                        minHeight: m.revenue > 0 ? "8px" : "2px",
                      }}
                    />
                    <span className="text-[10px] text-slate-400 text-center leading-tight">{m.label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Popular services + Total Revenue highlight */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-0 shadow-lg rounded-3xl bg-white">
            <CardHeader className="px-8 pt-8 pb-4">
              <CardTitle className="flex items-center gap-3 text-xl font-bold" style={{ color: "#6b21a8" }}>
                <TrendingUp className="h-6 w-6 text-purple-600" />Popular Services
              </CardTitle>
            </CardHeader>
            <CardContent className="px-8 pb-8">
              {popularServices.length === 0 ? (
                <div className="text-center py-8 bg-purple-50/50 rounded-2xl">
                  <p className="text-slate-500 font-medium">No data yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {popularServices.map((s, i) => (
                    <div key={s.name} className="flex items-center justify-between p-4 rounded-2xl bg-[#faf5ff]">
                      <div className="flex items-center gap-4">
                        <span className="text-lg font-bold text-purple-300">#{i + 1}</span>
                        <span className="font-semibold text-slate-800">{s.name}</span>
                      </div>
                      <span className="text-sm font-bold text-purple-600">{s.count} bookings</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg rounded-3xl text-white relative overflow-hidden" style={{ background: "#6b21a8" }}>
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at right top, white, transparent 70%)" }} />
            <CardContent className="p-10 flex flex-col justify-center h-full relative z-10">
              <DollarSign className="h-14 w-14 mb-6 text-purple-200" />
              <p className="text-purple-200 text-sm tracking-widest uppercase font-semibold mb-2">Total Revenue</p>
              <p className="text-5xl font-bold">{formatCurrency(stats.totalRevenue)}</p>
              <p className="text-purple-300 mt-4 leading-relaxed">From {stats.totalAppointments} total appointments</p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
