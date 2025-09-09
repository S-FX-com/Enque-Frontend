"use client";

import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { updateAgentProfile } from "@/services/agent";
import { toast } from "sonner";

export function TeamsNotificationSettings() {
  const { user } = useAuth();
  const [isEnabled, setIsEnabled] = useState(false);

  useEffect(() => {
    if (user) {
      setIsEnabled(user.teams_notifications_enabled || false);
    }
  }, [user]);

  const handleToggle = async (checked: boolean) => {
    if (!user) return;
    setIsEnabled(checked);
    try {
      const updatedAgent = await updateAgentProfile(user.id, {
        teams_notifications_enabled: checked,
      });
      if (updatedAgent) {
        toast.success("Teams notification settings updated.");
      } else {
        toast.error("Failed to update settings.");
        setIsEnabled(!checked);
      }
    } catch (error) {
      toast.error(`An error occurred while updating settings: ${error instanceof Error ? error.message : String(error)}`);
      setIsEnabled(!checked);
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <Switch
        id="teams-notifications"
        checked={isEnabled}
        onCheckedChange={handleToggle}
      />
      <Label htmlFor="teams-notifications">Enable Teams Notifications</Label>
    </div>
  );
}
