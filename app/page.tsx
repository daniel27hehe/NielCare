import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import IntroPage from "@/components/IntroPage";

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // If already logged in → redirect to their dashboard
  if (user) {
    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    const role = profile?.role || "patient";
    redirect(`/${role}/dashboard`);
  }

  // Not logged in → show beautiful intro/landing page
  return <IntroPage />;
}
