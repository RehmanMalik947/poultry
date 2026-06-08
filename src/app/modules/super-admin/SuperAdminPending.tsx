import { useState, useEffect } from "react";
import { Clock, Check, Eye } from "lucide-react";
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
  phone?: string;
  location?: string;
  numberOfMembers?: number;
  status: string;
  createdAt: string;
};

export function SuperAdminPending() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [approvingId, setApprovingId] = useState<number | null>(null);

  const load = () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    fetch(`${API_BASE}/organizations?status=pending`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((res) => res.success && setTenants(res.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleApprove = (id: number) => {
    const token = localStorage.getItem("token");
    if (!token) return;
    setApprovingId(id);
    fetch(`${API_BASE}/organizations/${id}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ subscriptionPlan: "Basic", durationDays: 30 }),
    })
      .then((r) => r.json())
      .then((res) => {
        if (res.success) {
          toast.success("Store approved. Password sent to email.");
          load();
        } else toast.error(res.message || "Failed to approve");
      })
      .catch(() => toast.error("Request failed"))
      .finally(() => setApprovingId(null));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Pending Requests</h1>
        <p className="text-slate-500 text-sm mt-0.5">Approve new store registrations</p>
      </div>
      <Card className="rounded-xl border-slate-200/80 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-500" />
            Pending Approval ({tenants.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-slate-500 py-8">Loading...</p>
          ) : tenants.length === 0 ? (
            <p className="text-slate-500 py-8">No pending requests.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-slate-100">
                  <TableHead>Store Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Members</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right w-40">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tenants.map((t) => (
                  <TableRow key={t.id} className="border-slate-100">
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell className="text-slate-600">{t.email}</TableCell>
                    <TableCell>{t.location || "—"}</TableCell>
                    <TableCell>{t.numberOfMembers ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-200">
                        Pending
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleApprove(t.id)} disabled={approvingId === t.id}>
                        <Check className="w-4 h-4 mr-1" />
                        Approve
                      </Button>
                      <Button variant="ghost" size="sm"><Eye className="w-4 h-4" /></Button>
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
