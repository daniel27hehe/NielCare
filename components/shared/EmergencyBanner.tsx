import { AlertTriangle } from "lucide-react";

interface EmergencyBannerProps {
  message?: string;
}

export function EmergencyBanner({ message }: EmergencyBannerProps) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4 mb-4 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
          <AlertTriangle className="h-5 w-5 text-red-600" />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-red-800">
            Darurat Medis Kritis
          </h4>
          <p className="text-sm text-red-600 mt-0.5">
            {message || "Janji temu ini ditandai sebagai kritis. Disarankan penanganan segera."}
          </p>
        </div>
      </div>
    </div>
  );
}
