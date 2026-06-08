import { DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";

export function SuperAdminBilling() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Billing & Payments</h1>
        <p className="text-slate-500 text-sm mt-0.5">Revenue and payment gateway</p>
      </div>
      <Card className="rounded-xl border-slate-200/80 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-500 text-sm">
            Billing and payment gateway integration can be configured here. Connect Stripe, PayPal, or your preferred provider.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
