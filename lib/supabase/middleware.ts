import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  // Skip Supabase checks if env vars are not set
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return supabaseResponse;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Public routes — no auth required (including intro/landing page)
  const publicRoutes = ['/', '/login', '/register'];
  if (publicRoutes.some(route => pathname === route || pathname.startsWith(route + '/'))) {
    if (user && (pathname === '/login' || pathname === '/register')) {
      // Already logged in — redirect to their dashboard
      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile) {
        const dashboardMap: Record<string, string> = {
          patient: '/patient/dashboard',
          doctor: '/doctor/dashboard',
          owner: '/owner/dashboard',
        };
        const url = request.nextUrl.clone();
        url.pathname = dashboardMap[profile.role] || '/patient/dashboard';
        return NextResponse.redirect(url);
      }
    }
    return supabaseResponse;
  }

  // Protected routes — require auth
  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Role-based access control
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile) {
    const role = profile.role;

    if (pathname.startsWith('/patient') && role !== 'patient') {
      const url = request.nextUrl.clone();
      url.pathname = `/${role}/dashboard`;
      return NextResponse.redirect(url);
    }
    if (pathname.startsWith('/doctor') && role !== 'doctor') {
      const url = request.nextUrl.clone();
      url.pathname = `/${role}/dashboard`;
      return NextResponse.redirect(url);
    }
    if (pathname.startsWith('/owner') && role !== 'owner') {
      const url = request.nextUrl.clone();
      url.pathname = `/${role}/dashboard`;
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
