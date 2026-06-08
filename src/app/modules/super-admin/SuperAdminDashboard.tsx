import { useState, useEffect } from "react";
import {
  Store,
  CheckCircle,
  Clock,
  DollarSign,
  TrendingUp,
  CreditCard,
  Activity,
  Plus,
  Eye,
  Check,
  Pause,
  Trash2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import React from "react";
import { API_BASE as GLOBAL_API_BASE } from "../../../api/ApiService";

const API_BASE = `${GLOBAL_API_BASE}/super-admin`;

function getToken() {
  return localStorage.getItem("token");
}

type Stats = {
  totalStores: number;
  activeStores: number;
  pendingRequests: number;
  suspendedStores: number;
  monthlyRevenue: number;
};

type Tenant = {
  id: number;
  name: string;
  email: string;
  phone?: string;
  emergencyContact?: string;
  address?: string;
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
  storeCount: number;
};

export function SuperAdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) return;

    const headers: HeadersInit = {
      Authorization: `Bearer ${token}`,
    };

    Promise.all([
      fetch(`${API_BASE}/dashboard-stats`, { headers }).then((r) => r.json()),
      fetch(`${API_BASE}/organizations`, { headers }).then((r) => r.json()),
      fetch(`${API_BASE}/plans`, { headers }).then((r) => r.json()),
    ])
      .then(([statsRes, tenantsRes, plansRes]) => {
        if (statsRes.success) setStats(statsRes.data);
        if (tenantsRes.success) setTenants(tenantsRes.data);
        if (plansRes.success) setPlans(plansRes.data);
      })
      .catch(() => setError("Failed to load data"))
      .finally(() => setLoading(false));
  }, []);

  const activeTenants = tenants.filter((t) => t.status === "active");
  const pendingTenants = tenants.filter((t) => t.status === "pending");
  const suspendedTenants = tenants.filter((t) => t.status === "suspended");

  const kpiCards = [
    {
      title: "Total Stores",
      value: stats?.totalStores ?? "—",
      icon: Store,
      color: "bg-indigo-500",
      bgLight: "bg-indigo-50",
      textColor: "text-indigo-700",
    },
    {
      title: "Active Stores",
      value: stats?.activeStores ?? "—",
      icon: CheckCircle,
      color: "bg-emerald-500",
      bgLight: "bg-emerald-50",
      textColor: "text-emerald-700",
    },
    {
      title: "Pending Requests",
      value: stats?.pendingRequests ?? "—",
      icon: Clock,
      color: "bg-amber-500",
      bgLight: "bg-amber-50",
      textColor: "text-amber-700",
    },
    {
      title: "Monthly Revenue",
      value: stats?.monthlyRevenue != null ? `$${stats.monthlyRevenue.toLocaleString()}` : "—",
      icon: DollarSign,
      color: "bg-violet-500",
      bgLight: "bg-violet-50",
      textColor: "text-violet-700",
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-slate-500">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Dashboard Overview</h1>
        <p className="text-slate-500 text-sm mt-0.5">Platform control and subscription intelligence</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.title} className="rounded-xl border-slate-200/80 shadow-sm overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500">{card.title}</p>
                    <p className="text-2xl font-semibold text-slate-900 mt-1">{card.value}</p>
                  </div>
                  <div className={`p-2.5 rounded-xl ${card.bgLight}`}>
                    <Icon className={`w-5 h-5 ${card.textColor}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Subscription Plans */}
        <Card className="lg:col-span-2 rounded-xl border-slate-200/80 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-semibold">Subscription Plans</CardTitle>
            <Button size="sm" className="rounded-lg">
              <Plus className="w-4 h-4 mr-1" />
              Create New Plan
            </Button>
          </CardHeader>
          <CardContent>
            {plans.length === 0 ? (
              <p className="text-slate-500 text-sm py-4">No plans yet. Create one from Settings or seed the database.</p>
            ) : (
              <div className="rounded-lg border border-slate-200 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-100">
                      <TableHead className="font-medium">Plan</TableHead>
                      <TableHead className="font-medium">Price</TableHead>
                      <TableHead className="font-medium">Stores</TableHead>
                      <TableHead className="font-medium w-20">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {plans.map((plan) => (
                      <TableRow key={plan.id} className="border-slate-100">
                        <TableCell className="font-medium">{plan.name}</TableCell>
                        <TableCell>${plan.price}/mo</TableCell>
                        <TableCell>{plan.storeCount}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" className="h-8 text-slate-600">
                            Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="rounded-xl border-slate-200/80 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Activity className="w-4 h-4 text-slate-500" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm">
              {pendingTenants.slice(0, 3).map((t) => (
                <li key={t.id} className="flex items-center gap-2 text-slate-600">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  New request: {t.name}
                </li>
              ))}
              {activeTenants.slice(0, 2).map((t) => (
                <li key={t.id} className="flex items-center gap-2 text-slate-600">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Active: {t.name}
                </li>
              ))}
              {tenants.length === 0 && (
                <li className="text-slate-400">No recent activity</li>
              )}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Store Status Tabs */}
      <Card className="rounded-xl border-slate-200/80 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Store Status</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="active" className="w-full">
            <TabsList className="bg-slate-100 p-1 rounded-lg">
              <TabsTrigger value="active" className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">
                Active Stores
              </TabsTrigger>
              <TabsTrigger value="suspended" className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">
                Suspended
              </TabsTrigger>
              <TabsTrigger value="pending" className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">
                Pending Approval
              </TabsTrigger>
            </TabsList>
            <TabsContent value="active" className="mt-4">
              <StoresTable tenants={activeTenants} onApprove={() => {}} onSuspend={() => {}} showApprove={false} />
            </TabsContent>
            <TabsContent value="suspended" className="mt-4">
              <StoresTable tenants={suspendedTenants} onApprove={() => {}} onSuspend={() => {}} showApprove={false} />
            </TabsContent>
            <TabsContent value="pending" className="mt-4">
              <StoresTable tenants={pendingTenants} onApprove={() => {}} onSuspend={() => {}} showApprove />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

function StoresTable({
  tenants,
  onApprove,
  onSuspend,
  showApprove,
}: {
  tenants: Tenant[];
  onApprove: (id: number) => void;
  onSuspend: (id: number) => void;
  showApprove: boolean;
}) {
  const statusColor: Record<string, string> = {
    active: "bg-emerald-100 text-emerald-700 border-emerald-200",
    pending: "bg-amber-100 text-amber-700 border-amber-200",
    suspended: "bg-slate-100 text-slate-600 border-slate-200",
  };

  if (tenants.length === 0) {
    return <p className="text-slate-500 text-sm py-4">No stores in this category.</p>;
  }

  return (
    <div className="rounded-lg border border-slate-200 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-slate-100">
            <TableHead className="font-medium">Store Name</TableHead>
            <TableHead className="font-medium">Owner / Email</TableHead>
            <TableHead className="font-medium">Plan</TableHead>
            <TableHead className="font-medium">Status</TableHead>
            <TableHead className="font-medium text-right w-40">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tenants.map((t) => (
            <TableRow key={t.id} className="border-slate-100">
              <TableCell className="font-medium">{t.name}</TableCell>
              <TableCell>
                <span className="text-slate-600">{t.email}</span>
              </TableCell>
              <TableCell>{t.subscriptionPlan || "—"}</TableCell>
              <TableCell>
                <Badge variant="outline" className={`capitalize ${statusColor[t.status || ""] || ""}`}>
                  {t.status || "—"}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <Button variant="ghost" size="sm" className="h-8">
                    <Eye className="w-4 h-4" />
                  </Button>
                  {showApprove && (
                    <Button variant="ghost" size="sm" className="h-8 text-emerald-600 hover:text-emerald-700">
                      <Check className="w-4 h-4" />
                    </Button>
                  )}
                  {t.status === "active" && (
                    <Button variant="ghost" size="sm" className="h-8 text-amber-600">
                      <Pause className="w-4 h-4" />
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" className="h-8 text-red-600 hover:text-red-700">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
