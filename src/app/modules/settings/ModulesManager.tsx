import React, { useMemo, useState } from "react";
import {
  LayoutDashboard,
  DollarSign,
  Receipt,
  Calendar,
  Users,
  Scissors,
  UserCog,
  Package,
  FileText,
  MessageSquare,
  Settings,
  Wallet,
  Banknote,
  Truck,
  Download,
  Box,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";

type ModuleDefinition = {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  alwaysVisible?: boolean;
};

export const HIDDEN_MODULES_KEY = "salonpos_hidden_modules";

const MODULES: ModuleDefinition[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    alwaysVisible: true,
  },
  {
    key: "pos",
    label: "POS",
    icon: DollarSign,
  },
  {
    key: "finance",
    label: "Finance",
    icon: FileText,
  },
  {
    key: "sales",
    label: "Sales",
    icon: Receipt,
  },
  {
    key: "appointments",
    label: "Appointments",
    icon: Calendar,
  },
  {
    key: "services",
    label: "Services",
    icon: Scissors,
  },
  {
    key: "products",
    label: "Products",
    icon: Box,
  },
  {
    key: "purchases",
    label: "Purchases",
    icon: Download,
  },
  {
    key: "stock",
    label: "Stock",
    icon: Package,
  },
  {
    key: "suppliers",
    label: "Suppliers",
    icon: Truck,
  },
  {
    key: "expense",
    label: "Expense",
    icon: Wallet,
  },
  {
    key: "accounts",
    label: "Bank Accounts",
    icon: Banknote,
  },
  {
    key: "customers",
    label: "Customers",
    icon: Users,
  },
  {
    key: "staff",
    label: "Staff",
    icon: UserCog,
  },
  {
    key: "payroll",
    label: "Payroll",
    icon: Banknote,
  },
  {
    key: "reports",
    label: "Reports",
    icon: FileText,
  },
  {
    key: "whatsapp",
    label: "WhatsApp",
    icon: MessageSquare,
  },
  {
    key: "settings",
    label: "Settings",
    icon: Settings,
  },
];

export function getHiddenModules(): Set<string> {
  try {
    const raw = localStorage.getItem(HIDDEN_MODULES_KEY);
    if (!raw) return new Set();

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();

    return new Set(parsed);
  } catch {
    return new Set();
  }
}

function saveHiddenModules(hiddenModules: Set<string>) {
  localStorage.setItem(HIDDEN_MODULES_KEY, JSON.stringify([...hiddenModules]));

  window.dispatchEvent(new Event("modulesVisibilityChanged"));
  window.dispatchEvent(new Event("salonpos-module-visibility-changed"));
}

export function ModulesManager() {
  const [hiddenModules, setHiddenModules] = useState<Set<string>>(() =>
    getHiddenModules()
  );

  const visibleCount = useMemo(() => {
    return MODULES.filter((module) => !hiddenModules.has(module.key)).length;
  }, [hiddenModules]);

  const hiddenCount = MODULES.length - visibleCount;

  const toggleModule = (moduleKey: string, alwaysVisible?: boolean) => {
    if (alwaysVisible) return;

    setHiddenModules((previous) => {
      const next = new Set(previous);

      if (next.has(moduleKey)) {
        next.delete(moduleKey);
      } else {
        next.add(moduleKey);
      }

      saveHiddenModules(next);
      return next;
    });
  };

  return (
  <div className="p-4 md:p-6 space-y-5">
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold text-primary">Modules</h1>
        <p className="text-sm text-muted-foreground">
          Show or hide modules from the sidebar.
        </p>
      </div>

      <div className="flex items-center gap-2 text-sm">
        <span className="px-3 py-1 rounded-full bg-green-50 text-green-700 font-medium">
          {visibleCount} Visible
        </span>
        <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-600 font-medium">
          {hiddenCount} Hidden
        </span>
      </div>
    </div>

    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
      {MODULES.map((module) => {
        const Icon = module.icon;
        const isHidden = hiddenModules.has(module.key);
        const isVisible = !isHidden;

        return (
          <div
            key={module.key}
            className={`rounded-xl border p-3 transition-all ${
              isVisible
                ? "bg-white border-primary/20 shadow-sm"
                : "bg-gray-50 border-gray-200 opacity-70"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  isVisible
                    ? "bg-primary/10 text-primary"
                    : "bg-gray-100 text-gray-400"
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>

              <button
                type="button"
                disabled={module.alwaysVisible}
                onClick={() => toggleModule(module.key, module.alwaysVisible)}
                className={`-mt-2 -mr-1 transition-opacity ${
                  module.alwaysVisible
                    ? "opacity-40 cursor-not-allowed"
                    : "cursor-pointer"
                }`}
                title={
                  module.alwaysVisible
                    ? "Dashboard cannot be hidden"
                    : isVisible
                    ? "Hide module"
                    : "Show module"
                }
              >
                {isVisible ? (
                  <ToggleRight className="w-9 h-9 text-primary" />
                ) : (
                  <ToggleLeft className="w-9 h-9 text-gray-300" />
                )}
              </button>
            </div>

            <div className="mt-3">
              <p
                className={`text-sm font-semibold truncate ${
                  isVisible ? "text-gray-900" : "text-gray-400"
                }`}
              >
                {module.label}
              </p>

              {module.alwaysVisible ? (
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Always visible
                </p>
              ) : (
                <p
                  className={`text-[11px] mt-0.5 ${
                    isVisible ? "text-green-600" : "text-gray-400"
                  }`}
                >
                  {isVisible ? "Visible" : "Hidden"}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  </div>
);
}

export default ModulesManager;