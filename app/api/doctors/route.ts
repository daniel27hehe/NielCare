import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { z } from "zod";

const createDoctorSchema = z.object({
  full_name: z.string().min(2),
  email: z.string().email(),
  username: z.string().min(3),
  phone: z.string().optional(),
  password: z.string().min(6),
  specialization: z.string().min(2),
  bio: z.string().optional(),
  years_experience: z.number().min(0).default(0),
});

export async function GET() {
  const supabase = await createClient();
  const adminSupabase = await createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await adminSupabase
    .from("doctors")
    .select(`
      *,
      user:users!doctors_user_id_fkey(*)
    `)
    .eq("is_active", true);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if user is owner
  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "owner") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createDoctorSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  // Use admin client to create auth user
  const adminSupabase = await createAdminClient();

  const { data: authUser, error: authError } = await adminSupabase.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
  });

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 500 });
  }

  if (!authUser.user) {
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }

  // Insert into users table
  const { error: userError } = await adminSupabase.from("users").insert({
    id: authUser.user.id,
    email: parsed.data.email,
    username: parsed.data.username,
    full_name: parsed.data.full_name,
    phone: parsed.data.phone || null,
    role: "doctor",
  });

  if (userError) {
    return NextResponse.json({ error: userError.message }, { status: 500 });
  }

  // Insert into doctors table
  const { data: doctor, error: doctorError } = await adminSupabase
    .from("doctors")
    .insert({
      user_id: authUser.user.id,
      specialization: parsed.data.specialization,
      bio: parsed.data.bio || null,
      years_experience: parsed.data.years_experience,
    })
    .select()
    .single();

  if (doctorError) {
    return NextResponse.json({ error: doctorError.message }, { status: 500 });
  }

  return NextResponse.json(doctor, { status: 201 });
}
