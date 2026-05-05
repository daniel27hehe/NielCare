"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/shared/Navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Users, ArrowLeft } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils/formatters";
import Link from "next/link";

interface PatientRow {
  id: string;
  full_name: string;
  email: string;
  appointmentCount: number;
}

export default function DoctorPatientsPage() {
  const router = useRouter();
  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPatients() {
      // Use the doctor stats API which fetches patient data via adminClient
      // — bypasses the users RLS "can only read own profile" restriction
      const res = await fetch("/api/doctor/stats");
      if (res.ok) {
        const data = await res.json();
        setPatients(data.patients || []);
      }
      setLoading(false);
    }
    fetchPatients();
  }, []);

  if (loading)
    return (
      <div className="min-h-screen" style={{ background: "#f0f1f5" }}>
        <Navbar />
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin" style={{ color: "#1e40af" }} />
        </div>
      </div>
    );

  return (
    <div className="min-h-screen" style={{ background: "#f0f1f5" }}>
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 py-8 animate-fade-in">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold" style={{ color: "#1e40af" }}>My Patients</h1>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/doctor/dashboard")}
            className="rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
          </Button>
        </div>

        {patients.length === 0 ? (
          <div className="text-center py-16">
            <Users className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">No patients yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {patients.map(p => (
              <Link key={p.id} href={`/doctor/patients/${p.id}`}>
                <Card className="border-0 shadow-sm hover:shadow-md transition-all cursor-pointer">
                  <CardContent className="p-4 flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-blue-50 text-blue-700">
                        {getInitials(p.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-semibold text-slate-900">{p.full_name}</p>
                      <p className="text-sm text-slate-500">{p.email}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold" style={{ color: "#1e40af" }}>{p.appointmentCount}</p>
                      <p className="text-xs text-slate-400">visits</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
