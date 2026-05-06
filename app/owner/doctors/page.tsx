"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Sidebar } from "@/components/shared/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils/formatters";
import { useRouter } from "next/navigation";
import type { Doctor } from "@/types";
import { Loader2, Plus, Stethoscope, Eye, EyeOff, ArrowLeft } from "lucide-react";

const SPECIALIZATIONS = [
  { id: "General Dentist", label: "General Dentist", title: "" },
  { id: "Orthodontist", label: "Orthodontist", title: "Sp.Ort" },
  { id: "Periodontist", label: "Periodontist", title: "Sp.Perio" },
  { id: "Endodontist", label: "Endodontist", title: "Sp.KG" },
  { id: "Prosthodontist", label: "Prosthodontist", title: "Sp.Pros" },
  { id: "Oral Surgeon", label: "Oral Surgeon", title: "Sp.BM" },
  { id: "Pediatric Dentist", label: "Pediatric Dentist", title: "Sp.KGA" },
];

export default function OwnerDoctorsPage() {
  const supabase = createClient();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ full_name: "", email: "", username: "", phone: "", password: "", specialization: "", bio: "", years_experience: "0" });

  useEffect(() => {
    async function fetchDoctors() {
      const res = await fetch("/api/doctors");
      if (res.ok) {
        const data = await res.json();
        setDoctors(data);
      }
      setLoading(false);
    }
    fetchDoctors();
  }, []);

  const handleCreate = async () => {
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/doctors", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, years_experience: parseInt(form.years_experience) }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); setSaving(false); return; }
      setDialogOpen(false);
      setForm({ full_name: "", email: "", username: "", phone: "", password: "", specialization: "", bio: "", years_experience: "0" });
      // Refresh
      const refreshRes = await fetch("/api/doctors");
      if (refreshRes.ok) {
        const updated = await refreshRes.json();
        setDoctors(updated);
      }
    } catch { setError("Failed to create doctor"); }
    setSaving(false);
  };

  if (loading) return <div className="min-h-screen" style={{ background: "#f0f1f5" }}><Sidebar /><div className="flex items-center justify-center h-[60vh]"><Loader2 className="h-8 w-8 animate-spin" style={{ color: "#6b21a8" }} /></div></div>;

  return (
    <div className="min-h-screen" style={{ background: "#f0f1f5" }}>
      <Sidebar />
      <main className="mx-auto max-w-4xl px-4 py-8 animate-fade-in">
        <div className="mb-8">
          <h1 className="text-3xl font-bold" style={{ color: "#6b21a8" }}>Daftar Dokter</h1>
        </div>
        <div className="flex items-center justify-end mb-6">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild><Button className="rounded-xl text-white" style={{ background: "#6b21a8" }}><Plus className="h-4 w-4 mr-2" />Tambah Dokter</Button></DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Tambah Dokter Baru</DialogTitle><DialogDescription>Buat akun dokter. Mereka akan bisa langsung masuk (login).</DialogDescription></DialogHeader>
              <div className="space-y-3 mt-4">
                {error && <div className="p-3 rounded-lg bg-red-50 text-sm text-red-600">{error}</div>}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1"><Label>Nama Lengkap *</Label><Input autoComplete="off" value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} /></div>
                  <div className="space-y-1"><Label>Username *</Label><Input autoComplete="off" value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))} /></div>
                </div>
                <div className="space-y-1"><Label>Email *</Label><Input autoComplete="off" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} /></div>
                <div className="space-y-1"><Label>Telepon</Label><Input autoComplete="off" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} /></div>
                <div className="space-y-1">
                  <Label>Spesialisasi *</Label>
                  <Select value={form.specialization} onValueChange={v => setForm(p => ({ ...p, specialization: v }))}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Pilih Spesialisasi" /></SelectTrigger>
                    <SelectContent>
                      {SPECIALIZATIONS.map(spec => (
                        <SelectItem key={spec.id} value={spec.id}>{spec.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1"><Label>Bio Singkat</Label><Textarea value={form.bio} onChange={e => setForm(p => ({ ...p, bio: e.target.value }))} rows={2} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1"><Label>Pengalaman (tahun)</Label><Input type="number" min="0" value={form.years_experience} onChange={e => { const v = parseInt(e.target.value) || 0; setForm(p => ({ ...p, years_experience: Math.max(0, v).toString() })); }} /></div>
                  <div className="space-y-1"><Label>Password *</Label><div className="relative"><Input type={showPassword ? "text" : "password"} autoComplete="new-password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></div>
                </div>
                <Button onClick={handleCreate} disabled={saving || !form.full_name || !form.email || !form.username || !form.password || !form.specialization} className="w-full rounded-xl text-white" style={{ background: "#6b21a8" }}>{saving ? <><Loader2 className="h-4 w-4 animate-spin" />Menyimpan...</> : "Buat Akun Dokter"}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {doctors.map(d => {
            const specData = SPECIALIZATIONS.find(s => s.id === d.specialization);
            const title = specData?.title ? `, ${specData.title}` : "";
            
            return (
              <Card key={d.id} className="border-0 shadow-sm hover:shadow-md transition-all">
                <CardContent className="p-5 flex items-center gap-4">
                  <Avatar className="h-14 w-14"><AvatarFallback className="text-lg">{d.user ? getInitials(d.user.full_name) : "DR"}</AvatarFallback></Avatar>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900">Dr. {d.user?.full_name}{title}</p>
                    <p className="text-sm text-purple-600">{d.specialization}</p>
                    <p className="text-xs text-slate-400">{d.years_experience} thn pengalaman • {d.user?.email}</p>
                  </div>
                  <div className={`h-3 w-3 rounded-full ${d.is_active ? "bg-purple-500" : "bg-red-500"}`} />
                </CardContent>
              </Card>
            );
          })}
        </div>
      </main>
    </div>
  );
}
