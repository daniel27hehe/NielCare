"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Sidebar } from "@/components/shared/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AppointmentCard } from "@/components/shared/AppointmentCard";
import type { Appointment } from "@/types";
import { Loader2, Calendar, ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function DoctorSchedulePage() {
  const supabase = createClient();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);

  useEffect(() => {
    async function fetchSchedule() {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: doctor } = await supabase.from("doctors").select("id").eq("user_id", user.id).single();
      if (!doctor) return;
      const { data } = await supabase.from("appointments").select(`*, patient:users!appointments_patient_id_fkey(*)`).eq("doctor_id", doctor.id).eq("appointment_date", selectedDate).in("status", ["pending", "approved"]).order("slot_time", { ascending: true });
      if (data) setAppointments(data as Appointment[]);
      setLoading(false);
    }
    fetchSchedule();
  }, [selectedDate]);

  return (
    <div className="min-h-screen" style={{ background: "#f0f1f5" }}>
      <Sidebar />
      <main className="mx-auto max-w-4xl px-4 py-8 animate-fade-in">
        <div className="mb-8">
          <h1 className="text-3xl font-bold" style={{ color: "#1e40af" }}>Jadwal Saya</h1>
        </div>
        <div className="mb-6">
          <Input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="max-w-xs rounded-xl border-blue-100 focus:ring-blue-500" />
        </div>
        <Card className="border-0 shadow-lg rounded-3xl bg-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" style={{ color: "#1e40af" }} />
              <span style={{ color: "#1e40af" }}>Janji Temu untuk {selectedDate}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" style={{ color: "#1e40af" }} /></div>
            ) : appointments.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">Tidak ada janji temu pada tanggal ini</p>
              </div>
            ) : (
              <div className="space-y-3">{appointments.map(a => <AppointmentCard key={a.id} appointment={a} linkPrefix="/doctor/appointments" showPatient showDoctor={false} />)}</div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
