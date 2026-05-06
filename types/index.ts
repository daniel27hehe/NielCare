// ==========================================
// NielCare Dental — TypeScript Interfaces
// ==========================================

export type UserRole = 'patient' | 'doctor' | 'owner';
export type Gender = 'male' | 'female';
export type AppointmentStatus = 'pending' | 'approved' | 'rejected' | 'done' | 'cancelled';
// EmergencyLevel internal values: 'critical'=Prioritas, 'moderate'=Sedang, 'routine'=Ringan
export type EmergencyLevel = 'critical' | 'moderate' | 'routine';
export type NotificationType = 'booking' | 'approval' | 'rejection' | 'system';

// Human-readable label map for emergency levels
export const EMERGENCY_LEVEL_LABELS: Record<EmergencyLevel, string> = {
  critical: 'Prioritas',
  moderate: 'Sedang',
  routine: 'Ringan',
};

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

// Service interface removed — services concept has been replaced by AI symptom analysis

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
  service_id?: string | null;
  appointment_date: string;
  slot_time: string;
  status: AppointmentStatus;
  symptom_description?: string;
  emergency_level: EmergencyLevel;
  ai_analysis_result?: string;
  estimated_cost?: number | null;
  created_at: string;
  // Joined data
  patient?: User;
  doctor?: Doctor;
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
  symptoms?: string;
  emergencyLevel?: EmergencyLevel;
  aiAnalysis?: AIAnalysisResult;
  doctor?: Doctor;
  date?: string;
  time?: string;
}

export interface AIAnalysisResult {
  emergencyLevel: EmergencyLevel;
  possibleCondition: string;
  reason: string;
  recommendation: string;
  estimatedCost: number;
  estimatedCostLabel: string;
  recommendedSpecialization?: string;
}

// Dashboard stats
export interface OwnerStats {
  totalPatients: number;
  totalAppointments: number;
  totalRevenue: number;
  totalDoctors: number;
  appointmentsByDay: { date: string; count: number }[];
  revenueByMonth: { month: string; revenue: number }[];
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
}
