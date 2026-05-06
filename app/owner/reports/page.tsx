"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/shared/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDateShort } from "@/lib/utils/formatters";
import { useRouter } from "next/navigation";
import { Loader2, BarChart3, TrendingUp, ArrowLeft } from "lucide-react";

interface DailyData { date: string; count: number }
interface DoctorPerf { name: string; appointments: number; revenue: number }

export default function OwnerReportsPage() {
  const [loading, setLoading] = useState(true);
  const [dailyAppointments, setDailyAppointments] = useState<DailyData[]>([]);
  const [doctorPerformance, setDoctorPerformance] = useState<DoctorPerf[]>([]);
  const [monthlyRevenue, setMonthlyRevenue] = useState(0);

  useEffect(() => {
    async function fetchReports() {
      // --- Daily appointments (last 7 days) via API (adminClient, bypasses RLS) ---
      const res = await fetch("/api/owner/reports");
      if (res.ok) {
        const data = await res.json();
        setDailyAppointments(data.dailyAppointments || []);
        setDoctorPerformance(data.doctorPerformance || []);
        setMonthlyRevenue(data.monthlyRevenue || 0);
      }
      setLoading(false);
    }
    fetchReports();
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

  const maxDaily = Math.max(...dailyAppointments.map(d => d.count), 1);

  return (
    <div className="min-h-screen" style={{ background: "#f0f1f5" }}>
      <Sidebar />
      <main className="mx-auto max-w-6xl px-4 py-8 animate-fade-in">
        <div className="mb-8">
          <h1 className="text-3xl font-bold" style={{ color: "#6b21a8" }}>Laporan &amp; Analitik</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Daily chart */}
          <Card className="border-0 shadow-lg rounded-3xl bg-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-purple-600" />Janji Temu (7 Hari Terakhir)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-2 h-48">
                {dailyAppointments.map(d => (
                  <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-xs font-medium text-slate-700">{d.count}</span>
                    <div
                      className="w-full rounded-t-lg bg-gradient-to-t from-purple-500 to-purple-400 transition-all"
                      style={{ height: `${(d.count / maxDaily) * 140}px`, minHeight: d.count > 0 ? "8px" : "2px" }}
                    />
                    <span className="text-[10px] text-slate-400">{formatDateShort(d.date).split(",")[0]}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Monthly revenue */}
          <Card className="border-0 shadow-sm text-white" style={{ background: "#6b21a8" }}>
            <CardContent className="p-6 flex flex-col justify-center h-full">
              <span className="text-4xl font-black opacity-80 mb-2" style={{ fontFamily: 'monospace' }}>Rp</span>
              <p className="text-purple-100 text-sm">Pendapatan Bulan Ini</p>
              <p className="text-4xl font-bold mt-1">{formatCurrency(monthlyRevenue)}</p>
              <div className="mt-4 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                <span className="text-sm text-purple-200">Diperbarui secara real-time</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Doctor performance */}
        <Card className="border-0 shadow-lg rounded-3xl bg-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-purple-600" />Performa Dokter
            </CardTitle>
          </CardHeader>
          <CardContent>
            {doctorPerformance.length === 0 ? (
              <p className="text-slate-500 text-center py-8">Tidak ada data</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Dokter</th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-slate-500">Janji Temu</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-slate-500">Pendapatan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {doctorPerformance.map(d => (
                      <tr key={d.name} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-3 px-4 font-medium text-slate-900">Dr. {d.name}</td>
                        <td className="py-3 px-4 text-center text-slate-700">{d.appointments}</td>
                        <td className="py-3 px-4 text-right font-semibold text-purple-600">{formatCurrency(d.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
