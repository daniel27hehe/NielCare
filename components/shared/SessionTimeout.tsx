"use client";

import { useEffect, useCallback, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// 15 minutes in milliseconds
const TIMEOUT_MS = 15 * 60 * 1000; 

export function SessionTimeout() {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const timeoutIdRef = useRef<NodeJS.Timeout | null>(null);

  const handleLogout = useCallback(async () => {
    // Only logout if not already on the login or register or start page
    if (pathname === "/login" || pathname === "/register" || pathname === "/") return;

    // Check if user is actually logged in before signing out
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
      await supabase.auth.signOut();
      router.push("/login?message=Session expired due to inactivity");
      router.refresh();
    }
  }, [pathname, router, supabase.auth]);

  const resetTimeout = useCallback(() => {
    // Don't set timeout on public pages
    if (pathname === "/login" || pathname === "/register" || pathname === "/") {
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
        timeoutIdRef.current = null;
      }
      return;
    }

    if (timeoutIdRef.current) {
      clearTimeout(timeoutIdRef.current);
    }
    
    timeoutIdRef.current = setTimeout(() => {
      handleLogout();
    }, TIMEOUT_MS);
  }, [handleLogout, pathname]);

  useEffect(() => {
    // Initial setup
    resetTimeout();

    const events = [
      "mousemove",
      "mousedown",
      "keydown",
      "touchstart",
      "scroll",
    ];

    const handleActivity = () => resetTimeout();

    // Add event listeners
    events.forEach((event) => {
      window.addEventListener(event, handleActivity);
    });

    return () => {
      // Cleanup
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
      }
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [resetTimeout]);

  return null;
}
