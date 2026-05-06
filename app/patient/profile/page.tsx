"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/shared/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowLeft, User as UserIcon } from "lucide-react";
import type { User } from "@/types";

export default function PatientProfilePage() {
  const supabase = createClient();
  const [user, setUser] = useState<User | any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProfile() {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;
      const { data } = await supabase.from("users").select("*").eq("id", authUser.id).single();
      if (data) {
        setUser(data as User);
      } else {
        // Fallback if public.users record is missing
        setUser({
          id: authUser.id,
          email: authUser.email,
          username: authUser.user_metadata?.username || authUser.email?.split('@')[0],
          full_name: authUser.user_metadata?.full_name || "Andi Daniel",
        });
      }
      setLoading(false);
    }
    fetchProfile();
  }, []);

  if (loading) return <div className="min-h-screen" style={{ background: "#f0f1f5" }}><Sidebar /><div className="flex items-center justify-center h-[60vh]"><Loader2 className="h-8 w-8 animate-spin" style={{ color: "#1a4a35" }} /></div></div>;

  return (
    <div className="min-h-screen" style={{ background: "#f0f1f5" }}>
      <Sidebar />
      <main className="mx-auto max-w-2xl px-4 py-8 animate-fade-in">
        <div className="mb-8">
          <h1 className="text-3xl font-bold" style={{ color: "#1a4a35" }}>Profil Saya</h1>
        </div>
        <Card className="border-0 shadow-lg rounded-3xl bg-white overflow-hidden">
          <CardHeader className="bg-[#e8f0ea] border-b border-green-100 px-8 py-6">
            <CardTitle className="flex items-center gap-3 text-xl font-bold" style={{ color: "#1a4a35" }}>
              <div className="p-2 bg-white rounded-xl shadow-sm"><UserIcon className="h-5 w-5" style={{ color: "#1a4a35" }} /></div>
              Informasi Pribadi
            </CardTitle>
            <p className="text-sm text-[#1a4a35]/70 mt-2 font-medium">Detail profil terdaftar Anda. Informasi bersifat baca-saja.</p>
          </CardHeader>
          <CardContent className="p-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              <div>
                <Label className="text-[11px] font-semibold tracking-widest text-slate-500 uppercase">Nama Lengkap</Label>
                <p className="text-lg font-bold text-slate-900 mt-1">{user?.full_name || "-"}</p>
              </div>
              <div>
                <Label className="text-[11px] font-semibold tracking-widest text-slate-500 uppercase">Username</Label>
                <p className="text-lg font-semibold text-slate-700 mt-1">@{user?.username || "-"}</p>
              </div>
              <div>
                <Label className="text-[11px] font-semibold tracking-widest text-slate-500 uppercase">Alamat Email</Label>
                <p className="text-lg font-semibold text-slate-700 mt-1">{user?.email || "-"}</p>
              </div>
              <div>
                <Label className="text-[11px] font-semibold tracking-widest text-slate-500 uppercase">Nomor Telepon</Label>
                <p className="text-lg font-semibold text-slate-700 mt-1">{user?.phone || "-"}</p>
              </div>
              <div>
                <Label className="text-[11px] font-semibold tracking-widest text-slate-500 uppercase">Jenis Kelamin</Label>
                <p className="text-lg font-semibold text-slate-700 mt-1 capitalize">{user?.gender || "-"}</p>
              </div>
              <div>
                <Label className="text-[11px] font-semibold tracking-widest text-slate-500 uppercase">Tanggal Lahir</Label>
                <p className="text-lg font-semibold text-slate-700 mt-1">
                  {user?.date_of_birth ? new Date(user.date_of_birth).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : "-"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
