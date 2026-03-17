import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, Users, Bell, Database } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="module-page">
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { title: "Company Profile", desc: "Update company name, GST, address", icon: Shield },
          { title: "User Management", desc: "Manage users, roles, and permissions", icon: Users },
          { title: "Notifications", desc: "Configure alerts and reminders", icon: Bell },
          { title: "Database", desc: "Backup and restore data", icon: Database },
        ].map((s) => (
          <Card key={s.title} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <s.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">{s.title}</CardTitle>
                  <p className="text-sm text-muted-foreground">{s.desc}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button variant="outline" size="sm">Configure</Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
