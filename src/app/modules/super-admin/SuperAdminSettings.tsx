import { Settings as SettingsIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Separator } from "../../components/ui/separator";

export function SuperAdminSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Settings</h1>
        <p className="text-slate-500 text-sm mt-0.5">Platform configuration</p>
      </div>

      <Card className="rounded-xl border-slate-200/80 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <SettingsIcon className="w-4 h-4" />
            General
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label>Platform name</Label>
            <Input defaultValue="Salon Pro" className="max-w-xs rounded-lg border-slate-200" />
          </div>
          <div className="grid gap-2">
            <Label>Default subscription plan</Label>
            <Input defaultValue="Basic" className="max-w-xs rounded-lg border-slate-200" />
          </div>
          <div className="grid gap-2">
            <Label>Trial period (days)</Label>
            <Input type="number" defaultValue="14" className="max-w-xs rounded-lg border-slate-200" />
          </div>
          <Button className="rounded-lg">Save</Button>
        </CardContent>
      </Card>

      <Card className="rounded-xl border-slate-200/80 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Payment gateway</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-slate-500 text-sm">Configure Stripe, PayPal, or other payment providers.</p>
          <Button variant="outline" className="rounded-lg">Configure</Button>
        </CardContent>
      </Card>

      <Card className="rounded-xl border-slate-200/80 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Email configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-slate-500 text-sm">SMTP or transactional email (SendGrid, etc.) for approval emails.</p>
          <Button variant="outline" className="rounded-lg">Configure</Button>
        </CardContent>
      </Card>

      <Card className="rounded-xl border-slate-200/80 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Security</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-500 text-sm">Two-factor authentication, session timeout, and IP allowlist.</p>
          <Button variant="outline" className="rounded-lg mt-2">Security settings</Button>
        </CardContent>
      </Card>
    </div>
  );
}
