"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/shared/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils/formatters";
import { Loader2, Users, Calendar, Stethoscope, TrendingUp, BarChart3, Siren, AlertTriangle, CheckCircle } from "lucide-react";

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
        setMonthlyBreakdown(data.monthlyBreakdown || []);
      }
      setLoading(false);
    }
    fetchStats();
  }, []);

  if (loading)
    return (
      <div className="min-h-screen" style={{ background: "#f0f1f5" }}>
        <Sidebar />
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin" style={{ color: "#6b21a8" }} />
        </div>
      </div>
    );

  const stats_data = [
    { label: "Total Pasien", value: stats.totalPatients.toString(), Icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Total Janji", value: stats.totalAppointments.toString(), Icon: Calendar, color: "text-purple-600", bg: "bg-purple-50" },
    { label: "Total Pendapatan", value: formatCurrency(stats.totalRevenue), Icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Total Dokter", value: stats.totalDoctors.toString(), Icon: Stethoscope, color: "text-orange-600", bg: "bg-orange-50" },
  ];

  const maxRevenue = Math.max(...monthlyBreakdown.map(m => m.revenue), 1);
  const maxAppts = Math.max(...monthlyBreakdown.map(m => m.appointments), 1);

  return (
    <div className="min-h-screen" style={{ background: "#f0f1f5" }}>
      <Sidebar />
      <main className="mx-auto max-w-7xl px-4 py-8 animate-fade-in">
        <h1 className="text-3xl font-bold mb-8" style={{ color: "#6b21a8" }}>Beranda Admin</h1>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          {stats_data.map(s => (
            <Card key={s.label} className="border-0 shadow-lg rounded-3xl bg-white overflow-hidden">
              <CardContent className="p-5">
                <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold tracking-widest text-slate-500 uppercase leading-snug">{s.label}</p>
                    <p className="text-xl sm:text-2xl xl:text-3xl font-bold mt-2" style={{ color: "#6b21a8", wordBreak: "break-word" }}>{s.value}</p>
                  </div>
                  <div className={`p-3 rounded-2xl flex items-center justify-center h-12 w-12 flex-shrink-0 ${s.bg}`}>
                    {s.Icon && <s.Icon className={`h-6 w-6 ${s.color}`} />}
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
                <BarChart3 className="h-6 w-6 text-purple-600" />Janji Temu per Bulan
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
                <TrendingUp className="h-6 w-6 text-emerald-600" />Pendapatan per Bulan
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
                <BarChart3 className="h-6 w-6 text-purple-600" />Ringkasan Prioritas
              </CardTitle>
            </CardHeader>
            <CardContent className="px-8 pb-8">
              <div className="space-y-4">
                {[
                  { label: "Prioritas", key: "Prioritas", color: "bg-red-100 text-red-700", bar: "bg-red-400", Icon: Siren },
                  { label: "Sedang", key: "Sedang", color: "bg-amber-100 text-amber-700", bar: "bg-amber-400", Icon: AlertTriangle },
                  { label: "Ringan", key: "Ringan", color: "bg-green-100 text-green-700", bar: "bg-green-400", Icon: CheckCircle },
                ].map(p => (
                  <div key={p.key} className="flex items-center gap-4 p-3 rounded-xl bg-slate-50">
                    <span className={`flex items-center justify-center gap-1.5 text-xs font-bold px-2 py-1 rounded-lg min-w-[90px] text-center ${p.color}`}>
                      <p.Icon className="h-3.5 w-3.5" /> {p.label}
                    </span>
                    <p className="text-sm text-slate-500">Tingkat prioritas penanganan</p>
                  </div>
                ))}
                <p className="text-xs text-slate-400 mt-2">Tingkat prioritas ditentukan secara otomatis oleh AI berdasarkan gejala pasien.</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg rounded-3xl text-white relative overflow-hidden" style={{ background: "#6b21a8" }}>
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at right top, white, transparent 70%)" }} />
            <CardContent className="p-10 flex flex-col justify-center h-full relative z-10">
              <span className="text-5xl font-black mb-6 text-purple-200" style={{ fontFamily: 'monospace' }}>Rp</span>
              <p className="text-purple-200 text-sm tracking-widest uppercase font-semibold mb-2">Total Pendapatan</p>
              <p className="text-5xl font-bold">{formatCurrency(stats.totalRevenue)}</p>
              <p className="text-purple-300 mt-4 leading-relaxed">Dari {stats.totalAppointments} total janji</p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
