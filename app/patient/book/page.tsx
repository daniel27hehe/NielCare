"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Sidebar } from "@/components/shared/Sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, formatDate, formatTime } from "@/lib/utils/formatters";
import { generateTimeSlots, filterPastSlots, filterBookedSlots, isDateInPast, getDayOfWeek } from "@/lib/utils/timeSlots";
import { EMERGENCY_LEVEL_LABELS } from "@/types";
import type { Doctor, DoctorSchedule, BookingState, AIAnalysisResult } from "@/types";
import { ArrowLeft, ArrowRight, Check, Loader2, Calendar, Clock, Stethoscope, Brain, AlertCircle, XCircle, Siren, AlertTriangle, CheckCircle } from "lucide-react";

const SPECIALIZATIONS = [
  { id: "General Dentist", label: "Dokter Gigi Umum", title: "" },
  { id: "Orthodontist", label: "Ortodontis", title: "Sp.Ort" },
  { id: "Periodontist", label: "Periodonsia", title: "Sp.Perio" },
  { id: "Endodontist", label: "Endodontis", title: "Sp.KG" },
  { id: "Prosthodontist", label: "Prostodontis", title: "Sp.Pros" },
  { id: "Oral Surgeon", label: "Bedah Mulut", title: "Sp.BM" },
  { id: "Pediatric Dentist", label: "Dokter Gigi Anak", title: "Sp.KGA" },
];

const PRIORITY_CONFIG = {
  critical: { bg: "bg-red-50", border: "border-red-200", badgeBg: "bg-red-100", badgeText: "text-red-700", Icon: Siren },
  moderate: { bg: "bg-amber-50", border: "border-amber-200", badgeBg: "bg-amber-100", badgeText: "text-amber-700", Icon: AlertTriangle },
  routine:  { bg: "bg-blue-50",  border: "border-blue-200",  badgeBg: "bg-blue-100",  badgeText: "text-blue-700",  Icon: CheckCircle },
};

export default function BookAppointmentPage() {
  const router = useRouter();
  const supabase = createClient();
  const [step, setStep] = useState(1);
  const [booking, setBooking] = useState<BookingState>({ step: 1 });
  const [allDoctors, setAllDoctors] = useState<Doctor[]>([]);
  const [filteredDoctors, setFilteredDoctors] = useState<Doctor[]>([]);
  const [schedules, setSchedules] = useState<DoctorSchedule[]>([]);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [symptomError, setSymptomError] = useState(""); // validation error for symptom input
  const [loadingSchedules, setLoadingSchedules] = useState(false);

  // Load all doctors once at step 2
  useEffect(() => {
    async function loadDoctors() {
      const res = await fetch("/api/doctors");
      if (res.ok) {
        const data = await res.json();
        setAllDoctors(data);
      }
    }
    if (step === 2) loadDoctors();
  }, [step]);

  // Filter doctors when allDoctors or AI result changes
  useEffect(() => {
    if (!allDoctors.length) return;
    const recSpec = booking.aiAnalysis?.recommendedSpecialization;
    if (recSpec) {
      const matched = allDoctors.filter(d => d.specialization === recSpec);
      // Fallback to General Dentist if no match, then all
      if (matched.length > 0) {
        setFilteredDoctors(matched);
      } else {
        const general = allDoctors.filter(d => d.specialization === "General Dentist");
        setFilteredDoctors(general.length > 0 ? general : allDoctors);
      }
    } else {
      setFilteredDoctors(allDoctors);
    }
  }, [allDoctors, booking.aiAnalysis]);

  // Load schedules when doctor selected
  useEffect(() => {
    async function loadSchedules() {
      if (!booking.doctor) return;
      setLoadingSchedules(true);
      const { data } = await supabase.from("doctor_schedules").select("*").eq("doctor_id", booking.doctor.id).eq("is_available", true);
      setSchedules(data as DoctorSchedule[] || []);
      setLoadingSchedules(false);
    }
    if (booking.doctor) loadSchedules();
  }, [booking.doctor]);

  useEffect(() => {
    async function loadSlots() {
      if (!booking.doctor || !booking.date) return;
      const dayOfWeek = getDayOfWeek(new Date(booking.date));
      const daySchedule = schedules.find(s => s.day_of_week === dayOfWeek);
      if (!daySchedule) { setAvailableSlots([]); return; }
      const allSlots = generateTimeSlots(daySchedule.start_time, daySchedule.end_time, daySchedule.slot_duration_minutes);
      const afterPast = filterPastSlots(allSlots, booking.date);
      const { data: booked } = await supabase.from("appointments").select("slot_time").eq("doctor_id", booking.doctor.id).eq("appointment_date", booking.date).in("status", ["pending", "approved"]);
      const bookedTimes = booked?.map((b: { slot_time: string }) => b.slot_time) || [];
      setAvailableSlots(filterBookedSlots(afterPast, bookedTimes));
    }
    loadSlots();
  }, [booking.date, schedules]);

  // ─── Frontend symptom validator ───────────────────────────────────────────
  const validateSymptomInput = (text: string): string => {
    const trimmed = text.trim();

    // 1. Minimum length
    if (trimmed.length < 10) {
      return "Keluhan terlalu singkat. Ceritakan gejala Anda minimal 10 karakter.";
    }
    // 2. Maximum length sanity check
    if (trimmed.length > 1000) {
      return "Keluhan terlalu panjang (maksimal 1000 karakter).";
    }
    // 3. All digits / special chars only
    if (/^[\d\s\W]+$/.test(trimmed)) {
      return "Input tidak valid. Ceritakan keluhan gigi Anda dengan kata-kata.";
    }
    // 4. Detect common non-symptom patterns
    const NON_SYMPTOM_PATTERNS = [
      /^(tes|test|testing|halo|hallo|hello|hi|hai|hey|yo|hei)\b/i,
      /^(coba|cobain|try|cek|check)\b/i,
      /^(asd|qwe|zxc|asdf|qwerty|abc|xxx|zzz|123|111|000)/i,
      /^[a-z]{1,4}\s*[a-z]{0,4}$/i,   // very short random chars like "abc def"
    ];
    for (const pattern of NON_SYMPTOM_PATTERNS) {
      if (pattern.test(trimmed)) {
        return "Input terdeteksi bukan keluhan gigi. Harap ceritakan gejala atau keluhan gigi yang Anda alami.";
      }
    }
    // 5. Must have at least 2 real words
    const words = trimmed.split(/\s+/).filter(w => w.length > 1);
    if (words.length < 2) {
      return "Terlalu singkat. Tolong ceritakan gejala Anda lebih lengkap (minimal 2 kata).";
    }
    // 6. Detect purely greeting/question sentences unrelated to health
    const QUESTION_NONHEALTH = [
      /^(apa|siapa|kapan|dimana|kenapa|bagaimana|berapa)\s+(itu|ini|kabar|nama|harga|kamu|anda)/i,
      /^(tolong|please|boleh|bisa)\s+(bantu|help|tanya|tanyain)/i,
    ];
    for (const pattern of QUESTION_NONHEALTH) {
      if (pattern.test(trimmed)) {
        return "Sistem ini hanya menerima keluhan gigi. Harap ceritakan gejala gigi atau mulut yang Anda rasakan.";
      }
    }
    return ""; // valid
  };

  const handleAnalyzeSymptoms = async () => {
    setSymptomError("");
    const validationMsg = validateSymptomInput(booking.symptoms || "");
    if (validationMsg) {
      setSymptomError(validationMsg);
      return;
    }
    setAnalyzing(true);
    try {
      const res = await fetch("/api/ai/analyze-symptoms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symptoms: booking.symptoms })
      });
      const aiResult = await res.json();

      // Handle AI-level validation rejection (backend says not a dental symptom)
      if (!res.ok || aiResult.isValidSymptom === false) {
        setSymptomError(
          aiResult.rejectionReason ||
          "Input tidak dikenali sebagai keluhan gigi. Harap ceritakan gejala gigi atau mulut yang Anda rasakan."
        );
        setAnalyzing(false);
        return;
      }

      setBooking(prev => ({ ...prev, emergencyLevel: aiResult.emergencyLevel, aiAnalysis: aiResult }));
      setStep(2);
    } catch (e) {
      console.error("AI Analysis failed", e);
      setSymptomError("Gagal menghubungi server analisis. Silakan coba lagi.");
    }
    setAnalyzing(false);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setBookingError("");
    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctor_id: booking.doctor!.id,
          appointment_date: booking.date,
          slot_time: booking.time + ":00",
          symptom_description: booking.symptoms || null,
          emergency_level: booking.emergencyLevel || "routine",
          ai_analysis_result: booking.aiAnalysis ? JSON.stringify(booking.aiAnalysis) : null,
        }),
      });
      if (res.ok) { router.push("/patient/appointments"); router.refresh(); }
      else { const e = await res.json(); setBookingError(e.error || "Booking gagal. Coba lagi."); }
    } catch { setBookingError("Gagal terhubung ke server."); }
    setSubmitting(false);
  };

  const today = new Date().toISOString().split("T")[0];
  const level = booking.emergencyLevel || "routine";
  const priorityCfg = PRIORITY_CONFIG[level];
  const stepLabels = ["Gejala & AI", "Pilih Dokter & Waktu", "Konfirmasi"];
  const DAYS_OF_WEEK = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

  return (
    <div className="min-h-screen" style={{ background: "#f0f1f5" }}>
      <Sidebar />
      <main className="mx-auto max-w-3xl px-4 py-8 animate-fade-in">
        <div className="mb-6">
          <h1 className="text-3xl font-bold" style={{ color: "#1a4a35" }}>Buat Janji</h1>
        </div>

        {/* Progress Bar */}
        <div className="flex items-center gap-2 mb-3">
          {[1, 2, 3].map(s => (
            <div key={s} className="flex-1"><div className={`h-2 rounded-full transition-all ${s <= step ? "bg-[#1a4a35]" : "bg-slate-200"}`} /></div>
          ))}
        </div>
        <div className="text-[10px] sm:text-xs text-slate-500 mb-8 flex justify-between px-1">
          {stepLabels.map((label, i) => (
            <span key={i} className={step >= i + 1 ? "font-bold text-[#1a4a35]" : "font-medium"}>{label}</span>
          ))}
        </div>

        {/* ─── STEP 1: Symptoms ─── */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-md p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-xl bg-[#1a4a35]/10 flex items-center justify-center">
                  <Brain className="h-5 w-5" style={{ color: "#1a4a35" }} />
                </div>
                <div>
                  <p className="text-lg font-bold text-slate-800">Ceritakan Keluhan Anda</p>
                  <p className="text-sm text-slate-500">AI akan menganalisis gejala dan merekomendasikan dokter yang tepat</p>
                </div>
              </div>

              <div className="bg-[#e8f0ea] border border-[#1a4a35]/20 rounded-xl p-4 mb-4">
                <p className="text-xs font-semibold text-[#1a4a35] uppercase tracking-wider mb-2">💡 Contoh keluhan (klik untuk tambah):</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    "Sakit gigi parah tidak tertahankan",
                    "Gusi berdarah dan bengkak",
                    "Gigi berlubang dan sensitif",
                    "Kontrol rutin 6 bulanan",
                    "Ingin pasang behel gigi",
                    "Gigi berlubang dalam, ngilu",
                    "Gigi palsu longgar / copot",
                    "Sakit gigi anak",
                  ].map(ex => (
                    <button key={ex} onClick={() => setBooking(p => ({ ...p, symptoms: p.symptoms ? p.symptoms + ", " + ex : ex }))}
                      className="text-xs bg-white/80 hover:bg-white border border-[#1a4a35]/20 hover:border-[#1a4a35]/50 text-slate-700 hover:text-[#1a4a35] px-3 py-1.5 rounded-lg transition-all">
                      {ex}
                    </button>
                  ))}
                </div>
              </div>

              <Textarea
                className={`rounded-xl min-h-[120px] transition-colors ${
                  symptomError
                    ? "border-red-300 focus:ring-red-300 focus:border-red-300 bg-red-50"
                    : "border-slate-200 focus:ring-[#1a4a35] focus:border-[#1a4a35]"
                }`}
                placeholder="Ceritakan keluhan Anda... (contoh: sakit gigi sebelah kanan, berdenyut, sudah 2 hari, tidak bisa tidur)"
                value={booking.symptoms || ""}
                onChange={e => {
                  setBooking(prev => ({ ...prev, symptoms: e.target.value }));
                  if (symptomError) setSymptomError(""); // clear error on change
                }}
                rows={5}
              />

              {/* Character counter */}
              <div className="flex items-center justify-between mt-1">
                <span className={`text-xs ${
                  (booking.symptoms || "").length < 10 ? "text-slate-400" : "text-green-600"
                }`}>
                  {(booking.symptoms || "").length} / 1000 karakter
                  {(booking.symptoms || "").length < 10 && " (minimal 10)"}
                </span>
              </div>

              {/* Validation error message */}
              {symptomError && (
                <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl mt-3">
                  <XCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-red-700">Input Tidak Valid</p>
                    <p className="text-sm text-red-600 mt-0.5">{symptomError}</p>
                  </div>
                </div>
              )}

              <div className="flex justify-end mt-4">
                <Button onClick={handleAnalyzeSymptoms} disabled={!booking.symptoms?.trim() || analyzing}
                  className="rounded-xl text-white px-6 flex items-center gap-2" style={{ background: "#1a4a35" }}>
                  {analyzing
                    ? <><Loader2 className="h-4 w-4 animate-spin" /><span>Menganalisis...</span></>
                    : <><Brain className="h-4 w-4" /><span>Analisis dengan AI</span><ArrowRight className="h-4 w-4" /></>
                  }
                </Button>
              </div>
            </div>

            {analyzing && (
              <div className="bg-white rounded-2xl shadow-sm p-5 flex items-center gap-4">
                <Loader2 className="h-6 w-6 animate-spin text-[#1a4a35]" />
                <div>
                  <p className="font-semibold text-slate-800">AI sedang menganalisis keluhan Anda...</p>
                  <p className="text-sm text-slate-500">Mohon tunggu sebentar</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── STEP 2: Doctor (filtered by AI specialization) ─── */}
        {step === 2 && (
          <div className="space-y-4">
            {/* AI Result Card */}
            {booking.aiAnalysis && (
              <div className={`rounded-2xl p-5 border ${priorityCfg.bg} ${priorityCfg.border}`}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-md ${priorityCfg.badgeBg} ${priorityCfg.badgeText}`}>
                        <priorityCfg.Icon className="h-3.5 w-3.5" /> {EMERGENCY_LEVEL_LABELS[level]}
                      </span>
                      <span className="text-xs text-slate-500 font-semibold">Hasil Analisis AI</span>
                    </div>
                    <p className="text-base font-bold text-slate-800 mt-1">{booking.aiAnalysis.possibleCondition}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wide">Estimasi Biaya</p>
                    <p className="font-bold text-base" style={{ color: "#1a4a35" }}>
                      {booking.aiAnalysis.estimatedCostLabel}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed">{booking.aiAnalysis.reason}</p>
                <div className="flex items-start gap-2 mt-2 p-3 bg-white/60 rounded-xl">
                  <span className="text-blue-600 mt-0.5">💡</span>
                  <p className="text-sm font-medium text-slate-800">{booking.aiAnalysis.recommendation}</p>
                </div>
              </div>
            )}

            {/* Doctor filter info */}
            {booking.aiAnalysis?.recommendedSpecialization && (
              <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-center gap-3">
                <Stethoscope className="h-4 w-4 text-[#1a4a35] flex-shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Spesialis yang Direkomendasikan AI</p>
                  <p className="font-semibold text-slate-800">
                    {SPECIALIZATIONS.find(s => s.id === booking.aiAnalysis?.recommendedSpecialization)?.label || booking.aiAnalysis.recommendedSpecialization}
                    {SPECIALIZATIONS.find(s => s.id === booking.aiAnalysis?.recommendedSpecialization)?.title
                      ? ` (${SPECIALIZATIONS.find(s => s.id === booking.aiAnalysis?.recommendedSpecialization)?.title})`
                      : ""}
                  </p>
                </div>
              </div>
            )}

            <p className="text-lg font-semibold text-slate-800">
              Pilih Dokter
              {filteredDoctors.length > 0 && (
                <span className="text-sm font-normal text-slate-400 ml-2">({filteredDoctors.length} dokter tersedia)</span>
              )}
            </p>

            {allDoctors.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl shadow-sm">
                <Loader2 className="h-8 w-8 animate-spin text-slate-300 mx-auto mb-3" />
                <p className="text-slate-400">Memuat daftar dokter...</p>
              </div>
            ) : filteredDoctors.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl shadow-sm">
                <Stethoscope className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                <p className="text-slate-500 font-medium mb-1">Tidak ada dokter dengan spesialisasi ini.</p>
                <p className="text-sm text-slate-400">Silakan ubah keluhan Anda atau hubungi admin klinik.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredDoctors.map(doctor => {
                  const specData = SPECIALIZATIONS.find(s => s.id === doctor.specialization);
                  const title = specData?.title ? `, ${specData.title}` : "";
                  const specLabel = specData?.label || doctor.specialization;
                  const isSelected = booking.doctor?.id === doctor.id;
                  const availableDays = [...new Set(schedules.map(s => DAYS_OF_WEEK[s.day_of_week]))].join(", ");

                  return (
                    <Card key={doctor.id}
                      className={`transition-all border-0 rounded-2xl shadow-md ${isSelected ? "ring-2 ring-[#1a4a35] bg-white" : "hover:shadow-lg bg-white cursor-pointer"}`}>
                      <CardContent className="p-0">
                        <div className={`p-5 flex items-center gap-4 ${isSelected ? "bg-[#e8f0ea] rounded-t-2xl border-b border-[#1a4a35]/10" : ""}`}
                             onClick={() => { if (!isSelected) { setBooking(prev => ({ ...prev, doctor, date: undefined, time: undefined })); } }}>
                          <div className="h-14 w-14 rounded-2xl bg-[#1a4a35]/10 flex items-center justify-center flex-shrink-0">
                            <Stethoscope className="h-6 w-6" style={{ color: "#1a4a35" }} />
                          </div>
                          <div>
                            <h3 className="font-semibold text-slate-900">Dr. {doctor.user?.full_name}{title}</h3>
                            <p className="text-sm text-slate-500">{specLabel}</p>
                            <p className="text-xs text-slate-400">{doctor.years_experience} tahun pengalaman</p>
                          </div>
                        </div>

                        {isSelected && (
                          <div className="p-5 animate-in slide-in-from-top-4 fade-in duration-200">
                            <div className="mb-4 p-3 bg-slate-50 rounded-xl">
                              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Jadwal Praktik</p>
                              {loadingSchedules ? (
                                <p className="text-sm text-slate-400 italic flex items-center gap-2"><Loader2 className="h-3 w-3 animate-spin" />Memuat jadwal...</p>
                              ) : schedules.length > 0 ? (
                                <p className="text-sm font-medium text-slate-800">{availableDays}</p>
                              ) : (
                                <p className="text-sm text-red-500 font-medium">Belum ada jadwal yang diatur oleh dokter ini.</p>
                              )}
                            </div>

                            <div className="space-y-4">
                              <div className="space-y-2">
                                <label className="text-sm font-semibold tracking-wide text-slate-700 flex items-center gap-2">
                                  <Calendar className="h-4 w-4" style={{ color: "#1a4a35" }} />Pilih Tanggal
                                </label>
                                <Input className="rounded-xl border-slate-200 focus:ring-[#1a4a35] focus:border-[#1a4a35] h-12" type="date" min={today}
                                  value={booking.date || ""} onChange={e => { if (!isDateInPast(new Date(e.target.value))) setBooking(prev => ({ ...prev, date: e.target.value, time: undefined })); }} />
                              </div>

                              {booking.date && (
                                <div className="pt-2">
                                  <label className="text-sm font-semibold tracking-wide text-slate-700 flex items-center gap-2 mb-3">
                                    <Clock className="h-4 w-4" style={{ color: "#1a4a35" }} />Slot Waktu
                                  </label>
                                  {availableSlots.length === 0
                                    ? <p className="text-sm text-slate-500 py-3 text-center bg-red-50 text-red-600 rounded-xl">Tidak ada jadwal praktik di tanggal ini.</p>
                                    : <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                        {availableSlots.map(slot => (
                                          <button key={slot} onClick={() => setBooking(prev => ({ ...prev, time: slot }))}
                                            className={`py-2.5 px-2 rounded-xl text-sm font-bold transition-all ${booking.time === slot ? "text-white shadow-md" : "bg-white border-2 border-slate-100 text-slate-600 hover:border-[#1a4a35]/30 hover:bg-[#e8f0ea]"}`}
                                            style={booking.time === slot ? { background: "#1a4a35" } : {}}>
                                            {formatTime(slot)}
                                          </button>
                                        ))}
                                      </div>
                                  }
                                </div>
                              )}

                              <div className="flex justify-end pt-4 mt-4 border-t border-slate-100">
                                <Button onClick={() => setStep(3)} disabled={!booking.date || !booking.time} className="rounded-xl text-white px-6" style={{ background: "#1a4a35" }}>
                                  Review & Konfirmasi <ArrowRight className="h-4 w-4 ml-2" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            <div className="pt-2">
              <Button variant="outline" className="rounded-xl" onClick={() => setStep(1)}>
                <ArrowLeft className="h-4 w-4 mr-2" />Kembali
              </Button>
            </div>
          </div>
        )}

        {/* ─── STEP 3: Confirm ─── */}
        {step === 3 && (
          <div className="space-y-4">
            <p className="text-lg font-semibold text-slate-800">Review & Konfirmasi</p>
            <Card className="border-0 shadow-lg rounded-3xl bg-white">
              <CardContent className="p-8 space-y-5">
                {/* AI Summary */}
                {booking.aiAnalysis && (
                  <div className={`p-4 rounded-xl border ${priorityCfg.bg} ${priorityCfg.border}`}>
                    <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                      <span className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-md ${priorityCfg.badgeBg} ${priorityCfg.badgeText}`}>
                        <priorityCfg.Icon className="h-3.5 w-3.5" /> {EMERGENCY_LEVEL_LABELS[level]}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-sm px-2 py-0.5 bg-white/70 rounded-lg" style={{ color: "#1a4a35" }}>
                          Rp
                        </span>
                        <span className="font-bold text-sm" style={{ color: "#1a4a35" }}>{booking.aiAnalysis.estimatedCostLabel}</span>
                      </div>
                    </div>
                    <p className="font-semibold text-slate-800">{booking.aiAnalysis.possibleCondition}</p>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-[11px] font-semibold tracking-widest text-slate-500 uppercase">Dokter</p>
                    <p className="font-bold text-lg mt-1">
                      Dr. {booking.doctor?.user?.full_name}
                      {booking.doctor ? (SPECIALIZATIONS.find(s => s.id === booking.doctor!.specialization)?.title ? `, ${SPECIALIZATIONS.find(s => s.id === booking.doctor!.specialization)?.title}` : "") : ""}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold tracking-widest text-slate-500 uppercase">Spesialisasi</p>
                    <p className="font-semibold text-slate-700 mt-1">
                      {SPECIALIZATIONS.find(s => s.id === booking.doctor?.specialization)?.label || booking.doctor?.specialization}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold tracking-widest text-slate-500 uppercase">Tanggal</p>
                    <p className="font-bold text-lg mt-1">{booking.date ? formatDate(booking.date) : ""}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold tracking-widest text-slate-500 uppercase">Waktu</p>
                    <p className="font-bold text-lg mt-1">{booking.time ? formatTime(booking.time) : ""}</p>
                  </div>
                </div>

                {booking.symptoms && (
                  <div className="p-4 bg-[#f0f1f5] rounded-xl">
                    <p className="text-[11px] font-semibold tracking-widest text-slate-500 uppercase mb-2">Keluhan</p>
                    <p className="text-sm font-medium text-slate-800">{booking.symptoms}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex gap-3 pt-4">
              <Button variant="outline" className="rounded-xl" onClick={() => setStep(3)}>
                <ArrowLeft className="h-4 w-4 mr-2 hidden sm:inline" />Kembali
              </Button>
              <div className="ml-auto flex flex-col sm:flex-row items-end sm:items-center gap-2 sm:gap-4">
                {bookingError && <p className="text-xs sm:text-sm font-semibold text-red-500 bg-red-50 px-3 py-1 rounded-lg">{bookingError}</p>}
                <Button onClick={handleSubmit} disabled={submitting} className="rounded-xl text-white px-8 flex items-center" size="lg" style={{ background: "#1a4a35" }}>
                  {submitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /><span>Booking...</span></> : <><Check className="h-4 w-4 mr-2" /><span>Konfirmasi Booking</span></>}
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
