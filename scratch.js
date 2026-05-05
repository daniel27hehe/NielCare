import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validate required environment variables
if (!supabaseUrl || !serviceKey) {
  console.error("ERROR: Missing required environment variables:");
  if (!supabaseUrl) console.error("  - NEXT_PUBLIC_SUPABASE_URL");
  if (!serviceKey) console.error("  - SUPABASE_SERVICE_ROLE_KEY");
  console.error("\nPlease configure your .env.local file.");
  console.error("See .env.example for template.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function run() {
  const { data, error } = await supabase
    .from("appointments")
    .select("id, status, appointment_date, service:services!appointments_service_id_fkey(name, base_price)");

  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Appointments:");
    console.log(JSON.stringify(data, null, 2));
    
    const revenue = data.filter(a => a.status === "done").reduce((sum, a) => sum + (a.service?.base_price || 0), 0);
    console.log("Calculated Revenue:", revenue);
  }
}

run();
