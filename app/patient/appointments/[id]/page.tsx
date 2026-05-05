"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Navbar } from "@/components/shared/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge, EmergencyBadge } from "@/components/shared/StatusBadge";
import { EmergencyBanner } from "@/components/shared/EmergencyBanner";
import { formatDate, formatTime, formatCurrency } from "@/lib/utils/formatters";
import { Button } from "@/components/ui/button";
import type { Appointment, MedicalRecord } from "@/types";
import { Loader2, ArrowLeft, Calendar, Clock, Stethoscope, FileText } from "lucide-react";
import Link from "next/link";

export default function PatientAppointmentDetailPage() {
  const { id } = useParams();
  const supabase = createClient();
  const [appointment, setAppointment] = useState<Appointment & { medical_record?: MedicalRecord } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDetail() {
      const res = await fetch(`/api/appointments/${id}`);
      if (res.ok) { const data = await res.json(); setAppointment(data); }
      setLoading(false);
    }
    fetchDetail();
  }, [id]);

  if (loading) return <div className="min-h-screen" style={{ background: "#f0f1f5" }}><Navbar /><div className="flex items-center justify-center h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-green-600" /></div></div>;
  if (!appointment) return <div className="min-h-screen" style={{ background: "#f0f1f5" }}><Navbar /><div className="flex items-center justify-center h-[60vh]"><p className="text-slate-500">Appointment not found</p></div></div>;

  const handleCancel = async () => {
    await fetch(`/api/appointments/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "cancelled" }) });
    setAppointment(prev => prev ? { ...prev, status: "cancelled" } : null);
  };

  return (
    <div className="min-h-screen" style={{ background: "#f0f1f5" }}>
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 py-8 animate-fade-in">
        <Link href="/patient/appointments"><Button variant="ghost" size="sm" className="mb-4"><ArrowLeft className="h-4 w-4" />Back to Appointments</Button></Link>
        {appointment.emergency_level === "critical" && <EmergencyBanner />}
        <Card className="border-0 shadow-sm mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{appointment.service?.name}</CardTitle>
              <div className="flex gap-2">
                <StatusBadge status={appointment.status} />
                {(() => {
                  try {
                    const ai = appointment.ai_analysis_result && typeof appointment.ai_analysis_result === 'string' ? JSON.parse(appointment.ai_analysis_result) : null;
                    const label = ai?.emergencyLevel ?? null;
                    return <EmergencyBadge level={appointment.emergency_level} label={label} />;
                  } catch {
                    return <EmergencyBadge level={appointment.emergency_level} />;
                  }
                })()}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-green-600" /><div><p className="text-xs text-slate-400">Date</p><p className="font-medium">{formatDate(appointment.appointment_date)}</p></div></div>
              <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-green-600" /><div><p className="text-xs text-slate-400">Time</p><p className="font-medium">{formatTime(appointment.slot_time)}</p></div></div>
              <div className="flex items-center gap-2"><Stethoscope className="h-4 w-4 text-green-600" /><div><p className="text-xs text-slate-400">Doctor</p><p className="font-medium">Dr. {appointment.doctor?.user?.full_name}</p></div></div>
              <div><p className="text-xs text-slate-400">Price</p><p className="font-medium text-green-600">{formatCurrency(appointment.service?.base_price || 0)}</p></div>
            </div>
            {appointment.symptom_description && <div><p className="text-xs text-slate-400">Symptoms</p><p className="text-sm mt-1">{appointment.symptom_description}</p></div>}
            {appointment.ai_analysis_result && <div><p className="text-xs text-slate-400">AI Analysis</p><p className="text-sm mt-1">{typeof appointment.ai_analysis_result === "string" ? JSON.parse(appointment.ai_analysis_result).recommendation : ""}</p></div>}
            {appointment.status === "pending" && <Button variant="destructive" onClick={handleCancel}>Cancel Appointment</Button>}
          </CardContent>
        </Card>
        {appointment.medical_record && (
          <Card className="border-0 shadow-lg rounded-3xl bg-white">
            <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-green-600" />Medical Record</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div><p className="text-xs text-slate-400">Diagnosis</p><p className="text-sm">{appointment.medical_record.diagnosis_notes}</p></div>
              <div><p className="text-xs text-slate-400">Treatment</p><p className="text-sm">{appointment.medical_record.treatment_given}</p></div>
              {appointment.medical_record.medications_prescribed && <div><p className="text-xs text-slate-400">Medications</p><p className="text-sm">{appointment.medical_record.medications_prescribed}</p></div>}
              {appointment.medical_record.treatment_cost != null && <div><p className="text-xs text-slate-400">Cost</p><p className="font-semibold text-green-600">{formatCurrency(appointment.medical_record.treatment_cost)}</p></div>}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
