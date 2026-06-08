import { useState, useEffect, useCallback } from "react";
import { Eye, Pause, Play, Trash2, Building2, Mail, Phone, MapPin, Users, Calendar, CheckCircle, Pencil } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { Input } from "../../components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "../../components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../components/ui/alert-dialog";
import { toast } from "sonner";
import { Label } from "../../components/ui/label";
import { TablePagination } from "../../components/shared/TablePagination";
import { API_BASE as GLOBAL_API_BASE } from "../../../api/ApiService";

const API_BASE = `${GLOBAL_API_BASE}/super-admin`;
const PAGE_SIZE = 10;

type Tenant = {
  id: number;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  emergencyContact?: string;
  totalEmployees?: number;
  industryCategory?: string;
  status?: string;
  subscriptionPlan?: string;
  createdAt: string;
};

type Plan = {
  id: number;
  name: string;
  price: number;
  durationDays: number;
  storeCount?: number;
};

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem("token");
  return { Authorization: `Bearer ${token}` };
}

const statusClass: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  suspended: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  deleted: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

export function SuperAdminStores() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [viewOrg, setViewOrg] = useState<Tenant | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Tenant | null>(null);
  const [approveTarget, setApproveTarget] = useState<Tenant | null>(null);
  const [plansList, setPlansList] = useState<Plan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<string>("");
  const [actionLoading, setActionLoading] = useState(false);
  const [editTarget, setEditTarget] = useState<Tenant | null>(null);
  const [editForm, setEditForm] = useState<Partial<Tenant> & { timezone?: string }>({});
  const [editLoading, setEditLoading] = useState(false);
  const [page, setPage] = useState(1);

  const fetchOrganizations = useCallback(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    setLoading(true);
    fetch(`${API_BASE}/organizations`, { headers: getAuthHeaders() })
      .then((r) => r.json())
      .then((res) => {
        if (res.success && Array.isArray(res.data)) {
          setTenants(res.data);
        } else {
          setTenants([]);
        }
      })
      .catch(() => setTenants([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchOrganizations();
  }, [fetchOrganizations]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  useEffect(() => {
    if (!approveTarget) return;
    const token = localStorage.getItem("token");
    if (!token) return;
    fetch(`${API_BASE}/plans`, { headers: getAuthHeaders() })
      .then((r) => r.json())
      .then((res) => {
        if (res.success && Array.isArray(res.data)) setPlansList(res.data);
        else setPlansList([]);
      })
      .catch(() => setPlansList([]));
    setSelectedPlan("");
  }, [approveTarget]);

  useEffect(() => {
    if (!editTarget) return;
    setEditLoading(true);
    fetch(`${API_BASE}/organizations/${editTarget.id}`, { headers: getAuthHeaders() })
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data) {
          const d = res.data as Tenant & { timezone?: string };
          setEditForm({
            name: d.name ?? "",
            email: d.email ?? "",
            phone: d.phone ?? "",
            emergencyContact: d.emergencyContact ?? "",
            address: d.address ?? "",
            totalEmployees: d.totalEmployees ?? undefined,
            industryCategory: d.industryCategory ?? "",
            timezone: d.timezone ?? "UTC",
            status: d.status ?? "pending",
            subscriptionPlan: d.subscriptionPlan ?? "",
          });
        }
      })
      .catch(() => setEditForm({}))
      .finally(() => setEditLoading(false));
  }, [editTarget]);

  async function handleSaveEdit() {
    if (!editTarget) return;
    setActionLoading(true);
    try {
      const res = await fetch(`${API_BASE}/organizations/${editTarget.id}`, {
        method: "PUT",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name,
          email: editForm.email,
          phone: editForm.phone,
          emergencyContact: editForm.emergencyContact || null,
          address: editForm.address || null,
          totalEmployees: editForm.totalEmployees ?? null,
          industryCategory: editForm.industryCategory || null,
          timezone: editForm.timezone || "UTC",
          status: editForm.status || "pending",
          subscriptionPlan: editForm.subscriptionPlan || null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Organization updated.");
        setEditTarget(null);
        setEditForm({});
        fetchOrganizations();
        if (viewOrg?.id === editTarget.id) setViewOrg(data.data);
      } else {
        toast.error(data.message || "Failed to update.");
      }
    } catch {
      toast.error("Request failed.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleSuspend(org: Tenant) {
    setActionLoading(true);
    try {
      const res = await fetch(`${API_BASE}/organizations/${org.id}/suspend`, {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Organization suspended.");
        fetchOrganizations();
        if (viewOrg?.id === org.id) setViewOrg(null);
      } else {
        toast.error(data.message || "Failed to suspend.");
      }
    } catch {
      toast.error("Request failed.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleApprove() {
    if (!approveTarget) return;
    setActionLoading(true);
    try {
      const res = await fetch(`${API_BASE}/organizations/${approveTarget.id}/approve`, {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionPlan: selectedPlan || undefined }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Organization approved and set to active.");
        setApproveTarget(null);
        setSelectedPlan("");
        fetchOrganizations();
        if (viewOrg?.id === approveTarget.id) setViewOrg(null);
      } else {
        toast.error(data.message || "Failed to approve.");
      }
    } catch {
      toast.error("Request failed.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleActivate(org: Tenant) {
    setActionLoading(true);
    try {
      const res = await fetch(`${API_BASE}/organizations/${org.id}/activate`, {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Organization activated.");
        fetchOrganizations();
        if (viewOrg?.id === org.id) setViewOrg(null);
      } else {
        toast.error(data.message || "Failed to activate.");
      }
    } catch {
      toast.error("Request failed.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setActionLoading(true);
    try {
      const res = await fetch(`${API_BASE}/organizations/${deleteTarget.id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Organization removed.");
        setDeleteTarget(null);
        fetchOrganizations();
        if (viewOrg?.id === deleteTarget.id) setViewOrg(null);
      } else {
        toast.error(data.message || "Failed to remove.");
      }
    } catch {
      toast.error("Request failed.");
    } finally {
      setActionLoading(false);
    }
  }

  const filtered = tenants.filter(
    (t) =>
      (t.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (t.email || "").toLowerCase().includes(search.toLowerCase()) ||
      (t.phone || "").includes(search)
  );
  const totalFiltered = filtered.length;
  const paginatedList = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Stores / Tenants</h1>
        <p className="text-slate-500 text-sm mt-0.5">Registered organizations (salons) that have signed up</p>
      </div>
      <Card className="rounded-xl border-slate-200/80 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold">Registered organizations</CardTitle>
          <Input
            placeholder="Search by organization, email or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs h-9 rounded-lg border-slate-200"
          />
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-slate-500 py-8">Loading...</p>
          ) : (
            <>
            <Table>
              <TableHeader>
                <TableRow className="border-slate-100">
                  <TableHead>Organization</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Registered</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right w-32">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedList.map((t) => (
                  <TableRow key={t.id} className="border-slate-100">
                    <TableCell className="font-medium">{t.name || "—"}</TableCell>
                    <TableCell className="text-slate-600">{t.email || "—"}</TableCell>
                    <TableCell className="text-slate-600">{t.phone || "—"}</TableCell>
                    <TableCell className="text-slate-600 text-sm">
                      {t.createdAt ? new Date(t.createdAt).toLocaleDateString(undefined, { dateStyle: "medium" }) : "—"}
                    </TableCell>
                    <TableCell>{t.subscriptionPlan || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`capitalize ${statusClass[t.status || "pending"] || ""}`}>
                        {t.status || "pending"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setViewOrg(t)}
                        title="View details"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditTarget(t)}
                        disabled={actionLoading}
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      {(t.status === "pending" || !t.status) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setApproveTarget(t)}
                          disabled={actionLoading}
                          title="Approve & set active"
                          className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSuspend(t)}
                        disabled={actionLoading || t.status === "suspended"}
                        title="Suspend"
                      >
                        <Pause className="w-4 h-4" />
                      </Button>
                      {t.status === "suspended" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleActivate(t)}
                          disabled={actionLoading}
                          title="Activate"
                          className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                        >
                          <Play className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                        onClick={() => setDeleteTarget(t)}
                        disabled={actionLoading}
                        title="Remove"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TablePagination
              total={totalFiltered}
              page={page}
              limit={PAGE_SIZE}
              onPageChange={setPage}
              itemLabel="organizations"
            />
            </>
          )}
          {!loading && filtered.length === 0 && (
            <p className="text-slate-500 py-8 text-center">
              {tenants.length === 0 ? "No registered organizations yet. They will appear here after signing up." : "No matching organizations."}
            </p>
          )}
        </CardContent>
      </Card>

      {/* View organization details */}
      <Sheet open={!!viewOrg} onOpenChange={(open) => !open && setViewOrg(null)}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {viewOrg?.name || "Organization"}
            </SheetTitle>
          </SheetHeader>
          {viewOrg && (
            <div className="space-y-4 px-4 pb-4">
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>{viewOrg.email || "—"}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>{viewOrg.phone || "—"}</span>
              </div>
              {viewOrg.emergencyContact && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>Emergency: {viewOrg.emergencyContact}</span>
                </div>
              )}
              {viewOrg.address && (
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <span>{viewOrg.address}</span>
                </div>
              )}
              {(viewOrg.totalEmployees != null || viewOrg.industryCategory) && (
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>
                    {viewOrg.industryCategory || ""}
                    {viewOrg.totalEmployees != null && ` · ${viewOrg.totalEmployees} employees`}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>
                  Registered {viewOrg.createdAt ? new Date(viewOrg.createdAt).toLocaleDateString(undefined, { dateStyle: "medium" }) : "—"}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className={`capitalize ${statusClass[viewOrg.status || "pending"] || ""}`}>
                  {viewOrg.status || "pending"}
                </Badge>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditTarget(viewOrg)}
                  disabled={actionLoading}
                >
                  <Pencil className="w-4 h-4 mr-1" />
                  Edit
                </Button>
                {viewOrg.status === "suspended" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleActivate(viewOrg)}
                    disabled={actionLoading}
                    className="text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:border-emerald-800 dark:hover:bg-emerald-950/30"
                  >
                    <Play className="w-4 h-4 mr-1" />
                    Activate
                  </Button>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Edit organization */}
      <Sheet open={!!editTarget} onOpenChange={(open) => !open && setEditTarget(null)}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Edit organization</SheetTitle>
          </SheetHeader>
          {editLoading ? (
            <p className="text-muted-foreground py-4">Loading…</p>
          ) : (
            <div className="space-y-4 px-4 pb-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={editForm.name ?? ""}
                  onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Organization name"
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={editForm.email ?? ""}
                  onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="Email"
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={editForm.phone ?? ""}
                  onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="Phone"
                />
              </div>
              <div className="space-y-2">
                <Label>Emergency contact</Label>
                <Input
                  value={editForm.emergencyContact ?? ""}
                  onChange={(e) => setEditForm((f) => ({ ...f, emergencyContact: e.target.value }))}
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Input
                  value={editForm.address ?? ""}
                  onChange={(e) => setEditForm((f) => ({ ...f, address: e.target.value }))}
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-2">
                <Label>Total employees</Label>
                <Input
                  type="number"
                  min={0}
                  value={editForm.totalEmployees ?? ""}
                  onChange={(e) => setEditForm((f) => ({ ...f, totalEmployees: e.target.value ? parseInt(e.target.value, 10) : undefined }))}
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-2">
                <Label>Industry category</Label>
                <Input
                  value={editForm.industryCategory ?? ""}
                  onChange={(e) => setEditForm((f) => ({ ...f, industryCategory: e.target.value }))}
                  placeholder="e.g. Salon, Spa"
                />
              </div>
              <div className="space-y-2">
                <Label>Timezone</Label>
                <Input
                  value={editForm.timezone ?? "UTC"}
                  onChange={(e) => setEditForm((f) => ({ ...f, timezone: e.target.value }))}
                  placeholder="UTC"
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={editForm.status ?? "pending"}
                  onValueChange={(v) => setEditForm((f) => ({ ...f, status: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Subscription plan</Label>
                <Input
                  value={editForm.subscriptionPlan ?? ""}
                  onChange={(e) => setEditForm((f) => ({ ...f, subscriptionPlan: e.target.value }))}
                  placeholder="e.g. Basic, Pro"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => setEditTarget(null)} disabled={actionLoading}>
                  Cancel
                </Button>
                <Button onClick={() => void handleSaveEdit()} disabled={actionLoading}>
                  {actionLoading ? "Saving…" : "Save"}
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Approve organization: select plan & set active */}
      <Dialog open={!!approveTarget} onOpenChange={(open) => !open && setApproveTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Approve organization</DialogTitle>
            <DialogDescription>
              Select a subscription plan and approve. This will set the organization to <strong>Active</strong> and send login credentials to their email.
            </DialogDescription>
          </DialogHeader>
          {approveTarget && (
            <div className="space-y-4 py-2">
              <p className="text-sm font-medium text-foreground">{approveTarget.name}</p>
              <div className="space-y-2">
                <Label>Subscription plan</Label>
                <Select value={selectedPlan || "_none"} onValueChange={(v) => setSelectedPlan(v === "_none" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a plan (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">— No plan —</SelectItem>
                    {plansList.map((p) => (
                      <SelectItem key={p.id} value={p.name}>
                        {p.name} {p.price != null ? `($${p.price}/mo)` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveTarget(null)} disabled={actionLoading}>
              Cancel
            </Button>
            <Button onClick={() => void handleApprove()} disabled={actionLoading}>
              {actionLoading ? "Approving…" : "Approve & set active"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && !actionLoading && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove organization?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove &quot;{deleteTarget?.name}&quot; from the list. You can filter by status later if needed. Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={actionLoading}
              onClick={() => void handleDelete()}
            >
              {actionLoading ? "Removing…" : "Remove"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
