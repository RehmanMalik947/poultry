import React, { useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, Loader2, Search, X } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Button } from "../../components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../components/ui/popover";
import { Calendar } from "../../components/ui/calendar";
import { ApiService } from "../../../api/ApiService";

interface Supplier {
  id: number;
  name?: string;
  supplierName?: string;
  businessName?: string;
  mobile?: string;
  phone?: string;
  balanceDue?: number;
}

interface BankAccount {
  id: number;
  bankName?: string;
  name?: string;
  accountNumber?: string;
  balance?: number | string;
}

export function PayToSupplier() {
  const supplierDropdownRef = useRef<HTMLDivElement>(null);

  const [date, setDate] = useState<Date>(new Date());
  const [referenceNumber, setReferenceNumber] = useState("");

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierId, setSupplierId] = useState("");
  const [supplierSearch, setSupplierSearch] = useState("");
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);

  const [cashPayment, setCashPayment] = useState("");
  const [bankPayment, setBankPayment] = useState("");
  const [bankId, setBankId] = useState("");

  const [banks, setBanks] = useState<BankAccount[]>([]);
  const [note, setNote] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const cashAmount = Number(cashPayment) || 0;
  const bankAmount = Number(bankPayment) || 0;
  const totalPaid = cashAmount + bankAmount;

  const getSupplierName = (supplier: Supplier) => {
    return supplier.name || supplier.supplierName || supplier.businessName || "Unnamed Supplier";
  };

  const selectedSupplier = suppliers.find((supplier) => String(supplier.id) === supplierId);
  const payableBalance = selectedSupplier ? Number(selectedSupplier.balanceDue || 0) : 0;

  const filteredSuppliers = useMemo(() => {
    const term = supplierSearch.trim().toLowerCase();

    if (!term) return suppliers.slice(0, 20);

    return suppliers
      .filter((supplier) => {
        const name = getSupplierName(supplier).toLowerCase();
        const mobile = supplier.mobile?.toLowerCase() || "";
        const phone = supplier.phone?.toLowerCase() || "";

        return name.includes(term) || mobile.includes(term) || phone.includes(term);
      })
      .slice(0, 20);
  }, [suppliers, supplierSearch]);

  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);

      try {
        const [suppliersRes, banksRes] = await Promise.all([
          ApiService.suppliers.getAll({ limit: 1000 }),
          ApiService.banks?.getAll ? ApiService.banks.getAll() : ApiService.accounts?.getAll?.(),
        ]);

        const suppliersData = Array.isArray(suppliersRes)
          ? suppliersRes
          : suppliersRes?.data || [];

        const banksData = Array.isArray(banksRes)
          ? banksRes
          : banksRes?.data || [];

        setSuppliers(suppliersData);
        setBanks(banksData);
      } catch (error) {
        console.error("Failed to load supplier payment screen data", error);
        toast.error("Failed to load suppliers or banks");
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        supplierDropdownRef.current &&
        !supplierDropdownRef.current.contains(event.target as Node)
      ) {
        setShowSupplierDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectSupplier = (supplier: Supplier) => {
    setSupplierId(String(supplier.id));
    setSupplierSearch(getSupplierName(supplier));
    setShowSupplierDropdown(false);
  };

  const handleClearSupplier = () => {
    setSupplierId("");
    setSupplierSearch("");
    setShowSupplierDropdown(false);
  };

  const handleClearForm = () => {
    setDate(new Date());
    setReferenceNumber("");
    setSupplierId("");
    setSupplierSearch("");
    setCashPayment("");
    setBankPayment("");
    setBankId("");
    setNote("");
    setShowSupplierDropdown(false);
  };

  const handleSavePayment = async () => {
    if (!date) {
      toast.error("Date is required");
      return;
    }

    if (!supplierId) {
      toast.error("Supplier is required");
      return;
    }

    if (cashAmount <= 0 && bankAmount <= 0) {
      toast.error("Please enter cash payment or bank payment");
      return;
    }

    if (bankAmount > 0 && !bankId) {
      toast.error("Bank name is required when bank payment is entered");
      return;
    }

    const payload = {
      date: format(date, "yyyy-MM-dd"),
      referenceNo: referenceNumber || null,
      cashPayment: cashAmount,
      bankPayment: bankAmount,
      totalPaid,
      bankId: bankId ? Number(bankId) : null,
      note: note || null,
    };

    setIsSaving(true);
    let saved = false;

    try {
      console.log("Pay to supplier payload:", payload);

      await ApiService.suppliers.addPayment(Number(supplierId), payload);
      saved = true;
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to save supplier payment");
    } finally {
      setIsSaving(false);
    }

    if (saved) {
      toast.success("Payment recorded successfully!");

      // Clear form
      setDate(new Date());
      setReferenceNumber("");
      setSupplierId("");
      setSupplierSearch("");
      setCashPayment("");
      setBankPayment("");
      setBankId("");
      setNote("");

      // Re-fetch suppliers to update balances
      try {
        const suppliersRes = await ApiService.suppliers.getAll({ limit: 1000 });
        setSuppliers(Array.isArray(suppliersRes) ? suppliersRes : suppliersRes?.data || []);
      } catch (_) {
        // silently ignore
      }
    }
  };

  return (
    <div className="space-y-3 w-full mx-auto pb-10 mt-1 px-3">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-primary">
          Pay To Supplier
        </h1>
      </div>

      {isLoading ? (
        <Card className="shadow-sm">
          <CardContent className="p-8 flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading data...
          </CardContent>
        </Card>
      ) : null}

      {/* Section 1: Payment Details */}
      <Card className="shadow-sm">
        <CardContent className="p-5 space-y-4">
          <h2 className="text-base font-semibold text-primary">
            Payment Details
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label>Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 text-gray-500" />
                    {format(date, "PPP")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(selectedDate) => selectedDate && setDate(selectedDate)}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-1" ref={supplierDropdownRef}>
              <Label>Supplier *</Label>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />

                <Input
                  value={supplierSearch}
                  placeholder="Search supplier"
                  className="pl-9 pr-9"
                  onChange={(event) => {
                    setSupplierSearch(event.target.value);
                    setShowSupplierDropdown(true);
                    if (supplierId) setSupplierId("");
                  }}
                  onFocus={() => setShowSupplierDropdown(true)}
                />

                {supplierSearch ? (
                  <button
                    type="button"
                    onClick={handleClearSupplier}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500"
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : null}

                {showSupplierDropdown ? (
                  <div className="absolute z-20 mt-1 w-full rounded-md border bg-white shadow-lg max-h-64 overflow-y-auto">
                    {filteredSuppliers.length > 0 ? (
                      filteredSuppliers.map((supplier) => (
                        <button
                          key={supplier.id}
                          type="button"
                          className="w-full px-3 py-2 text-left hover:bg-gray-50 border-b last:border-b-0"
                          onClick={() => handleSelectSupplier(supplier)}
                        >
                          <div className="font-medium text-sm text-gray-800">
                            {getSupplierName(supplier)}
                          </div>
                          {supplier.mobile || supplier.phone ? (
                            <div className="text-xs text-muted-foreground">
                              {supplier.mobile || supplier.phone}
                            </div>
                          ) : null}
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-3 text-sm text-muted-foreground">
                        No suppliers found
                      </div>
                    )}
                  </div>
                ) : null}
              </div>

              {selectedSupplier ? (
                <div className="flex flex-col gap-1 mt-2">
                  <p className="text-xs text-muted-foreground">
                    Selected: {getSupplierName(selectedSupplier)}
                  </p>
                  <p className="text-sm font-semibold text-red-500">
                    Total Payable: {payableBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              ) : null}
            </div>

            <div className="space-y-1">
              <Label>Receipt No</Label>
              <Input
                placeholder="Receipt No (Auto if left empty)"
                value={referenceNumber}
                onChange={(event) => setReferenceNumber(event.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Payment */}
      <Card className="shadow-sm">
        <CardContent className="p-5 space-y-4">
          <h2 className="text-base font-semibold text-primary">
            Payment
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <Label>Cash Payment</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={cashPayment}
                onChange={(event) => setCashPayment(event.target.value)}
              />
            </div>

            <div className="space-y-1">
              <Label>Bank Payment</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={bankPayment}
                onChange={(event) => setBankPayment(event.target.value)}
              />
            </div>

            <div className="space-y-1">
              <Label>Total Paid</Label>
              <div className="h-10 px-3 rounded-md border bg-gray-50 flex items-center font-bold text-primary">
                {totalPaid.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
            </div>

            <div className="space-y-1">
              <Label>Bank Name</Label>
              <Select value={bankId} onValueChange={setBankId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Bank" />
                </SelectTrigger>
                <SelectContent>
                  {banks.map((bank) => (
                    <SelectItem key={bank.id} value={String(bank.id)}>
                      {(bank.bankName || bank.name || "Bank Account") +
                        (bank.accountNumber ? ` - ${bank.accountNumber}` : "")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {bankAmount > 0 && !bankId ? (
                <p className="text-xs text-red-500">
                  Select bank when bank payment is entered.
                </p>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 3: Particular */}
      <Card className="shadow-sm">
        <CardContent className="p-5 space-y-4">
          <h2 className="text-base font-semibold text-primary">
            Particular
          </h2>

          <div className="space-y-1">
            <Label>Note</Label>
            <textarea
              className="w-full min-h-[110px] rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              placeholder="Write note here..."
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Bottom Buttons */}
      <div className="flex justify-center gap-4 pt-2 pb-6">
        <Button
          type="button"
          variant="outline"
          onClick={handleClearForm}
          disabled={isSaving}
        >
          Clear Form
        </Button>

        <Button
          type="button"
          onClick={handleSavePayment}
          disabled={isSaving}
          className="bg-primary hover:bg-primary px-6"
        >
          {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
          {isSaving ? "Saving..." : "Save Payment"}
        </Button>
      </div>
    </div>
  );
}