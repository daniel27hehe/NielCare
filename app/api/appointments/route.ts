import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { z } from "zod";

const createAppointmentSchema = z.object({
  doctor_id: z.string().uuid(),
  service_id: z.string().uuid(),
  appointment_date: z.string(),
  slot_time: z.string(),
  symptom_description: z.string().nullable().optional(),
  emergency_level: z.enum(["critical", "moderate", "routine"]).default("routine"),
  ai_analysis_result: z.string().nullable().optional(),
});

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const doctorId = searchParams.get("doctor_id");
  const patientId = searchParams.get("patient_id");
  const date = searchParams.get("date");

  const adminSupabase = await createAdminClient();

  let query = adminSupabase
    .from("appointments")
    .select(`
      *,
      patient:users!appointments_patient_id_fkey(*),
      doctor:doctors!appointments_doctor_id_fkey(*, user:users!doctors_user_id_fkey(*)),
      service:services!appointments_service_id_fkey(*)
    `)
    .order("appointment_date", { ascending: false });

  if (status) query = query.eq("status", status);
  if (doctorId) query = query.eq("doctor_id", doctorId);
  if (patientId) query = query.eq("patient_id", patientId);
  if (date) query = query.eq("appointment_date", date);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (!user) {
    console.error("Auth failed in POST /api/appointments:", authError);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createAppointmentSchema.safeParse(body);

  if (!parsed.success) {
    console.error("Zod validation failed:", parsed.error.issues);
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  // Check for conflicting appointment
  const { data: existing } = await supabase
    .from("appointments")
    .select("id")
    .eq("doctor_id", parsed.data.doctor_id)
    .eq("appointment_date", parsed.data.appointment_date)
    .eq("slot_time", parsed.data.slot_time)
    .in("status", ["pending", "approved"])
    .single();

  if (existing) {
    return NextResponse.json(
      { error: "This time slot is already booked" },
      { status: 409 }
    );
  }

  const adminSupabase = await createAdminClient();

  const { data, error } = await adminSupabase
    .from("appointments")
    .insert({
      patient_id: user.id,
      ...parsed.data,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Create notification for the doctor
  const { data: doctor } = await adminSupabase
    .from("doctors")
    .select("user_id")
    .eq("id", parsed.data.doctor_id)
    .single();

  if (doctor) {
    await adminSupabase.from("notifications").insert({
      user_id: doctor.user_id,
      title: "New Appointment Request",
      message: `A new ${parsed.data.emergency_level} appointment has been booked for ${parsed.data.appointment_date}`,
      type: "booking",
    });
  }

  return NextResponse.json(data, { status: 201 });
}
