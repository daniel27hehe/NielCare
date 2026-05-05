import { Badge } from "@/components/ui/badge";
import type { AppointmentStatus, EmergencyLevel } from "@/types";
import { capitalize } from "@/lib/utils/formatters";

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
  const inferVariant = () => {
    if (level && ["critical", "moderate", "routine"].includes(level)) return level as "critical" | "moderate" | "routine";
    if (label) {
      const l = label.toLowerCase();
      if (l.includes("critical")) return "critical";
      if (l.includes("moderate")) return "moderate";
    }
    return "routine";
  };

  const variant = inferVariant();
  const content = label ?? (level ? capitalize(level) : "Routine");

  return (
    <Badge variant={variant}>
      {variant === "critical" && "🚨 "}
      {content}
    </Badge>
  );
}
