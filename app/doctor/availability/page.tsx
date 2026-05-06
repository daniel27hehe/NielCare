"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Sidebar } from "@/components/shared/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getDayName } from "@/lib/utils/formatters";
import type { DoctorSchedule } from "@/types";
import { Loader2, Plus, Trash2, Clock, ArrowLeft } from "lucide-react";

export default function DoctorAvailabilityPage() {
  const supabase = createClient();
  const [schedules, setSchedules] = useState<DoctorSchedule[]>([]);
  const [doctorId, setDoctorId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newSchedule, setNewSchedule] = useState({ day_of_week: "1", start_time: "08:00", end_time: "17:00", slot_duration_minutes: "30" });

  useEffect(() => {
    async function fetchSchedules() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: doctor } = await supabase.from("doctors").select("id").eq("user_id", user.id).single();
      if (!doctor) return;
      setDoctorId(doctor.id);
      const { data } = await supabase.from("doctor_schedules").select("*").eq("doctor_id", doctor.id).order("day_of_week");
      if (data) setSchedules(data as DoctorSchedule[]);
      setLoading(false);
    }
    fetchSchedules();
  }, []);

  const addSchedule = async () => {
    if (!doctorId) return;
    setSaving(true);
    const { data, error } = await supabase.from("doctor_schedules").insert({
      doctor_id: doctorId,
      day_of_week: parseInt(newSchedule.day_of_week),
      start_time: newSchedule.start_time,
      end_time: newSchedule.end_time,
      slot_duration_minutes: parseInt(newSchedule.slot_duration_minutes),
      is_available: true,
    }).select().single();
    if (data && !error) setSchedules(prev => [...prev, data as DoctorSchedule]);
    setSaving(false);
  };

  const deleteSchedule = async (id: string) => {
    await supabase.from("doctor_schedules").delete().eq("id", id);
    setSchedules(prev => prev.filter(s => s.id !== id));
  };

  const toggleAvailability = async (id: string, isAvailable: boolean) => {
    await supabase.from("doctor_schedules").update({ is_available: !isAvailable }).eq("id", id);
    setSchedules(prev => prev.map(s => s.id === id ? { ...s, is_available: !isAvailable } : s));
  };

  if (loading) return <div className="min-h-screen" style={{ background: "#f0f1f5" }}><Sidebar /><div className="flex items-center justify-center h-[60vh]"><Loader2 className="h-8 w-8 animate-spin" style={{ color: "#1e40af" }} /></div></div>;

  return (
    <div className="min-h-screen" style={{ background: "#f0f1f5" }}>
      <Sidebar />
      <main className="mx-auto max-w-3xl px-4 py-8 animate-fade-in">
        <div className="mb-8">
          <h1 className="text-3xl font-bold" style={{ color: "#1e40af" }}>Atur Ketersediaan</h1>
        </div>

        <Card className="border-0 shadow-sm mb-6 rounded-3xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" style={{ color: "#1e40af" }} />
              <span style={{ color: "#1e40af" }}>Tambah Jadwal</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Hari Praktik</Label>
                <Select value={newSchedule.day_of_week} onValueChange={v => setNewSchedule(p => ({ ...p, day_of_week: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{[0,1,2,3,4,5,6].map(d => <SelectItem key={d} value={d.toString()}>{getDayName(d)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Durasi Slot (menit)</Label><Input type="number" value={newSchedule.slot_duration_minutes} onChange={e => setNewSchedule(p => ({ ...p, slot_duration_minutes: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Jam Mulai</Label><Input type="time" value={newSchedule.start_time} onChange={e => setNewSchedule(p => ({ ...p, start_time: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Jam Selesai</Label><Input type="time" value={newSchedule.end_time} onChange={e => setNewSchedule(p => ({ ...p, end_time: e.target.value }))} /></div>
            </div>
            <Button onClick={addSchedule} disabled={saving} className="rounded-xl text-white" style={{ background: "#1e40af" }}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}Tambah Jadwal
            </Button>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg rounded-3xl bg-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" style={{ color: "#1e40af" }} />
              <span style={{ color: "#1e40af" }}>Jadwal Saat Ini</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {schedules.length === 0 ? (
              <p className="text-center text-slate-500 py-8">Belum ada jadwal yang diatur</p>
            ) : (
              <div className="space-y-3">
                {schedules.map(s => (
                  <div key={s.id} className={`flex items-center justify-between p-4 rounded-2xl border ${s.is_available ? "bg-blue-50 border-blue-200" : "bg-slate-50 border-slate-200 opacity-60"}`}>
                    <div>
                      <p className="font-semibold text-slate-900">{getDayName(s.day_of_week)}</p>
                      <p className="text-sm text-slate-500">{s.start_time} — {s.end_time} ({s.slot_duration_minutes}min slots)</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={() => toggleAvailability(s.id, s.is_available)} className="text-blue-700 hover:bg-blue-100">
                        {s.is_available ? "Nonaktifkan" : "Aktifkan"}
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteSchedule(s.id)} className="text-red-500 hover:text-red-700">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
