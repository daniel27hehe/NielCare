import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { z } from "zod";

const updateSchema = z.object({
  status: z.enum(["pending", "approved", "rejected", "done", "cancelled"]).optional(),
  diagnosis_notes: z.string().optional(),
  treatment_given: z.string().optional(),
  medications_prescribed: z.string().optional(),
  treatment_cost: z.number().nullable().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminSupabase = await createAdminClient();

  const { data, error } = await adminSupabase
    .from("appointments")
    .select(`
      *,
      patient:users!appointments_patient_id_fkey(*),
      doctor:doctors!appointments_doctor_id_fkey(*, user:users!doctors_user_id_fkey(*))
    `)
    .eq("id", id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  // Also fetch medical record if exists
  const { data: record } = await adminSupabase
    .from("medical_records")
    .select("*")
    .eq("appointment_id", id)
    .single();

  return NextResponse.json({ ...data, medical_record: record });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = updateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const adminSupabase = await createAdminClient();

  // Get the appointment first using admin to bypass RLS for fetching
  const { data: appointment, error: fetchError } = await adminSupabase
    .from("appointments")
    .select("*, doctor:doctors!appointments_doctor_id_fkey(id, user_id)")
    .eq("id", id)
    .single();

  if (fetchError || !appointment) {
    return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
  }

  // Authorize: Only the assigned doctor (or patient for canceling) can update
  if (appointment.doctor?.user_id !== user.id && appointment.patient_id !== user.id) {
    return NextResponse.json({ error: "Unauthorized to update this appointment" }, { status: 403 });
  }

  // Update appointment status (only if treatment data is not provided, since treatment sets it to done automatically)
  if (parsed.data.status && !(parsed.data.diagnosis_notes && parsed.data.treatment_given)) {
    const { error: updateError } = await adminSupabase
      .from("appointments")
      .update({ status: parsed.data.status })
      .eq("id", id);

    if (updateError) {
      console.error("Failed to update status", updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }


  }

  // Create medical record if treatment data provided
  if (parsed.data.diagnosis_notes && parsed.data.treatment_given && parsed.data.medications_prescribed) {
    // Use doctor-provided cost; fall back to AI estimated cost from JSON
    let treatmentCost = parsed.data.treatment_cost ?? 0;
    if (!treatmentCost) {
      try {
        if (appointment.ai_analysis_result) {
          const aiData = typeof appointment.ai_analysis_result === 'string'
            ? JSON.parse(appointment.ai_analysis_result)
            : appointment.ai_analysis_result;
          treatmentCost = aiData?.estimatedCost || 0;
        }
      } catch { treatmentCost = 0; }
    }

    const { error: upsertError } = await adminSupabase.from("medical_records").upsert({
      appointment_id: id,
      patient_id: appointment.patient_id,
      doctor_id: appointment.doctor.id,
      diagnosis_notes: parsed.data.diagnosis_notes,
      treatment_given: parsed.data.treatment_given,
      medications_prescribed: parsed.data.medications_prescribed,
      treatment_cost: treatmentCost,
    }, {
      onConflict: "appointment_id",
    });

    if (upsertError) {
      console.error("Failed to upsert medical record", upsertError);
      return NextResponse.json({ error: "Failed to save medical record" }, { status: 500 });
    }

    // Explicitly update appointment status to "done"
    const { error: doneError } = await adminSupabase
      .from("appointments")
      .update({ status: "done" })
      .eq("id", id);

    if (doneError) {
      console.error("Failed to mark appointment as done", doneError);
      return NextResponse.json({ error: "Failed to mark as done" }, { status: 500 });
    }


  }

  return NextResponse.json({ success: true });
}
