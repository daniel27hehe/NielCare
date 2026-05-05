const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim();
});

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = env['SUPABASE_SERVICE_ROLE_KEY'];

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase URL or Service Role Key");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const doctorsToCreate = [
  { name: "Andi", username: "dr_andi", email: "andi@nielcare.com", spec: "General Dentist", exp: 5 },
  { name: "Daniel", username: "dr_daniel", email: "daniel@nielcare.com", spec: "Orthodontist", exp: 8 },
  { name: "Niel", username: "dr_niel", email: "niel@nielcare.com", spec: "Oral Surgeon", exp: 12 }
];

async function seedDoctors() {
  console.log("Creating doctors...");
  
  for (const doc of doctorsToCreate) {
    console.log(`Creating auth user for ${doc.name}...`);
    let userId;
    // 1. Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: doc.email,
      password: "Password123!",
      email_confirm: true
    });

    if (authError && authError.message.includes('already been registered')) {
      const { data: listData } = await supabase.auth.admin.listUsers();
      const existingUser = listData.users.find(u => u.email === doc.email);
      userId = existingUser.id;
    } else if (authError) {
      console.error(`Error creating auth user for ${doc.name}:`, authError.message);
      continue;
    } else {
      userId = authData.user.id;
    }

    // 2. Create public.users entry
    console.log(`Creating public.users profile for ${doc.name}...`);
    const { error: profileError } = await supabase.from('users').insert({
      id: userId,
      email: doc.email,
      username: doc.username,
      full_name: doc.name,
      role: 'doctor',
      gender: 'male'
    });

    if (profileError && profileError.code !== '23505') { // Ignore duplicate key
      console.error(`Error creating profile for ${doc.name}:`, profileError.message);
      continue;
    }

    // 3. Create public.doctors entry
    console.log(`Creating public.doctors entry for ${doc.name}...`);
    const { error: doctorError } = await supabase.from('doctors').insert({
      user_id: userId,
      specialization: doc.spec,
      years_experience: doc.exp
    });

    if (doctorError) {
      console.error(`Error creating doctor entry for ${doc.name}:`, doctorError.message);
      continue;
    }

    // 4. Create sample schedule for the doctor
    console.log(`Creating schedule for ${doc.name}...`);
    const days = [1, 2, 3, 4, 5]; // Mon-Fri
    for (const day of days) {
      await supabase.from('doctor_schedules').insert({
        doctor_id: (await supabase.from('doctors').select('id').eq('user_id', userId).single()).data.id,
        day_of_week: day,
        start_time: "09:00:00",
        end_time: "17:00:00",
        slot_duration_minutes: 30,
        is_available: true
      });
    }

    console.log(`✅ Doctor ${doc.name} successfully created!`);
  }
  
  console.log("Done!");
}

seedDoctors();
