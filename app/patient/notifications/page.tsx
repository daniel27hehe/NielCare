"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Navbar } from "@/components/shared/Navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Notification } from "@/types";
import { getRelativeTime } from "@/lib/utils/formatters";
import { Bell, Loader2, Check } from "lucide-react";

export default function PatientNotificationsPage() {
  const supabase = createClient();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchNotifications() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
      if (data) setNotifications(data as Notification[]);
      setLoading(false);
    }
    fetchNotifications();
  }, []);

  const markAllRead = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "approval": return "✅";
      case "rejection": return "❌";
      case "booking": return "📅";
      default: return "ℹ️";
    }
  };

  if (loading) return <div className="min-h-screen" style={{ background: "#f0f1f5" }}><Navbar /><div className="flex items-center justify-center h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-green-600" /></div></div>;

  return (
    <div className="min-h-screen" style={{ background: "#f0f1f5" }}>
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 py-8 animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
          <Button variant="outline" size="sm" onClick={markAllRead}><Check className="h-4 w-4" />Mark All Read</Button>
        </div>
        {notifications.length === 0 ? (
          <div className="text-center py-16"><Bell className="h-12 w-12 text-slate-300 mx-auto mb-3" /><p className="text-slate-500">No notifications yet</p></div>
        ) : (
          <div className="space-y-2">
            {notifications.map(n => (
              <Card key={n.id} className={`border-0 shadow-sm transition-all ${!n.is_read ? "bg-green-50/50 border-l-4 border-l-green-500" : ""}`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-xl">{getTypeIcon(n.type)}</span>
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">{n.title}</p>
                      <p className="text-sm text-slate-500 mt-0.5">{n.message}</p>
                      <p className="text-xs text-slate-400 mt-1">{getRelativeTime(n.created_at)}</p>
                    </div>
                    {!n.is_read && <div className="h-2 w-2 rounded-full bg-green-500 mt-2" />}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
