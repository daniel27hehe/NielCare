"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Sidebar } from "@/components/shared/Sidebar";
import { Button } from "@/components/ui/button";
import { AppointmentCard } from "@/components/shared/AppointmentCard";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { Appointment } from "@/types";
import { Loader2, Calendar, ArrowLeft } from "lucide-react";

export default function DoctorAppointmentsPage() {
  const supabase = createClient();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAppointments() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: doctor } = await supabase.from("doctors").select("id").eq("user_id", user.id).single();
      if (!doctor) return;
      const res = await fetch(`/api/appointments?doctor_id=${doctor.id}`);
      if (res.ok) {
        const data = await res.json();
        setAppointments(data);
      }
      setLoading(false);
    }
    loadAppointments();
  }, []);

  if (loading) return <div className="min-h-screen" style={{ background: "#f0f1f5" }}><Sidebar /><div className="flex items-center justify-center h-[60vh]"><Loader2 className="h-8 w-8 animate-spin" style={{ color: "#1e40af" }} /></div></div>;

  const pending = appointments.filter(a => a.status === "pending");
  const approved = appointments.filter(a => a.status === "approved");
  const done = appointments.filter(a => ["done", "rejected", "cancelled"].includes(a.status));

  return (
    <div className="min-h-screen" style={{ background: "#f0f1f5" }}>
      <Sidebar />
      <main className="mx-auto max-w-4xl px-4 py-8 animate-fade-in">
        <div className="mb-8">
          <h1 className="text-3xl font-bold" style={{ color: "#1e40af" }}>Janji Temu</h1>
        </div>
        <Tabs defaultValue="pending">
          <TabsList className="mb-6">
            <TabsTrigger value="pending">Menunggu ({pending.length})</TabsTrigger>
            <TabsTrigger value="approved">Disetujui ({approved.length})</TabsTrigger>
            <TabsTrigger value="history">Riwayat ({done.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="pending">{pending.length === 0 ? <div className="text-center py-16"><Calendar className="h-12 w-12 text-slate-300 mx-auto mb-3" /><p className="text-slate-500">Tidak ada janji temu yang menunggu</p></div> : <div className="space-y-3">{pending.map(a => <AppointmentCard key={a.id} appointment={a} linkPrefix="/doctor/appointments" showPatient showDoctor={false} />)}</div>}</TabsContent>
          <TabsContent value="approved">{approved.length === 0 ? <div className="text-center py-16"><Calendar className="h-12 w-12 text-slate-300 mx-auto mb-3" /><p className="text-slate-500">Tidak ada janji temu yang disetujui</p></div> : <div className="space-y-3">{approved.map(a => <AppointmentCard key={a.id} appointment={a} linkPrefix="/doctor/appointments" showPatient showDoctor={false} />)}</div>}</TabsContent>
          <TabsContent value="history">{done.length === 0 ? <div className="text-center py-16"><Calendar className="h-12 w-12 text-slate-300 mx-auto mb-3" /><p className="text-slate-500">Tidak ada riwayat janji temu</p></div> : <div className="space-y-3">{done.map(a => <AppointmentCard key={a.id} appointment={a} linkPrefix="/doctor/appointments" showPatient showDoctor={false} />)}</div>}</TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
