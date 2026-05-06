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

  // --- Daily appointments: last 7 days ---
  const dailyAppointments: { date: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, "0"),
      String(d.getDate()).padStart(2, "0")
    ].join("-");
    const startOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(startOfDay.getDate() + 1);

    const { count } = await adminSupabase
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .gte("created_at", startOfDay.toISOString())
      .lt("created_at", endOfDay.toISOString());

    dailyAppointments.push({ date: dateStr, count: count || 0 });
  }

  // --- Doctor performance ---
  const { data: doctors } = await adminSupabase
    .from("doctors")
    .select("id, user:users!doctors_user_id_fkey(full_name)");

  const doctorPerformance: { name: string; appointments: number; revenue: number }[] = [];

  if (doctors) {
    // Use actual treatment cost from medical_records
    const { data: allDoneAppts } = await adminSupabase
      .from("appointments")
      .select("doctor_id, medical_records(treatment_cost)")
      .eq("status", "done");

    const { data: allAppts } = await adminSupabase
      .from("appointments")
      .select("doctor_id");

    for (const doc of doctors) {
      const userName = (doc as any).user?.full_name || "Unknown";
      const docAppts = (allAppts || []).filter((a: any) => a.doctor_id === doc.id);
      const revenue = (allDoneAppts || [])
        .filter((a: any) => a.doctor_id === doc.id)
        .reduce((sum: number, a: any) => sum + getActualCost(a), 0);

      doctorPerformance.push({ name: userName, appointments: docAppts.length, revenue });
    }
    doctorPerformance.sort((a, b) => b.revenue - a.revenue);
  }

  // --- Monthly revenue: current month ---
  const now = new Date();
  const monthStart = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    "01"
  ].join("-");

  const { data: monthDoneAppts } = await adminSupabase
    .from("appointments")
    .select("medical_records(treatment_cost)")
    .eq("status", "done")
    .gte("appointment_date", monthStart);

  const monthlyRevenue = (monthDoneAppts || []).reduce(
    (sum: number, a: any) => sum + getActualCost(a),
    0
  );

  return NextResponse.json({
    dailyAppointments,
    doctorPerformance,
    monthlyRevenue,
  });
}
