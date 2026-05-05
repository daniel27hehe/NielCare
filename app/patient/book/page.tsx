"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Navbar } from "@/components/shared/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { EmergencyBadge } from "@/components/shared/StatusBadge";
import { formatCurrency, formatDate, formatTime } from "@/lib/utils/formatters";
import { generateTimeSlots, filterPastSlots, filterBookedSlots, isDateInPast, getDayOfWeek } from "@/lib/utils/timeSlots";
import type { Service, Doctor, DoctorSchedule, BookingState } from "@/types";
import { ArrowLeft, ArrowRight, Check, Loader2, Calendar, Clock, Stethoscope } from "lucide-react";

const SPECIALIZATIONS = [
  { id: "General Dentist", label: "General Dentist", title: "" },
  { id: "Orthodontist", label: "Orthodontist", title: "Sp.Ort" },
  { id: "Periodontist", label: "Periodontist", title: "Sp.Perio" },
  { id: "Endodontist", label: "Endodontist", title: "Sp.KG" },
  { id: "Prosthodontist", label: "Prosthodontist", title: "Sp.Pros" },
  { id: "Oral Surgeon", label: "Oral Surgeon", title: "Sp.BM" },
  { id: "Pediatric Dentist", label: "Pediatric Dentist", title: "Sp.KGA" },
];

// Mapping exact service name → compatible specializations
const SERVICE_NAME_SPEC_MAP: Record<string, string[]> = {
  "Emergency Toothache": ["General Dentist", "Periodontist", "Endodontist", "Oral Surgeon", "Pediatric Dentist"],
  "Tooth Extraction": ["General Dentist", "Orthodontist", "Periodontist", "Endodontist", "Prosthodontist", "Oral Surgeon", "Pediatric Dentist"],
  "Tooth Filling": ["General Dentist", "Endodontist", "Prosthodontist", "Pediatric Dentist"],
  "Scaling & Cleaning": ["General Dentist", "Periodontist", "Pediatric Dentist"],
  "Dental Consultation": ["General Dentist", "Orthodontist", "Periodontist", "Endodontist", "Prosthodontist", "Oral Surgeon", "Pediatric Dentist"],
  "Braces Fitting": ["Orthodontist", "Pediatric Dentist"],
};

// 3 common symptom examples for each service
const SERVICE_SYMPTOM_EXAMPLES: Record<string, string[]> = {
  "Emergency Toothache": [
    "Severe, unbearable pain",
    "Swollen gums with pus",
    "Sharp pain when chewing"
  ],
  "Tooth Extraction": [
    "Wisdom tooth pain or impaction",
    "Severely loose tooth",
    "Broken tooth root remaining"
  ],
  "Tooth Filling": [
    "Visible black hole or cavity",
    "Sensitivity to cold or sweet",
    "Food frequently gets stuck"
  ],
  "Scaling & Cleaning": [
    "Bleeding gums when brushing",
    "Persistent bad breath",
    "Visible yellow or black tartar"
  ],
  "Dental Consultation": [
    "Routine 6-month dental checkup",
    "Questions about specific treatment",
    "Consultation for jaw/gum issues"
  ],
  "Braces Fitting": [
    "Crooked or spaced front teeth",
    "Uneven jaw or bite alignment",
    "Consultation for new braces"
  ]
};


export default function BookAppointmentPage() {
  const router = useRouter();
  const supabase = createClient();
  const [step, setStep] = useState(1);
  const [booking, setBooking] = useState<BookingState>({ step: 1 });
  const [services, setServices] = useState<Service[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [schedules, setSchedules] = useState<DoctorSchedule[]>([]);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState("");
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    async function loadServices() {
      const { data } = await supabase.from("services").select("*").eq("is_active", true);
      if (data) setServices(data as Service[]);
    }
    loadServices();
  }, []);

  useEffect(() => {
    async function loadDoctors() {
      const res = await fetch("/api/doctors");
      if (res.ok) {
        const data = await res.json();
        // Filter by compatible specializations for the selected service name
        const serviceName = booking.service?.name || "";
        const compatibleSpecs = SERVICE_NAME_SPEC_MAP[serviceName] || [];
        const filtered = data.filter((d: Doctor) =>
          compatibleSpecs.includes(d.specialization)
        );
        // If no filtered doctors, show none so we strictly follow the mapping
        setDoctors(filtered);
      }
    }
    if (step === 3) loadDoctors();
  }, [step, booking.service]);

  useEffect(() => {
    async function loadSchedules() {
      if (!booking.doctor) return;
      const { data } = await supabase.from("doctor_schedules").select("*").eq("doctor_id", booking.doctor.id).eq("is_available", true);
      if (data) setSchedules(data as DoctorSchedule[]);
    }
    if (step === 4 && booking.doctor) loadSchedules();
  }, [step, booking.doctor]);

  useEffect(() => {
    async function loadSlots() {
      if (!booking.doctor || !booking.date) return;
      const selectedDate = new Date(booking.date);
      const dayOfWeek = getDayOfWeek(selectedDate);
      const daySchedule = schedules.find(s => s.day_of_week === dayOfWeek);
      if (!daySchedule) { setAvailableSlots([]); return; }
      const allSlots = generateTimeSlots(daySchedule.start_time, daySchedule.end_time, daySchedule.slot_duration_minutes);
      const afterPast = filterPastSlots(allSlots, booking.date);
      const { data: booked } = await supabase.from("appointments").select("slot_time").eq("doctor_id", booking.doctor.id).eq("appointment_date", booking.date).in("status", ["pending", "approved"]);
      const bookedTimes = booked?.map((b: { slot_time: string }) => b.slot_time) || [];
      const available = filterBookedSlots(afterPast, bookedTimes);
      setAvailableSlots(available);
    }
    loadSlots();
  }, [booking.date, schedules]);



  const handleAnalyzeSymptoms = async () => {
    setAnalyzing(true);
    try {
      const res = await fetch("/api/ai/analyze-symptoms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symptoms: booking.symptoms,
          serviceName: booking.service?.name
        })
      });
      if (res.ok) {
        const aiResult = await res.json();
        setBooking(prev => ({
          ...prev,
          emergencyLevel: aiResult.emergencyLevel,
          aiAnalysis: aiResult
        }));
      }
    } catch (e) {
      console.error("AI Analysis failed", e);
    }
    setAnalyzing(false);
    setStep(3);
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
          service_id: booking.service!.id,
          appointment_date: booking.date,
          slot_time: booking.time + ":00",
          symptom_description: booking.symptoms || null,
          emergency_level: booking.emergencyLevel || "routine",
          ai_analysis_result: booking.aiAnalysis ? JSON.stringify(booking.aiAnalysis) : null,
        }),
      });
      if (res.ok) {
        router.push("/patient/appointments");
        router.refresh();
      } else {
        const errData = await res.json();
        setBookingError(errData.error || "Booking failed. Please try again.");
      }
    } catch (e) {
      setBookingError("Network error. Please check your connection.");
    }
    setSubmitting(false);
  };

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="min-h-screen" style={{ background: "#f0f1f5" }}>
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 py-8 animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold" style={{ color: "#1a4a35" }}>Book Appointment</h1>
          <Button variant="outline" size="sm" onClick={() => router.push("/patient/dashboard")} className="rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
          </Button>
        </div>
        {/* Progress Bar */}
        <div className="flex items-center gap-2 mb-8">
          {[1,2,3,4,5].map(s => (
            <div key={s} className="flex-1 flex items-center gap-2">
              <div className={`h-2 flex-1 rounded-full transition-all ${s <= step ? "bg-[#1a4a35]" : "bg-slate-200"}`} />
            </div>
          ))}
        </div>
        <div className="text-[10px] sm:text-sm text-slate-500 mb-8 flex justify-between px-1">
          <span className={step >= 1 ? "font-bold text-[#1a4a35]" : "font-medium"}>Service</span>
          <span className={step >= 2 ? "font-bold text-[#1a4a35]" : "font-medium"}>Symptoms</span>
          <span className={step >= 3 ? "font-bold text-[#1a4a35]" : "font-medium"}>Doctor</span>
          <span className={step >= 4 ? "font-bold text-[#1a4a35]" : "font-medium"}>Date/Time</span>
          <span className={step >= 5 ? "font-bold text-[#1a4a35]" : "font-medium"}>Confirm</span>
        </div>

        {/* Step 1: Service */}
        {step === 1 && (
          <div className="space-y-3">
            <p className="text-lg font-semibold text-slate-800 mb-4">Select a Service</p>
            {services.map(service => (
              <Card key={service.id} onClick={() => { setBooking(prev => ({ ...prev, service, symptoms: undefined, aiAnalysis: undefined, emergencyLevel: undefined })); setStep(2); }} className={`cursor-pointer transition-all border-0 rounded-2xl shadow-md ${booking.service?.id === service.id ? "ring-2 ring-[#1a4a35] bg-[#e8f0ea]" : "hover:shadow-lg bg-white"}`}>
                <CardContent className="p-5 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-900">{service.name}</h3>
                    <p className="text-sm text-slate-500">{service.description || `${service.duration_minutes} minutes`}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-xl" style={{ color: "#1a4a35" }}>{formatCurrency(service.base_price)}</p>
                    <p className="text-xs text-slate-400 mt-1">{service.duration_minutes} min session</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Step 2: Symptoms */}
        {step === 2 && (
          <div className="space-y-4">
            <p className="text-lg font-semibold text-slate-800">Describe Your Symptoms</p>
            <p className="text-sm text-slate-500">Please describe your symptoms so the doctor can prepare for your visit.</p>
            
            {booking.service && SERVICE_SYMPTOM_EXAMPLES[booking.service.name] && (
              <div className="bg-[#e8f0ea] p-4 rounded-xl border border-[#1a4a35]/20">
                <p className="text-xs font-semibold text-[#1a4a35] uppercase tracking-wider mb-2">Common Symptoms (Click to add):</p>
                <ul className="text-sm text-slate-700 space-y-2 list-none">
                  {SERVICE_SYMPTOM_EXAMPLES[booking.service.name].map((ex, i) => {
                    const localEx = ex;
                    return (
                      <li 
                        key={i} 
                        onClick={() => setBooking(p => ({ ...p, symptoms: p.symptoms ? p.symptoms + (p.symptoms.endsWith(', ') ? '' : ', ') + localEx : localEx }))}
                        className="cursor-pointer hover:text-[#1a4a35] flex items-center gap-2 transition-colors bg-white/60 p-2 rounded-lg hover:bg-white"
                      >
                        <div className="h-1.5 w-1.5 rounded-full bg-[#1a4a35]" />
                        {localEx}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            <Textarea className="rounded-xl border-slate-200 focus:ring-[#1a4a35] focus:border-[#1a4a35]" placeholder="Describe what you're experiencing... (or click the examples above)" value={booking.symptoms || ""} onChange={e => setBooking(prev => ({ ...prev, symptoms: e.target.value }))} rows={5} />
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="rounded-xl" onClick={() => setStep(1)} disabled={analyzing}><ArrowLeft className="h-4 w-4 mr-2" />Back</Button>
              <Button onClick={handleAnalyzeSymptoms} disabled={!booking.symptoms || analyzing} className="ml-auto rounded-xl text-white flex items-center" style={{ background: "#1a4a35" }}>
                {analyzing ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /><span>Analyzing...</span></> : <><span>Next</span> <ArrowRight className="h-4 w-4 ml-2" /></>}
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Doctor */}
        {step === 3 && (
          <div className="space-y-3">
            {booking.aiAnalysis && (
              <div className={`p-4 rounded-xl mb-4 border ${booking.emergencyLevel === 'critical' ? 'bg-red-50 border-red-200' : booking.emergencyLevel === 'moderate' ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-200'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-md ${booking.emergencyLevel === 'critical' ? 'bg-red-100 text-red-700' : booking.emergencyLevel === 'moderate' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                    {booking.emergencyLevel} Priority
                  </span>
                  <span className="text-xs text-slate-500 font-semibold">AI Analysis Result</span>
                </div>
                <p className="text-sm text-slate-700 mt-2 leading-relaxed">{booking.aiAnalysis.reason}</p>
                <p className="text-sm font-medium text-slate-900 mt-2 flex items-start gap-2">
                  <span className="text-blue-600">💡</span> {booking.aiAnalysis.recommendation}
                </p>
              </div>
            )}
            <p className="text-lg font-semibold text-slate-800 mb-1">Choose Your Doctor</p>
            <p className="text-sm text-slate-400 mb-4">
              Showing doctors matched to your selected service: <span className="font-semibold text-[#1a4a35]">{booking.service?.name}</span>
            </p>
            {doctors.map(doctor => {
              const specData = SPECIALIZATIONS.find(s => s.id === doctor.specialization);
              const title = specData?.title ? `, ${specData.title}` : "";
              return (
                <Card key={doctor.id} onClick={() => { setBooking(prev => ({ ...prev, doctor })); setStep(4); }} className={`cursor-pointer transition-all border-0 rounded-2xl shadow-md ${booking.doctor?.id === doctor.id ? "ring-2 ring-[#1a4a35] bg-[#e8f0ea]" : "hover:shadow-lg bg-white"}`}>
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className="h-14 w-14 rounded-2xl bg-[#1a4a35]/10 flex items-center justify-center"><Stethoscope className="h-6 w-6" style={{ color: "#1a4a35" }} /></div>
                    <div>
                      <h3 className="font-semibold text-slate-900">Dr. {doctor.user?.full_name}{title}</h3>
                      <p className="text-sm text-slate-500">{doctor.specialization}</p>
                      <p className="text-xs text-slate-400">{doctor.years_experience} years experience</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            <div className="pt-2">
              <Button variant="outline" className="rounded-xl" onClick={() => setStep(2)}><ArrowLeft className="h-4 w-4 mr-2" />Back</Button>
            </div>
          </div>
        )}

        {/* Step 4: Date & Time */}
        {step === 4 && (
          <div className="space-y-4">
            <p className="text-lg font-semibold text-slate-800">Select Date & Time</p>
            <div className="space-y-2">
              <label className="text-sm font-semibold tracking-wide text-slate-700 flex items-center gap-2"><Calendar className="h-4 w-4" style={{ color: "#1a4a35" }} />Date</label>
              <Input className="rounded-xl border-slate-200 focus:ring-[#1a4a35] focus:border-[#1a4a35] h-12" type="date" min={today} value={booking.date || ""} onChange={e => { const val = e.target.value; if (!isDateInPast(new Date(val))) setBooking(prev => ({ ...prev, date: val, time: undefined })); }} />
            </div>
            {booking.date && (
              <div className="pt-4">
                <label className="text-sm font-semibold tracking-wide text-slate-700 flex items-center gap-2 mb-3"><Clock className="h-4 w-4" style={{ color: "#1a4a35" }} />Available Time Slots</label>
                {availableSlots.length === 0 ? (
                  <p className="text-sm text-slate-400 py-4 text-center">No available slots for this date. The doctor may not be available.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {availableSlots.map(slot => (
                      <button key={slot} onClick={() => setBooking(prev => ({ ...prev, time: slot }))} className={`py-3 px-3 rounded-xl text-sm font-bold transition-all ${booking.time === slot ? "text-white shadow-lg" : "bg-white border-2 border-slate-100 text-slate-600 hover:border-[#1a4a35]/30 hover:bg-[#e8f0ea]"}`} style={booking.time === slot ? { background: "#1a4a35" } : {}}>
                        {formatTime(slot)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div className="flex gap-3 pt-4">
              <Button variant="outline" className="rounded-xl" onClick={() => setStep(3)}><ArrowLeft className="h-4 w-4 mr-2" />Back</Button>
              <Button onClick={() => setStep(5)} disabled={!booking.date || !booking.time} className="ml-auto rounded-xl text-white" style={{ background: "#1a4a35" }}>Review <ArrowRight className="h-4 w-4 ml-2" /></Button>
            </div>
          </div>
        )}

        {/* Step 5: Confirm */}
        {step === 5 && (
          <div className="space-y-4">
            <p className="text-lg font-semibold text-slate-800">Review & Confirm</p>
            <Card className="border-0 shadow-lg rounded-3xl bg-white">
              <CardContent className="p-8 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><p className="text-[11px] font-semibold tracking-widest text-slate-500 uppercase">Service</p><p className="font-bold text-lg mt-1">{booking.service?.name}</p></div>
                  <div><p className="text-[11px] font-semibold tracking-widest text-slate-500 uppercase">Price</p><p className="font-bold text-lg mt-1" style={{ color: "#1a4a35" }}>{formatCurrency(booking.service?.base_price || 0)}</p></div>
                  <div><p className="text-[11px] font-semibold tracking-widest text-slate-500 uppercase">Doctor</p><p className="font-bold text-lg mt-1">Dr. {booking.doctor?.user?.full_name}{booking.doctor ? (SPECIALIZATIONS.find(s => s.id === booking.doctor!.specialization)?.title ? `, ${SPECIALIZATIONS.find(s => s.id === booking.doctor!.specialization)?.title}` : "") : ""}</p></div>
                  <div><p className="text-[11px] font-semibold tracking-widest text-slate-500 uppercase">Specialization</p><p className="font-semibold text-slate-700 mt-1">{booking.doctor?.specialization}</p></div>
                  <div><p className="text-[11px] font-semibold tracking-widest text-slate-500 uppercase">Date</p><p className="font-bold text-lg mt-1">{booking.date ? formatDate(booking.date) : ""}</p></div>
                  <div><p className="text-[11px] font-semibold tracking-widest text-slate-500 uppercase">Time</p><p className="font-bold text-lg mt-1">{booking.time ? formatTime(booking.time) : ""}</p></div>
                </div>
                {booking.symptoms && <div className="p-4 bg-[#f0f1f5] rounded-xl"><p className="text-[11px] font-semibold tracking-widest text-slate-500 uppercase mb-2">Symptoms</p><p className="text-sm font-medium text-slate-800">{booking.symptoms}</p></div>}
              </CardContent>
            </Card>
            <div className="flex gap-3 pt-4">
              <Button variant="outline" className="rounded-xl mt-auto sm:mt-0" onClick={() => setStep(4)}><ArrowLeft className="h-4 w-4 mr-2 hidden sm:inline" />Back</Button>
              <div className="ml-auto flex flex-col sm:flex-row items-end sm:items-center gap-2 sm:gap-4">
                {bookingError && <p className="text-[11px] sm:text-sm font-semibold text-red-500 bg-red-50 px-2 py-1 rounded-lg text-right max-w-[150px] sm:max-w-none">{bookingError}</p>}
                <Button onClick={handleSubmit} disabled={submitting} className="rounded-xl text-white px-8 flex items-center" size="lg" style={{ background: "#1a4a35" }}>
                  {submitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /><span>Booking...</span></> : <><Check className="h-4 w-4 mr-2" /><span>Confirm Booking</span></>}
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
