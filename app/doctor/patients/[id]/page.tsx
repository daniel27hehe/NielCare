"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Navbar } from "@/components/shared/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppointmentCard } from "@/components/shared/AppointmentCard";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getInitials, formatDate } from "@/lib/utils/formatters";
import type { User, Appointment } from "@/types";
import { Loader2, ArrowLeft, Mail, Phone, Calendar as CalIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function DoctorPatientDetailPage() {
  const { id } = useParams();
  const supabase = createClient();
  const [patient, setPatient] = useState<User | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: doctor } = await supabase.from("doctors").select("id").eq("user_id", user.id).single();
      if (!doctor) return;
      const { data: p } = await supabase.from("users").select("*").eq("id", id).single();
      if (p) setPatient(p as User);
      const { data: appts } = await supabase.from("appointments").select(`*, service:services!appointments_service_id_fkey(*)`).eq("patient_id", id as string).eq("doctor_id", doctor.id).order("appointment_date", { ascending: false });
      if (appts) setAppointments(appts as Appointment[]);
      setLoading(false);
    }
    fetchData();
  }, [id]);

  if (loading) return <div className="min-h-screen" style={{ background: "#f0f1f5" }}><Navbar /><div className="flex items-center justify-center h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-green-600" /></div></div>;

  return (
    <div className="min-h-screen" style={{ background: "#f0f1f5" }}>
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 py-8 animate-fade-in">
        <Link href="/doctor/patients"><Button variant="ghost" size="sm" className="mb-4"><ArrowLeft className="h-4 w-4" />Back</Button></Link>
        {patient && (
          <Card className="border-0 shadow-sm mb-6">
            <CardContent className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <Avatar className="h-16 w-16"><AvatarFallback className="text-lg">{getInitials(patient.full_name)}</AvatarFallback></Avatar>
                <div><h2 className="text-xl font-bold text-slate-900">{patient.full_name}</h2><p className="text-slate-500 capitalize">{patient.gender}</p></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 text-sm text-slate-600"><Mail className="h-4 w-4" />{patient.email}</div>
                {patient.phone && <div className="flex items-center gap-2 text-sm text-slate-600"><Phone className="h-4 w-4" />{patient.phone}</div>}
                {patient.date_of_birth && <div className="flex items-center gap-2 text-sm text-slate-600"><CalIcon className="h-4 w-4" />{formatDate(patient.date_of_birth)}</div>}
              </div>
            </CardContent>
          </Card>
        )}
        <Card className="border-0 shadow-lg rounded-3xl bg-white">
          <CardHeader><CardTitle>Appointment History</CardTitle></CardHeader>
          <CardContent>{appointments.length === 0 ? <p className="text-slate-500 text-center py-8">No appointments</p> : <div className="space-y-3">{appointments.map(a => <AppointmentCard key={a.id} appointment={a} linkPrefix="/doctor/appointments" showDoctor={false} />)}</div>}</CardContent>
        </Card>
      </main>
    </div>
  );
}
