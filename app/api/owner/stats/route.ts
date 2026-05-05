import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify owner — use adminClient to bypass users RLS
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

  // Total appointments and revenue — use date-range aware queries
  const { count: totalAppointmentsCount } = await adminSupabase
    .from("appointments")
    .select("id", { count: "exact", head: true });
  // Fetch appointments with service relation for popularity and revenue calculations
  const { data: allAppointments } = await adminSupabase
    .from("appointments")
    .select("id, status, service_id, service:services!appointments_service_id_fkey(name, base_price), appointment_date");

  const totalAppointments = totalAppointmentsCount || (allAppointments || []).length || 0;
  const totalRevenue = (allAppointments || [])
    .filter(a => a.status === "done")
    .reduce((sum: number, a: any) => sum + ((a.service as any)?.base_price || 0), 0);

  // Popular services (all appointments, not just done)
  const serviceCounts: Record<string, { name: string; count: number }> = {};
  (allAppointments || []).forEach((a: any) => {
    const name = a.service?.name || "Unknown";
    const sid = a.service_id || "unknown";
    if (!serviceCounts[sid]) serviceCounts[sid] = { name, count: 0 };
    serviceCounts[sid].count++;
  });
  const popularServices = Object.values(serviceCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Monthly breakdown — last 6 months (use range queries to handle timestamps)
  const monthlyBreakdown: { month: string; label: string; appointments: number; revenue: number }[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
    const startStr = [
      start.getFullYear(),
      String(start.getMonth() + 1).padStart(2, "0"),
      String(start.getDate()).padStart(2, "0")
    ].join("-");

    const endStr = [
      end.getFullYear(),
      String(end.getMonth() + 1).padStart(2, "0"),
      String(end.getDate()).padStart(2, "0")
    ].join("-");

    const monthStr = startStr.slice(0, 7); // "YYYY-MM"
    const label = start.toLocaleString("default", { month: "short", year: "numeric" });

    const { count: monthApptsCount } = await adminSupabase
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .gte("appointment_date", startStr)
      .lt("appointment_date", endStr);

    const { data: monthDone } = await adminSupabase
      .from("appointments")
      .select("service:services!appointments_service_id_fkey(base_price)")
      .eq("status", "done")
      .gte("appointment_date", startStr)
      .lt("appointment_date", endStr);

    const monthRevenue = (monthDone || []).reduce((sum: number, a: any) => sum + ((a.service as any)?.base_price || 0), 0);

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
    popularServices,
    monthlyBreakdown,
  });
}
