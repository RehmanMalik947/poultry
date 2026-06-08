import { useState, useEffect } from "react";
import { CreditCard, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { API_BASE as GLOBAL_API_BASE } from "../../../api/ApiService";

const API_BASE = `${GLOBAL_API_BASE}/super-admin`;

type Plan = {
  id: number;
  name: string;
  price: number;
  durationDays: number;
  storeCount: number;
};

export function SuperAdminPlans() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    fetch(`${API_BASE}/plans`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((res) => res.success && setPlans(res.data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Subscription Plans</h1>
          <p className="text-slate-500 text-sm mt-0.5">Manage plans and pricing</p>
        </div>
        <Button className="rounded-lg">
          <Plus className="w-4 h-4 mr-2" />
          Create New Plan
        </Button>
      </div>
      <Card className="rounded-xl border-slate-200/80 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            Plans
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-slate-500 py-8">Loading...</p>
          ) : plans.length === 0 ? (
            <p className="text-slate-500 py-8">No plans yet. Create one to get started.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-slate-100">
                  <TableHead>Plan Name</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Stores Using</TableHead>
                  <TableHead className="text-right w-20">Edit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.map((p) => (
                  <TableRow key={p.id} className="border-slate-100">
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>${p.price}/mo</TableCell>
                    <TableCell>{p.durationDays} days</TableCell>
                    <TableCell>{p.storeCount}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">Edit</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
