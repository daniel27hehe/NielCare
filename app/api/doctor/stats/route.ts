import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminSupabase = await createAdminClient();

  // Get doctor record for this user
  const { data: doctor } = await adminSupabase
    .from("doctors")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!doctor) {
    return NextResponse.json({ error: "Doctor not found" }, { status: 404 });
  }

  const today = new Date().toISOString().split("T")[0];
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split("T")[0];

  // Fetch all appointments for this doctor (with service for price lookup)
  const { data: appointments } = await adminSupabase
    .from("appointments")
    .select("id, patient_id, appointment_date, status, service:services!appointments_service_id_fkey(base_price)")
    .eq("doctor_id", doctor.id);

  const all = appointments || [];

  // Today's count
  const todayAppointments = all.filter(a => a.appointment_date === today).length;

  // Pending count
  const pendingAppointments = all.filter(a => a.status === "pending").length;

  // Completed this month (status = 'done' AND appointment_date >= monthStart)
  const completedThisMonth = all.filter(
    a => a.status === "done" && a.appointment_date >= monthStart
  ).length;

  // Earnings this month: sum of service.base_price for done appointments this month
  const earningsThisMonth = all
    .filter(a => a.status === "done" && a.appointment_date >= monthStart)
    .reduce((sum, a) => sum + ((a.service as any)?.base_price || 0), 0);

  // Unique patients
  const uniquePatientIds = [...new Set(all.map(a => a.patient_id))];

  // Fetch patient details using adminClient (bypasses users RLS)
  const patientsData: { id: string; full_name: string; email: string; appointmentCount: number }[] = [];
  if (uniquePatientIds.length > 0) {
    const { data: users } = await adminSupabase
      .from("users")
      .select("id, full_name, email")
      .in("id", uniquePatientIds);

    if (users) {
      for (const u of users) {
        const appointmentCount = all.filter(a => a.patient_id === u.id).length;
        patientsData.push({ ...u, appointmentCount });
      }
    }
  }

  return NextResponse.json({
    todayAppointments,
    pendingAppointments,
    completedThisMonth,
    earningsThisMonth,
    totalPatients: uniquePatientIds.length,
    patients: patientsData,
  });
}
