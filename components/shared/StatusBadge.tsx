import { Badge } from "@/components/ui/badge";
import type { AppointmentStatus, EmergencyLevel } from "@/types";
import { EMERGENCY_LEVEL_LABELS } from "@/types";
import { capitalize } from "@/lib/utils/formatters";
import { Siren, AlertTriangle, CheckCircle } from "lucide-react";

interface StatusBadgeProps {
  status: AppointmentStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <Badge variant={status as "pending" | "approved" | "rejected" | "done" | "cancelled"}>
      {capitalize(status)}
    </Badge>
  );
}

interface EmergencyBadgeProps {
  level?: EmergencyLevel | null;
  label?: string | null; // raw label from AI analysis if available
}

export function EmergencyBadge({ level, label }: EmergencyBadgeProps) {
  // Determine variant for styling: prefer explicit `level`, otherwise infer from label text
  const inferVariant = (): EmergencyLevel => {
    if (level && ["critical", "moderate", "routine"].includes(level)) return level as EmergencyLevel;
    if (label) {
      const l = label.toLowerCase();
      if (l.includes("critical") || l.includes("prioritas")) return "critical";
      if (l.includes("moderate") || l.includes("sedang")) return "moderate";
    }
    return "routine";
  };

  const variant = inferVariant();
  // Use Indonesian label mapping
  const displayLabel = EMERGENCY_LEVEL_LABELS[variant];
  const Icon = variant === "critical" ? Siren : variant === "moderate" ? AlertTriangle : CheckCircle;

  return (
    <Badge variant={variant} className="flex items-center gap-1.5 px-2.5 py-0.5">
      <Icon className="h-3.5 w-3.5" />
      <span>{displayLabel}</span>
    </Badge>
  );
}
