"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Navbar } from "@/components/shared/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/utils/formatters";
import { useRouter } from "next/navigation";
import type { Service, ServiceCategory } from "@/types";
import { Loader2, Plus, Edit2, Package, ArrowLeft } from "lucide-react";

export default function OwnerServicesPage() {
  const router = useRouter();
  const supabase = createClient();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", description: "", category: "routine" as ServiceCategory, duration_minutes: "30", base_price: "100000" });

  useEffect(() => {
    async function fetchServices() {
      const { data } = await supabase.from("services").select("*").order("category");
      if (data) setServices(data as Service[]);
      setLoading(false);
    }
    fetchServices();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const payload = { name: form.name, description: form.description || null, category: form.category, duration_minutes: parseInt(form.duration_minutes), base_price: parseFloat(form.base_price) };
    if (editId) {
      await supabase.from("services").update(payload).eq("id", editId);
    } else {
      await supabase.from("services").insert(payload);
    }
    const { data } = await supabase.from("services").select("*").order("category");
    if (data) setServices(data as Service[]);
    setDialogOpen(false); setSaving(false); setEditId(null);
    setForm({ name: "", description: "", category: "routine", duration_minutes: "30", base_price: "100000" });
  };

  const openEdit = (s: Service) => {
    setEditId(s.id);
    setForm({ name: s.name, description: s.description || "", category: s.category, duration_minutes: s.duration_minutes.toString(), base_price: s.base_price.toString() });
    setDialogOpen(true);
  };

  if (loading) return <div className="min-h-screen" style={{ background: "#f0f1f5" }}><Navbar /><div className="flex items-center justify-center h-[60vh]"><Loader2 className="h-8 w-8 animate-spin" style={{ color: "#6b21a8" }} /></div></div>;

  return (
    <div className="min-h-screen" style={{ background: "#f0f1f5" }}>
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 py-8 animate-fade-in">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold" style={{ color: "#6b21a8" }}>Manage Services</h1>
          <Button variant="outline" size="sm" onClick={() => router.push("/owner/dashboard")} className="rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
          </Button>
        </div>
        <div className="flex items-center justify-end mb-6">
          <Dialog open={dialogOpen} onOpenChange={v => { setDialogOpen(v); if (!v) { setEditId(null); setForm({ name: "", description: "", category: "routine", duration_minutes: "30", base_price: "100000" }); } }}>
            <DialogTrigger asChild><Button className="rounded-xl text-white" style={{ background: "#6b21a8" }}><Plus className="h-4 w-4 mr-2" />Add Service</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editId ? "Edit" : "Add"} Service</DialogTitle><DialogDescription>Configure a dental service offering.</DialogDescription></DialogHeader>
              <div className="space-y-3 mt-4">
                <div className="space-y-1"><Label>Name *</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
                <div className="space-y-1"><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1"><Label>Category</Label><Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v as ServiceCategory }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="emergency">Emergency</SelectItem><SelectItem value="procedure">Procedure</SelectItem><SelectItem value="routine">Routine</SelectItem><SelectItem value="orthodontic">Orthodontic</SelectItem></SelectContent></Select></div>
                  <div className="space-y-1"><Label>Duration (min)</Label><Input type="number" value={form.duration_minutes} onChange={e => setForm(p => ({ ...p, duration_minutes: e.target.value }))} /></div>
                </div>
                <div className="space-y-1"><Label>Base Price (IDR)</Label><Input type="number" value={form.base_price} onChange={e => setForm(p => ({ ...p, base_price: e.target.value }))} /></div>
                <Button onClick={handleSave} disabled={saving || !form.name} className="w-full rounded-xl text-white" style={{ background: "#6b21a8" }}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Service"}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {services.map(s => (
            <Card key={s.id} className="border-0 shadow-sm hover:shadow-md transition-all">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-2">
                  <div><h3 className="font-semibold text-slate-900">{s.name}</h3>{s.description && <p className="text-sm text-slate-500 mt-0.5">{s.description}</p>}</div>
                  <Button variant="ghost" size="icon" onClick={() => openEdit(s)}><Edit2 className="h-4 w-4" /></Button>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-2"><Badge variant={s.category === "emergency" ? "critical" : "routine"}>{s.category}</Badge><span className="text-xs text-slate-400">{s.duration_minutes} min</span></div>
                  <p className="font-bold text-purple-700">{formatCurrency(s.base_price)}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
