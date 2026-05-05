import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, email, username, full_name, phone, gender, date_of_birth } = body;

    if (!id || !email || !username || !full_name || !gender) {
      return NextResponse.json(
        { error: 'Data tidak lengkap. Pastikan semua field wajib diisi.' },
        { status: 400 }
      );
    }

    // Validate environment variables before proceeding
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase configuration:', {
        url: !supabaseUrl ? 'NEXT_PUBLIC_SUPABASE_URL is not set' : 'OK',
        key: !supabaseKey ? 'SUPABASE_SERVICE_ROLE_KEY is not set' : 'OK'
      });
      return NextResponse.json(
        { error: 'Server configuration error. Please try again later.' },
        { status: 500 }
      );
    }

    // Use pure supabase-js client with service_role to guarantee RLS bypass
    // Do NOT use SSR client here because it reads cookies and might downgrade to user role
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const { error } = await supabase.from('users').insert({
      id,
      email,
      username,
      full_name,
      phone: phone || null,
      gender,
      date_of_birth: date_of_birth || null,
      role: 'patient',
    });

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Username atau email sudah digunakan. Silakan pilih yang lain.' },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Server error. Coba lagi.' }, { status: 500 });
  }
}
