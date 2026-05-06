"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Sidebar } from "@/components/shared/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { StatusBadge, EmergencyBadge } from "@/components/shared/StatusBadge";
import { EmergencyBanner } from "@/components/shared/EmergencyBanner";
import { formatDate, formatTime, formatCurrency } from "@/lib/utils/formatters";
import { EMERGENCY_LEVEL_LABELS } from "@/types";
import type { Appointment, MedicalRecord } from "@/types";
import { Loader2, ArrowLeft, Check, X, FileText, Brain, AlertTriangle, TrendingUp, TrendingDown } from "lucide-react";
import Link from "next/link";

// Parse min/max from estimatedCostLabel like "Rp 300.000 – Rp 600.000"
function parseEstimatedRange(label: string | undefined): { min: number; max: number } | null {
  if (!label) return null;
  const numbers = label.replace(/\./g, "").match(/\d+/g);
  if (!numbers || numbers.length < 2) return null;
  return { min: parseInt(numbers[0]), max: parseInt(numbers[1]) };
}

function CostWarning({ cost, aiLabel }: { cost: number; aiLabel?: string }) {
  const range = parseEstimatedRange(aiLabel);
  if (!range || !cost) return null;

  if (cost > range.max) {
    const excess = formatCurrency(cost - range.max);
    return (
      <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl mt-2">
        <TrendingUp className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-semibold text-amber-700">Biaya Melebihi Estimasi AI</p>
          <p className="text-xs text-amber-600 mt-0.5">
            Biaya yang dimasukkan <strong>{formatCurrency(cost)}</strong> melebihi batas atas estimasi AI (<strong>{aiLabel}</strong>) sebesar <strong>{excess}</strong>.
            Pastikan ada alasan klinis yang mendukung.
          </p>
        </div>
      </div>
    );
  }
  if (cost < range.min) {
    const diff = formatCurrency(range.min - cost);
    return (
      <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-xl mt-2">
        <TrendingDown className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-semibold text-blue-700">Biaya Di Bawah Estimasi AI</p>
          <p className="text-xs text-blue-600 mt-0.5">
            Biaya yang dimasukkan <strong>{formatCurrency(cost)}</strong> berada di bawah batas bawah estimasi AI (<strong>{aiLabel}</strong>) sebesar <strong>{diff}</strong>.
          </p>
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-xl mt-2">
      <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
      <p className="text-xs font-semibold text-green-700">Biaya sesuai dengan estimasi AI ✓</p>
    </div>
  );
}

export default function DoctorAppointmentDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [appointment, setAppointment] = useState<Appointment & { medical_record?: MedicalRecord } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [record, setRecord] = useState({
    diagnosis_notes: "",
    treatment_given: "",
    medications_prescribed: "",
    treatment_cost: "",
  });

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
            treatment_cost: data.medical_record.treatment_cost?.toString() || "",
          });
        } else {
          // Pre-fill treatment_cost from AI estimate
          try {
            const ai = data.ai_analysis_result
              ? (typeof data.ai_analysis_result === "string" ? JSON.parse(data.ai_analysis_result) : data.ai_analysis_result)
              : null;
            if (ai?.estimatedCost) {
              setRecord(prev => ({ ...prev, treatment_cost: ai.estimatedCost.toString() }));
            }
          } catch { /* ignore */ }
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
          treatment_cost: record.treatment_cost ? parseInt(record.treatment_cost.replace(/\D/g, "")) : 0,
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
      alert("Gagal menghubungi server. Periksa koneksi internet Anda.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen" style={{ background: "#f0f1f5" }}>
      <Sidebar />
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
      </div>
    </div>
  );
  if (!appointment) return (
    <div className="min-h-screen" style={{ background: "#f0f1f5" }}>
      <Sidebar />
      <div className="flex items-center justify-center h-[60vh]">
        <p className="text-slate-500">Data janji tidak ditemukan.</p>
      </div>
    </div>
  );

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
  const priorityLabel = EMERGENCY_LEVEL_LABELS[level];
  const appointmentTitle = aiAnalysis?.possibleCondition || appointment.symptom_description?.slice(0, 50) || "Janji Pemeriksaan Gigi";
  const costValue = parseInt((record.treatment_cost || "").replace(/\D/g, "")) || 0;

  return (
    <div className="min-h-screen" style={{ background: "#f0f1f5" }}>
      <Sidebar />
      <main className="mx-auto max-w-3xl px-4 py-8 animate-fade-in">

        {appointment.emergency_level === "critical" && <EmergencyBanner />}

        {/* Appointment Info Card */}
        <Card className="border-0 shadow-sm mb-6">
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <CardTitle className="flex items-center gap-2 text-base leading-snug">
                <Brain className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                {appointmentTitle}
              </CardTitle>
              <div className="flex gap-2 flex-shrink-0">
                <StatusBadge status={appointment.status} />
                <EmergencyBadge level={appointment.emergency_level} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-400">Pasien</p>
                <p className="font-medium">{appointment.patient?.full_name}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Tanggal</p>
                <p className="font-medium">{formatDate(appointment.appointment_date)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Waktu</p>
                <p className="font-medium">{formatTime(appointment.slot_time)}</p>
              </div>
              {aiAnalysis?.estimatedCostLabel && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded">Rp</span>
                  <div>
                    <p className="text-xs text-slate-400">Estimasi AI</p>
                    <p className="font-medium text-green-600">{aiAnalysis.estimatedCostLabel}</p>
                  </div>
                </div>
              )}
            </div>

            {appointment.symptom_description && (
              <div>
                <p className="text-xs text-slate-400">Keluhan Pasien</p>
                <p className="text-sm mt-1 p-3 bg-slate-50 rounded-lg">{appointment.symptom_description}</p>
              </div>
            )}

            {aiAnalysis && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
                <div className="flex items-center gap-2 mb-1">
                  <Brain className="h-4 w-4 text-blue-600" />
                  <p className="text-xs text-blue-600 font-semibold uppercase tracking-wide">Analisis AI — {priorityLabel}</p>
                </div>
                {aiAnalysis.reason && <p className="text-sm mt-1 text-slate-700">{aiAnalysis.reason}</p>}
                {aiAnalysis.recommendation && <p className="text-sm text-slate-600 mt-1">💡 {aiAnalysis.recommendation}</p>}
              </div>
            )}

            {appointment.status === "pending" && (
              <div className="flex gap-3 pt-2">
                <Button onClick={() => updateStatus("approved")} disabled={saving} className="bg-green-600 hover:bg-green-700 text-white">
                  <Check className="h-4 w-4 mr-1" /> Setujui
                </Button>
                <Button variant="destructive" onClick={() => updateStatus("rejected")} disabled={saving}>
                  <X className="h-4 w-4 mr-1" /> Tolak
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Treatment Form (only when approved & no record yet) */}
        {appointment.status === "approved" && !appointment.medical_record && (
          <Card className="border-0 shadow-lg rounded-3xl bg-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-green-600" />
                Catat Hasil Perawatan
              </CardTitle>
              <p className="text-sm text-slate-500 mt-1">Isi formulir ini setelah perawatan selesai untuk menutup janji.</p>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label>Catatan Diagnosis <span className="text-red-500">*</span></Label>
                <Textarea
                  value={record.diagnosis_notes}
                  onChange={e => setRecord(p => ({ ...p, diagnosis_notes: e.target.value }))}
                  placeholder="Tulis diagnosis atau temuan klinis..."
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label>Tindakan yang Diberikan <span className="text-red-500">*</span></Label>
                <Textarea
                  value={record.treatment_given}
                  onChange={e => setRecord(p => ({ ...p, treatment_given: e.target.value }))}
                  placeholder="Tulis tindakan/perawatan yang dilakukan..."
                  className="rounded-xl"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Obat yang Diresepkan <span className="text-red-500">*</span></Label>
                  <Input
                    value={record.medications_prescribed}
                    onChange={e => setRecord(p => ({ ...p, medications_prescribed: e.target.value }))}
                    placeholder="Tulis nama obat beserta dosisnya..."
                    className="rounded-xl"
                  />
                </div>

                {/* Treatment Cost with AI Range Reference */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    Biaya Perawatan (Rp)
                    {aiAnalysis?.estimatedCostLabel && (
                      <span className="text-xs font-normal text-slate-400">
                        Estimasi AI: {aiAnalysis.estimatedCostLabel}
                      </span>
                    )}
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    value={record.treatment_cost}
                    onChange={e => setRecord(p => ({ ...p, treatment_cost: e.target.value }))}
                    placeholder={aiAnalysis?.estimatedCost ? aiAnalysis.estimatedCost.toString() : "0"}
                    className="rounded-xl"
                  />
                  {/* Show warning/OK if cost is entered and AI range exists */}
                  {costValue > 0 && aiAnalysis?.estimatedCostLabel && (
                    <CostWarning cost={costValue} aiLabel={aiAnalysis.estimatedCostLabel} />
                  )}
                  {!record.treatment_cost && aiAnalysis?.estimatedCostLabel && (
                    <p className="text-xs text-slate-400 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Dikosongkan = otomatis pakai estimasi AI ({aiAnalysis.estimatedCostLabel})
                    </p>
                  )}
                </div>
              </div>

              <Button
                onClick={saveRecord}
                disabled={saving || !record.diagnosis_notes || !record.treatment_given || !record.medications_prescribed}
                className="w-full sm:w-auto rounded-xl bg-green-600 hover:bg-green-700 text-white"
                size="lg"
              >
                {saving
                  ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /><span>Menyimpan...</span></>
                  : <><Check className="h-4 w-4 mr-2" /><span>Selesaikan & Simpan Rekam Medis</span></>
                }
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Existing Medical Record (view mode) */}
        {appointment.medical_record && (
          <Card className="border-0 shadow-lg rounded-3xl bg-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-green-600" /> Rekam Medis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs text-slate-400">Diagnosis</p>
                <p className="text-sm">{appointment.medical_record.diagnosis_notes}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Tindakan</p>
                <p className="text-sm">{appointment.medical_record.treatment_given}</p>
              </div>
              {appointment.medical_record.medications_prescribed && (
                <div>
                  <p className="text-xs text-slate-400">Obat</p>
                  <p className="text-sm">{appointment.medical_record.medications_prescribed}</p>
                </div>
              )}
              {appointment.medical_record.treatment_cost != null && (
                <div>
                  <p className="text-xs text-slate-400">Biaya Perawatan</p>
                  <p className="font-semibold text-green-700">{formatCurrency(appointment.medical_record.treatment_cost)}</p>
                  {aiAnalysis?.estimatedCostLabel && (
                    <CostWarning cost={appointment.medical_record.treatment_cost} aiLabel={aiAnalysis.estimatedCostLabel} />
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
