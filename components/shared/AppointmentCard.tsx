import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge, EmergencyBadge } from "@/components/shared/StatusBadge";
import { formatDate, formatTime } from "@/lib/utils/formatters";
import type { Appointment } from "@/types";
import { Calendar, Clock, User, Stethoscope } from "lucide-react";

interface AppointmentCardProps {
  appointment: Appointment;
  linkPrefix: string; // e.g. "/patient/appointments" or "/doctor/appointments"
  showPatient?: boolean;
  showDoctor?: boolean;
}

export function AppointmentCard({
  appointment,
  linkPrefix,
  showPatient = false,
  showDoctor = true,
}: AppointmentCardProps) {
  return (
    <Link href={`${linkPrefix}/${appointment.id}`}>
      <Card className="hover:shadow-lg hover:border-green-200 transition-all duration-300 cursor-pointer group">
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="font-semibold text-slate-900 group-hover:text-green-700 transition-colors">
                {appointment.service?.name || "Dental Service"}
              </h3>
              <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {formatDate(appointment.appointment_date)}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {formatTime(appointment.slot_time)}
                </span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <StatusBadge status={appointment.status} />
              {(() => {
                try {
                  const ai = typeof appointment.ai_analysis_result === 'string' ? JSON.parse(appointment.ai_analysis_result) : null;
                  const label = ai?.emergencyLevel ?? null;
                  return <EmergencyBadge level={appointment.emergency_level} label={label} />;
                } catch {
                  return <EmergencyBadge level={appointment.emergency_level} />;
                }
              })()}
            </div>
          </div>

          {showDoctor && appointment.doctor?.user && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
              <Stethoscope className="h-4 w-4 text-green-600" />
              <span className="text-sm text-slate-600">
                Dr. {appointment.doctor.user.full_name}
              </span>
              <span className="text-xs text-slate-400">
                — {appointment.doctor.specialization}
              </span>
            </div>
          )}

          {showPatient && appointment.patient && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
              <User className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-slate-600">
                {appointment.patient.full_name}
              </span>
            </div>
          )}

          {appointment.symptom_description && (
            <p className="text-xs text-slate-400 mt-2 line-clamp-1">
              Symptoms: {appointment.symptom_description}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
