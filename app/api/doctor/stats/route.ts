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

  const now = new Date();
  const today = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0")
  ].join("-");
  
  const monthStart = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    "01"
  ].join("-");

  // Fetch all appointments for this doctor, including medical_records for actual cost
  const { data: appointments } = await adminSupabase
    .from("appointments")
    .select("id, patient_id, appointment_date, status, ai_analysis_result, medical_records(treatment_cost)")
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

  // Earnings this month: use actual treatment_cost from medical_records
  const earningsThisMonth = all
    .filter(a => a.status === "done" && a.appointment_date >= monthStart)
    .reduce((sum, a: any) => {
      const records = Array.isArray(a.medical_records) ? a.medical_records : [a.medical_records];
      const cost = records[0]?.treatment_cost || 0;
      return sum + cost;
    }, 0);

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
