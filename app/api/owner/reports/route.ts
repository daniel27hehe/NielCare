import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminSupabase = await createAdminClient();

  // Verify owner role using adminClient (bypass users RLS)
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
    
    // Create local date string YYYY-MM-DD
    const dateStr = [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, "0"),
      String(d.getDate()).padStart(2, "0")
    ].join("-");

    // Get start and end of the local day in UTC to query created_at
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

  // --- Doctor performance: fetch all doctors with their real names via adminClient ---
  // This bypasses the users RLS "can only read own profile" restriction
  const { data: doctors } = await adminSupabase
    .from("doctors")
    .select("id, user:users!doctors_user_id_fkey(full_name)");

  const doctorPerformance: { name: string; appointments: number; revenue: number }[] = [];

  if (doctors) {
    // Fetch all done appointments with service price in one query
    const { data: allDoneAppts } = await adminSupabase
      .from("appointments")
      .select("doctor_id, service:services!appointments_service_id_fkey(base_price)")
      .eq("status", "done");

    const { data: allAppts } = await adminSupabase
      .from("appointments")
      .select("doctor_id");

    for (const doc of doctors) {
      const userName = (doc as any).user?.full_name || "Unknown";
      const docAppts = (allAppts || []).filter((a: any) => a.doctor_id === doc.id);
      const revenue = (allDoneAppts || [])
        .filter((a: any) => a.doctor_id === doc.id)
        .reduce((sum: number, a: any) => sum + ((a.service as any)?.base_price || 0), 0);

      doctorPerformance.push({
        name: userName,
        appointments: docAppts.length,
        revenue,
      });
    }
    doctorPerformance.sort((a, b) => b.revenue - a.revenue);
  }

  // --- Monthly revenue: current month, done appointments, from service base_price ---
  const now = new Date();
  const monthStart = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    "01"
  ].join("-");

  const { data: monthDoneAppts } = await adminSupabase
    .from("appointments")
    .select("service:services!appointments_service_id_fkey(base_price)")
    .eq("status", "done")
    .gte("appointment_date", monthStart);

  const monthlyRevenue = (monthDoneAppts || []).reduce(
    (sum, a) => sum + ((a.service as any)?.base_price || 0),
    0
  );

  return NextResponse.json({
    dailyAppointments,
    doctorPerformance,
    monthlyRevenue,
  });
}
