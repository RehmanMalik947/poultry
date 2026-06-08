import React, { createContext, useContext } from "react";

export type Branch = {
  id: number;
  name: string;
  address: string | null;
  phone: string | null;
  organizationId: number;
  createdAt: string;
  updatedAt: string;
};

type BranchContextValue = {
  branches: Branch[];
  branchesLoading: boolean;
  selectedBranchId: number | null;
  setSelectedBranchId: (id: number | null) => void;
  selectedBranch: Branch | null;
};

const BranchContext = createContext<BranchContextValue | null>(null);

export function useBranch() {
  const ctx = useContext(BranchContext);
  if (!ctx) {
    throw new Error("useBranch must be used within a BranchContext provider (inside MainLayout).");
  }
  return ctx;
}

/**
 * Optional: use when BranchContext is not available (e.g. outside MainLayout).
 * Returns null if not inside provider.
 */
export function useBranchOptional(): BranchContextValue | null {
  return useContext(BranchContext);
}

export const BranchContextProvider = BranchContext.Provider;

/**
 * Example: send selectedBranchId in API requests
 *
 * Option 1 - Header (backend reads req.headers['x-branch-id']):
 *   const { selectedBranchId } = useBranch();
 *   const headers: HeadersInit = {
 *     ...getAuthHeaders(),
 *     ...(selectedBranchId != null ? { 'X-Branch-Id': String(selectedBranchId) } : {}),
 *   };
 *   await fetch('/api/clients', { headers });
 *
 * Option 2 - Query param:
 *   const url = selectedBranchId != null
 *     ? `/api/clients?branch_id=${selectedBranchId}`
 *     : '/api/clients';
 *   await fetch(url, { headers: getAuthHeaders() });
 *
 * Option 3 - Body (for POST/PUT):
 *   await fetch('/api/appointments', {
 *     method: 'POST',
 *     headers: getAuthHeaders(),
 *     body: JSON.stringify({ ...data, branch_id: selectedBranchId }),
 *   });
 */
export function getAuthHeadersWithBranch(branchId: number | null): HeadersInit {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(branchId != null ? { "X-Branch-Id": String(branchId) } : {}),
  };
  return headers;
}
