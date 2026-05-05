"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Navbar } from "@/components/shared/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { StatusBadge, EmergencyBadge } from "@/components/shared/StatusBadge";
import { EmergencyBanner } from "@/components/shared/EmergencyBanner";
import { formatDate, formatTime, formatCurrency } from "@/lib/utils/formatters";
import type { Appointment, MedicalRecord } from "@/types";
import { Loader2, ArrowLeft, Check, X, FileText } from "lucide-react";
import Link from "next/link";

export default function DoctorAppointmentDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [appointment, setAppointment] = useState<Appointment & { medical_record?: MedicalRecord } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [record, setRecord] = useState({ diagnosis_notes: "", treatment_given: "", medications_prescribed: "" });

  useEffect(() => {
    async function fetchDetail() {
      const res = await fetch(`/api/appointments/${id}`);
      if (res.ok) {
        const data = await res.json();
        setAppointment(data);
        if (data.medical_record) {
          setRecord({
            diagnosis_notes: data.medical_record.diagnosis_notes || "",
            treatment_given: data.medical_record.treatment_given || "",
            medications_prescribed: data.medical_record.medications_prescribed || "",
          });
        }
      }
      setLoading(false);
    }
    fetchDetail();
  }, [id]);

  const updateStatus = async (status: string) => {
    setSaving(true);
    await fetch(`/api/appointments/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    setAppointment(prev => prev ? { ...prev, status: status as Appointment["status"] } : null);
    setSaving(false);
  };

  const saveRecord = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/appointments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "done",
          diagnosis_notes: record.diagnosis_notes,
          treatment_given: record.treatment_given,
          medications_prescribed: record.medications_prescribed || null,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        alert(`Gagal menyimpan: ${errorData.error || "Terjadi kesalahan"}`);
        setSaving(false);
        return;
      }

      setAppointment(prev => prev ? { ...prev, status: "done" } : null);
      router.refresh();
    } catch (e) {
      alert("Network error: Gagal menghubungi server");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="min-h-screen" style={{ background: "#f0f1f5" }}><Navbar /><div className="flex items-center justify-center h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-green-600" /></div></div>;
  if (!appointment) return <div className="min-h-screen" style={{ background: "#f0f1f5" }}><Navbar /><div className="flex items-center justify-center h-[60vh]"><p>Not found</p></div></div>;

  return (
    <div className="min-h-screen" style={{ background: "#f0f1f5" }}>
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 py-8 animate-fade-in">
        <Link href="/doctor/appointments"><Button variant="ghost" size="sm" className="mb-4"><ArrowLeft className="h-4 w-4" />Back</Button></Link>
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
              <div><p className="text-xs text-slate-400">Patient</p><p className="font-medium">{appointment.patient?.full_name}</p></div>
              <div><p className="text-xs text-slate-400">Date</p><p className="font-medium">{formatDate(appointment.appointment_date)}</p></div>
              <div><p className="text-xs text-slate-400">Time</p><p className="font-medium">{formatTime(appointment.slot_time)}</p></div>
              <div><p className="text-xs text-slate-400">Service Price</p><p className="font-medium text-green-600">{formatCurrency(appointment.service?.base_price || 0)}</p></div>
            </div>
            {appointment.symptom_description && <div><p className="text-xs text-slate-400">Patient Symptoms</p><p className="text-sm mt-1 p-3 bg-slate-50 rounded-lg">{appointment.symptom_description}</p></div>}
            {appointment.ai_analysis_result && (() => { try { const ai = JSON.parse(appointment.ai_analysis_result!); return <div className="p-3 bg-blue-50 rounded-lg"><p className="text-xs text-blue-600 font-medium">AI Analysis</p><p className="text-sm mt-1">{ai.reason}</p><p className="text-sm">{ai.recommendation}</p></div>; } catch { return null; } })()}
            {appointment.status === "pending" && (
              <div className="flex gap-3 pt-2">
                <Button onClick={() => updateStatus("approved")} disabled={saving}><Check className="h-4 w-4" />Approve</Button>
                <Button variant="destructive" onClick={() => updateStatus("rejected")} disabled={saving}><X className="h-4 w-4" />Reject</Button>
              </div>
            )}
          </CardContent>
        </Card>
        {appointment.status === "approved" && !appointment.medical_record && (
          <Card className="border-0 shadow-lg rounded-3xl bg-white">
            <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-green-600" />Complete Treatment Record</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2"><Label>Diagnosis Notes *</Label><Textarea value={record.diagnosis_notes} onChange={e => setRecord(p => ({ ...p, diagnosis_notes: e.target.value }))} placeholder="Enter diagnosis..." /></div>
              <div className="space-y-2"><Label>Treatment Given *</Label><Textarea value={record.treatment_given} onChange={e => setRecord(p => ({ ...p, treatment_given: e.target.value }))} placeholder="Enter treatment details..." /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Medications</Label><Input value={record.medications_prescribed} onChange={e => setRecord(p => ({ ...p, medications_prescribed: e.target.value }))} placeholder="Optional" /></div>
              </div>
              <Button onClick={saveRecord} disabled={saving || !record.diagnosis_notes || !record.treatment_given} className="flex items-center gap-2">{saving ? <><Loader2 className="h-4 w-4 animate-spin" /><span>Saving...</span></> : <><Check className="h-4 w-4" /><span>Complete & Save</span></>}</Button>
            </CardContent>
          </Card>
        )}
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
