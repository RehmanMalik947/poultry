import { useState, useEffect } from "react";
import { CheckCircle, Eye, Pause } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { toast } from "sonner";
import { API_BASE as GLOBAL_API_BASE } from "../../../api/ApiService";

const API_BASE = `${GLOBAL_API_BASE}/super-admin`;

type Tenant = {
  id: number;
  name: string;
  email: string;
  status?: string;
  subscriptionPlan?: string;
  subscriptionExpiresAt?: string;
};

export function SuperAdminActive() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [suspendingId, setSuspendingId] = useState<number | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    fetch(`${API_BASE}/organizations?status=active`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((res) => res.success && setTenants(res.data))
      .finally(() => setLoading(false));
  }, []);

  const handleSuspend = (id: number) => {
    const token = localStorage.getItem("token");
    if (!token) return;
    setSuspendingId(id);
    fetch(`${API_BASE}/organizations/${id}/suspend`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((res) => {
        if (res.success) {
          toast.success("Store suspended.");
          setTenants((prev) => prev.filter((t) => t.id !== id));
        } else toast.error(res.message || "Failed");
      })
      .finally(() => setSuspendingId(null));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Active Stores</h1>
        <p className="text-slate-500 text-sm mt-0.5">Currently active tenants</p>
      </div>
      <Card className="rounded-xl border-slate-200/80 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-500" />
            Active ({tenants.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-slate-500 py-8">Loading...</p>
          ) : tenants.length === 0 ? (
            <p className="text-slate-500 py-8">No active stores.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-slate-100">
                  <TableHead>Store Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right w-32">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tenants.map((t) => (
                  <TableRow key={t.id} className="border-slate-100">
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell className="text-slate-600">{t.email}</TableCell>
                    <TableCell>{t.subscriptionPlan || "—"}</TableCell>
                    <TableCell>
                      {t.subscriptionExpiresAt
                        ? new Date(t.subscriptionExpiresAt).toLocaleDateString()
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-emerald-100 text-emerald-700 border-emerald-200">
                        Active
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm"><Eye className="w-4 h-4" /></Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-amber-600"
                        onClick={() => handleSuspend(t.id)}
                        disabled={suspendingId === t.id}
                      >
                        <Pause className="w-4 h-4" />
                      </Button>
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
