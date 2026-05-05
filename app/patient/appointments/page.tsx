"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Navbar } from "@/components/shared/Navbar";
import { AppointmentCard } from "@/components/shared/AppointmentCard";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { Appointment } from "@/types";
import { useRouter } from "next/navigation";
import { Loader2, Calendar, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PatientAppointmentsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAppointments() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const res = await fetch(`/api/appointments?patient_id=${user.id}`);
      if (res.ok) {
        const data = await res.json();
        setAppointments(data);
      }
      setLoading(false);
    }
    fetchAppointments();
  }, []);

  if (loading) return <div className="min-h-screen" style={{ background: "#f0f1f5" }}><Navbar /><div className="flex items-center justify-center h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-green-600" /></div></div>;

  const upcoming = appointments.filter(a => ["pending", "approved"].includes(a.status));
  const past = appointments.filter(a => ["done", "rejected", "cancelled"].includes(a.status));

  return (
    <div className="min-h-screen" style={{ background: "#f0f1f5" }}>
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 py-8 animate-fade-in">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold" style={{ color: "#1a4a35" }}>My Appointments</h1>
          <Button variant="outline" size="sm" onClick={() => router.push("/patient/dashboard")} className="rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
          </Button>
        </div>
        <Tabs defaultValue="upcoming">
          <TabsList className="mb-6"><TabsTrigger value="upcoming">Upcoming ({upcoming.length})</TabsTrigger><TabsTrigger value="history">History ({past.length})</TabsTrigger></TabsList>
          <TabsContent value="upcoming">
            {upcoming.length === 0 ? <div className="text-center py-16"><Calendar className="h-12 w-12 text-slate-300 mx-auto mb-3" /><p className="text-slate-500">No upcoming appointments</p></div> : <div className="space-y-3">{upcoming.map(a => <AppointmentCard key={a.id} appointment={a} linkPrefix="/patient/appointments" />)}</div>}
          </TabsContent>
          <TabsContent value="history">
            {past.length === 0 ? <div className="text-center py-16"><Calendar className="h-12 w-12 text-slate-300 mx-auto mb-3" /><p className="text-slate-500">No past appointments</p></div> : <div className="space-y-3">{past.map(a => <AppointmentCard key={a.id} appointment={a} linkPrefix="/patient/appointments" />)}</div>}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
