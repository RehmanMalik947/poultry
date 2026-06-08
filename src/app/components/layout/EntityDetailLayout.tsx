import React from "react";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Badge } from "../ui/badge";
import { ArrowLeft, Pencil, Trash2, type LucideIcon } from "lucide-react";

type StatCard = { label: string; value: React.ReactNode; highlight?: boolean };

type EntityDetailLayoutProps = {
  backLabel: string;
  onBack: () => void;
  title: string;
  subtitle?: string;
  badge?: string;
  badgeClassName?: string;
  titleClassName?: string;
  icon: LucideIcon;
  iconBgClass?: string;
  iconColorClass?: string;
  gradientClass?: string;
  statCards?: StatCard[];
  tabs?: { value: string; label: string; icon?: LucideIcon }[];
  defaultTab?: string;
  children: React.ReactNode;
};

export function EntityDetailLayout({
  backLabel,
  onBack,
  title,
  subtitle,
  badge,
  badgeClassName,
  titleClassName,
  icon: Icon,
  iconBgClass = "bg-primary/10",
  iconColorClass = "text-primary",
  gradientClass = "from-slate-50 via-indigo-50/30 to-purple-50/40 dark:from-slate-900/50 dark:via-indigo-950/20 dark:to-purple-950/20",
  statCards = [],
  tabs = [],
  defaultTab,
  children,
}: EntityDetailLayoutProps) {
  const [activeTab, setActiveTab] = React.useState(defaultTab ?? tabs[0]?.value ?? "");

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <Button
        type="button"
        variant="ghost"
        className="-ml-2 gap-2 text-muted-foreground hover:text-foreground hover:bg-muted/50"
        onClick={onBack}
      >
        <ArrowLeft className="h-4 w-4" />
        {backLabel}
      </Button>

      <Card
        className={`overflow-hidden border-0 shadow-xl bg-gradient-to-br ${gradientClass} ring-1 ring-black/5`}
      >
        <CardContent className="p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-5 sm:gap-6">
            <div
              className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl shadow-sm ${iconBgClass} ${iconColorClass}`}
            >
              <Icon className="h-8 w-8" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-3">
                <h2 className={`font-bold tracking-tight ${titleClassName ?? "text-2xl"}`}>{title}</h2>
                {badge && (
                  <Badge variant="secondary" className={`font-medium capitalize ${badgeClassName ?? ""}`}>
                    {badge}
                  </Badge>
                )}
              </div>
              {subtitle && (
                <p className="mt-1.5 text-sm font-medium text-muted-foreground">{subtitle}</p>
              )}
              {statCards.length > 0 && (
                <div className="mt-5 flex flex-wrap gap-6 sm:gap-8">
                  {statCards.map((s, i) => (
                    <div key={i} className="flex flex-col gap-0.5">
                      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        {s.label}
                      </span>
                      <span
                        className={
                          s.highlight
                            ? "text-lg font-semibold text-primary"
                            : "text-base font-semibold text-foreground"
                        }
                      >
                        {s.value}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {tabs.length > 0 ? (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {tabs.length > 1 && (
            <TabsList className="h-auto flex-wrap gap-1 rounded-xl bg-muted/50 p-1.5 w-full sm:w-auto">
              {tabs.map((t) => (
                <TabsTrigger
                  key={t.value}
                  value={t.value}
                  className="rounded-lg px-4 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:font-medium"
                >
                  {t.icon && <t.icon className="mr-2 h-4 w-4 shrink-0" />}
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
          )}
          {children}
        </Tabs>
      ) : (
        children
      )}
    </div>
  );
}

type DetailSectionProps = {
  title: string;
  onEdit?: () => void;
  onDelete?: () => void;
  canEdit?: boolean;
  children: React.ReactNode;
};

export function DetailSection({
  title,
  onEdit,
  onDelete,
  canEdit = true,
  children,
}: DetailSectionProps) {
  return (
    <Card className="overflow-hidden border shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b bg-muted/20 pb-4">
        <CardTitle className="text-lg">{title}</CardTitle>
        <div className="flex items-center gap-2">
          {canEdit && onEdit && (
            <Button type="button" variant="outline" size="sm" onClick={onEdit}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Button>
          )}
          {canEdit && onDelete && (
            <Button type="button" variant="outline" size="sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={onDelete}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-4">{children}</CardContent>
    </Card>
  );
}

export function DetailField({
  label,
  value,
  fullWidth,
}: {
  label: string;
  value: React.ReactNode;
  fullWidth?: boolean;
}) {
  return (
    <div className={fullWidth ? "space-y-1.5 sm:col-span-2" : "space-y-1.5"}>
      <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
        {label}
      </p>
      <p className="text-sm text-foreground">{value ?? "—"}</p>
    </div>
  );
}
