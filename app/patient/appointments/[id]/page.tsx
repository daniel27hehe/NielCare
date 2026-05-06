"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Sidebar } from "@/components/shared/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge, EmergencyBadge } from "@/components/shared/StatusBadge";
import { EmergencyBanner } from "@/components/shared/EmergencyBanner";
import { formatDate, formatTime, formatCurrency } from "@/lib/utils/formatters";
import { EMERGENCY_LEVEL_LABELS } from "@/types";
import { Button } from "@/components/ui/button";
import type { Appointment, MedicalRecord } from "@/types";
import { Loader2, ArrowLeft, Calendar, Clock, Stethoscope, FileText, Brain, Siren, AlertTriangle, CheckCircle } from "lucide-react";
import Link from "next/link";

const PRIORITY_CONFIG = {
  critical: { bg: "bg-red-50", border: "border-red-200", badgeBg: "bg-red-100", badgeText: "text-red-700", Icon: Siren },
  moderate: { bg: "bg-amber-50", border: "border-amber-200", badgeBg: "bg-amber-100", badgeText: "text-amber-700", Icon: AlertTriangle },
  routine:  { bg: "bg-blue-50",  border: "border-blue-200",  badgeBg: "bg-blue-100",  badgeText: "text-blue-700",  Icon: CheckCircle },
};

export default function PatientAppointmentDetailPage() {
  const { id } = useParams();
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

  if (loading) return <div className="min-h-screen" style={{ background: "#f0f1f5" }}><Sidebar /><div className="flex items-center justify-center h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-green-600" /></div></div>;
  if (!appointment) return <div className="min-h-screen" style={{ background: "#f0f1f5" }}><Sidebar /><div className="flex items-center justify-center h-[60vh]"><p className="text-slate-500">Data janji tidak ditemukan.</p></div></div>;

  const handleCancel = async () => {
    await fetch(`/api/appointments/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "cancelled" }) });
    setAppointment(prev => prev ? { ...prev, status: "cancelled" } : null);
  };

  // Parse AI analysis
  let aiAnalysis: any = null;
  try {
    if (appointment.ai_analysis_result) {
      aiAnalysis = typeof appointment.ai_analysis_result === "string"
        ? JSON.parse(appointment.ai_analysis_result)
        : appointment.ai_analysis_result;
    }
  } catch { aiAnalysis = null; }

  const level = appointment.emergency_level || "routine";
  const priorityCfg = PRIORITY_CONFIG[level];
  const priorityLabel = EMERGENCY_LEVEL_LABELS[level];

  return (
    <div className="min-h-screen" style={{ background: "#f0f1f5" }}>
      <Sidebar />
      <main className="mx-auto max-w-3xl px-4 py-8 animate-fade-in">


        {appointment.emergency_level === "critical" && <EmergencyBanner />}

        {/* Main appointment card */}
        <Card className="border-0 shadow-sm mb-6">
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-emerald-600" />
                {aiAnalysis?.possibleCondition || "Janji Pemeriksaan Gigi"}
              </CardTitle>
              <div className="flex gap-2">
                <StatusBadge status={appointment.status} />
                <EmergencyBadge level={appointment.emergency_level} label={aiAnalysis?.emergencyLevel ?? null} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-green-600" />
                <div>
                  <p className="text-xs text-slate-400">Tanggal</p>
                  <p className="font-medium">{formatDate(appointment.appointment_date)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-green-600" />
                <div>
                  <p className="text-xs text-slate-400">Waktu</p>
                  <p className="font-medium">{formatTime(appointment.slot_time)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Stethoscope className="h-4 w-4 text-green-600" />
                <div>
                  <p className="text-xs text-slate-400">Dokter</p>
                  <p className="font-medium">Dr. {appointment.doctor?.user?.full_name}</p>
                </div>
              </div>
              {aiAnalysis?.estimatedCostLabel && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded">Rp</span>
                  <div>
                    <p className="text-xs text-slate-400">Estimasi Biaya</p>
                    <p className="font-medium text-green-600">{aiAnalysis.estimatedCostLabel}</p>
                  </div>
                </div>
              )}
            </div>

            {/* AI Analysis result */}
            {aiAnalysis && (
              <div className={`p-4 rounded-xl border ${priorityCfg.bg} ${priorityCfg.border}`}>
                <div className="flex items-center gap-2 mb-2">
                  <Brain className="h-4 w-4 text-slate-600" />
                  <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Hasil Analisis AI</span>
                  <span className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-md ${priorityCfg.badgeBg} ${priorityCfg.badgeText}`}>
                    <priorityCfg.Icon className="h-3.5 w-3.5" /> {priorityLabel}
                  </span>
                </div>
                {aiAnalysis.reason && <p className="text-sm text-slate-700 mb-2">{aiAnalysis.reason}</p>}
                {aiAnalysis.recommendation && (
                  <p className="text-sm font-medium text-slate-800 flex items-start gap-1">
                    <span className="text-blue-600">💡</span> {aiAnalysis.recommendation}
                  </p>
                )}
                {aiAnalysis.estimatedCostLabel && (
                  <p className="text-xs text-slate-500 mt-2">Estimasi biaya: <span className="font-semibold text-[#1a4a35]">{aiAnalysis.estimatedCostLabel}</span></p>
                )}
              </div>
            )}

            {appointment.symptom_description && (
              <div>
                <p className="text-xs text-slate-400 mb-1">Gejala</p>
                <p className="text-sm bg-slate-50 p-3 rounded-lg">{appointment.symptom_description}</p>
              </div>
            )}

            {appointment.status === "pending" && (
              <Button variant="destructive" onClick={handleCancel}>Batalkan Janji</Button>
            )}
          </CardContent>
        </Card>

        {/* Medical record */}
        {appointment.medical_record && (
          <Card className="border-0 shadow-lg rounded-3xl bg-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-green-600" />Rekam Medis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div><p className="text-xs text-slate-400">Diagnosis</p><p className="text-sm">{appointment.medical_record.diagnosis_notes}</p></div>
              <div><p className="text-xs text-slate-400">Tindakan</p><p className="text-sm">{appointment.medical_record.treatment_given}</p></div>
              {appointment.medical_record.medications_prescribed && (
                <div><p className="text-xs text-slate-400">Obat</p><p className="text-sm">{appointment.medical_record.medications_prescribed}</p></div>
              )}
              {appointment.medical_record.treatment_cost != null && (
                <div>
                  <p className="text-xs text-slate-400">Biaya Perawatan</p>
                  <p className="font-semibold text-green-600">{formatCurrency(appointment.medical_record.treatment_cost)}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
