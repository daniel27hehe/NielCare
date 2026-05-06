import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

// Parse actual treatment cost from joined medical_records
function getActualCost(appointment: any): number {
  if (!appointment.medical_records) return 0;
  const records = Array.isArray(appointment.medical_records) 
    ? appointment.medical_records 
    : [appointment.medical_records];
  return records[0]?.treatment_cost || 0;
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminSupabase = await createAdminClient();
  const { data: userData } = await adminSupabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (userData?.role !== "owner") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { count: patientCount } = await adminSupabase
    .from("users")
    .select("*", { count: "exact", head: true })
    .eq("role", "patient");

  const { count: doctorCount } = await adminSupabase
    .from("doctors")
    .select("*", { count: "exact", head: true })
    .eq("is_active", true);

  const { count: totalAppointmentsCount } = await adminSupabase
    .from("appointments")
    .select("id", { count: "exact", head: true });

  // Fetch done appointments with medical_records for actual revenue
  const { data: doneAppointments } = await adminSupabase
    .from("appointments")
    .select("appointment_date, medical_records(treatment_cost)")
    .eq("status", "done");

  const totalAppointments = totalAppointmentsCount || 0;
  const totalRevenue = (doneAppointments || []).reduce(
    (sum: number, a: any) => sum + getActualCost(a),
    0
  );

  // Monthly breakdown — last 6 months
  const monthlyBreakdown: { month: string; label: string; appointments: number; revenue: number }[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
    const startStr = [
      start.getFullYear(),
      String(start.getMonth() + 1).padStart(2, "0"),
      "01"
    ].join("-");
    const endStr = [
      end.getFullYear(),
      String(end.getMonth() + 1).padStart(2, "0"),
      "01"
    ].join("-");

    const monthStr = startStr.slice(0, 7);
    const label = start.toLocaleString("id-ID", { month: "short", year: "numeric" });

    const { count: monthApptsCount } = await adminSupabase
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .gte("appointment_date", startStr)
      .lt("appointment_date", endStr);

    const { data: monthDone } = await adminSupabase
      .from("appointments")
      .select("medical_records(treatment_cost)")
      .eq("status", "done")
      .gte("appointment_date", startStr)
      .lt("appointment_date", endStr);

    const monthRevenue = (monthDone || []).reduce(
      (sum: number, a: any) => sum + getActualCost(a),
      0
    );

    monthlyBreakdown.push({
      month: monthStr,
      label,
      appointments: monthApptsCount || 0,
      revenue: monthRevenue,
    });
  }

  return NextResponse.json({
    totalPatients: patientCount || 0,
    totalAppointments,
    totalDoctors: doctorCount || 0,
    totalRevenue,
    monthlyBreakdown,
  });
}
