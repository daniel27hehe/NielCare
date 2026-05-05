// ==========================================
// NielCare Dental — TypeScript Interfaces
// ==========================================

export type UserRole = 'patient' | 'doctor' | 'owner';
export type Gender = 'male' | 'female';
export type AppointmentStatus = 'pending' | 'approved' | 'rejected' | 'done' | 'cancelled';
export type EmergencyLevel = 'critical' | 'moderate' | 'routine';
export type ServiceCategory = 'emergency' | 'procedure' | 'routine' | 'orthodontic';
export type NotificationType = 'booking' | 'approval' | 'rejection' | 'system';

export interface User {
  id: string;
  email: string;
  username: string;
  full_name: string;
  phone?: string;
  date_of_birth?: string;
  gender?: Gender;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface Doctor {
  id: string;
  user_id: string;
  specialization: string;
  bio?: string;
  years_experience: number;
  is_active: boolean;
  user?: User;
}

export interface Service {
  id: string;
  name: string;
  description?: string;
  category: ServiceCategory;
  duration_minutes: number;
  base_price: number;
  is_active: boolean;
}

export interface DoctorSchedule {
  id: string;
  doctor_id: string;
  day_of_week: number; // 0=Sunday, 6=Saturday
  start_time: string;
  end_time: string;
  slot_duration_minutes: number;
  is_available: boolean;
}

export interface Appointment {
  id: string;
  patient_id: string;
  doctor_id: string;
  service_id: string;
  appointment_date: string;
  slot_time: string;
  status: AppointmentStatus;
  symptom_description?: string;
  emergency_level: EmergencyLevel;
  ai_analysis_result?: string;
  created_at: string;
  // Joined data
  patient?: User;
  doctor?: Doctor;
  service?: Service;
}

export interface MedicalRecord {
  id: string;
  appointment_id: string;
  patient_id: string;
  doctor_id: string;
  diagnosis_notes: string;
  treatment_given: string;
  medications_prescribed?: string;
  treatment_cost?: number;
  created_at: string;
  // Joined
  appointment?: Appointment;
  patient?: User;
  doctor?: Doctor;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  is_read: boolean;
  created_at: string;
}

// Booking flow state
export interface BookingState {
  step: number;
  service?: Service;
  symptoms?: string;
  emergencyLevel?: EmergencyLevel;
  aiAnalysis?: AIAnalysisResult;
  doctor?: Doctor;
  date?: string;
  time?: string;
}

export interface AIAnalysisResult {
  emergencyLevel: EmergencyLevel;
  reason: string;
  recommendation: string;
}

// Dashboard stats
export interface OwnerStats {
  totalPatients: number;
  totalAppointments: number;
  totalRevenue: number;
  totalDoctors: number;
  appointmentsByDay: { date: string; count: number }[];
  revenueByMonth: { month: string; revenue: number }[];
  popularServices: { name: string; count: number }[];
  doctorPerformance: { name: string; appointments: number; revenue: number }[];
}

export interface DoctorStats {
  todayAppointments: number;
  pendingAppointments: number;
  totalPatients: number;
  completedThisMonth: number;
  earningsThisMonth?: number;
}

export interface PatientStats {
  upcomingAppointments: number;
  completedAppointments: number;
  unreadNotifications: number;
}
