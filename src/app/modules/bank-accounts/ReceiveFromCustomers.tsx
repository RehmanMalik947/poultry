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

interface Customer {
  id: number;
  name: string;
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

export function ReceiveFromCustomers() {
  const customerDropdownRef = useRef<HTMLDivElement>(null);

  const [date, setDate] = useState<Date>(new Date());
  const [referenceNumber, setReferenceNumber] = useState("");

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  const [cashPayment, setCashPayment] = useState("");
  const [bankPayment, setBankPayment] = useState("");
  const [bankId, setBankId] = useState("");

  const [banks, setBanks] = useState<BankAccount[]>([]);
  const [note, setNote] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const cashAmount = Number(cashPayment) || 0;
  const bankAmount = Number(bankPayment) || 0;
  const totalReceived = cashAmount + bankAmount;

  const selectedCustomer = customers.find((customer) => String(customer.id) === customerId);
  const receivableBalance = selectedCustomer ? Number(selectedCustomer.balanceDue || 0) : 0;

  const filteredCustomers = useMemo(() => {
    const term = customerSearch.trim().toLowerCase();

    if (!term) return customers.slice(0, 20);

    return customers
      .filter((customer) => {
        const name = customer.name?.toLowerCase() || "";
        const mobile = customer.mobile?.toLowerCase() || "";
        const phone = customer.phone?.toLowerCase() || "";

        return name.includes(term) || mobile.includes(term) || phone.includes(term);
      })
      .slice(0, 20);
  }, [customers, customerSearch]);

  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);

      try {
        const [customersRes, banksRes] = await Promise.all([
          ApiService.customers.getAll(),
          ApiService.banks?.getAll ? ApiService.banks.getAll() : ApiService.accounts?.getAll?.(),
        ]);

        const customersData = Array.isArray(customersRes)
          ? customersRes
          : customersRes?.data || [];

        const banksData = Array.isArray(banksRes)
          ? banksRes
          : banksRes?.data || [];

        setCustomers(customersData);
        setBanks(banksData);
      } catch (error) {
        console.error("Failed to load receive payment screen data", error);
        toast.error("Failed to load customers or banks");
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        customerDropdownRef.current &&
        !customerDropdownRef.current.contains(event.target as Node)
      ) {
        setShowCustomerDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectCustomer = (customer: Customer) => {
    setCustomerId(String(customer.id));
    setCustomerSearch(customer.name);
    setShowCustomerDropdown(false);
  };

  const handleClearCustomer = () => {
    setCustomerId("");
    setCustomerSearch("");
    setShowCustomerDropdown(false);
  };

  const handleClearForm = () => {
    setDate(new Date());
    setReferenceNumber("");
    setCustomerId("");
    setCustomerSearch("");
    setCashPayment("");
    setBankPayment("");
    setBankId("");
    setNote("");
    setShowCustomerDropdown(false);
  };

  const handleSaveReceipt = async () => {
    if (!date) {
      toast.error("Date is required");
      return;
    }

    if (!customerId) {
      toast.error("Customer is required");
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
      date,
      customerId: Number(customerId),
      referenceNumber: referenceNumber || null,
      cashPayment: cashAmount,
      bankPayment: bankAmount,
      totalReceived,
      bankId: bankId ? Number(bankId) : null,
      note: note || null,
    };

    setIsSaving(true);

    let saved = false;

    try {
      console.log("Receive from customer payload:", payload);

      await ApiService.customers.addPayment(Number(customerId), payload);
      saved = true;
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to save receipt");
    } finally {
      setIsSaving(false);
    }

    if (saved) {
      toast.success("Payment recorded successfully!");

      // Clear form fields
      setCustomerId("");
      setCustomerSearch("");
      setReferenceNumber("");
      setCashPayment("");
      setBankPayment("");
      setBankId("");
      setNote("");
      setDate(new Date());

      // Re-fetch customers to update balances
      try {
        const customersRes = await ApiService.customers.getAll({ limit: 1000 });
        setCustomers(customersRes.data || []);
      } catch (_) {
        // silently ignore — balance will refresh on next load
      }
    }
  };

  return (
    <div className="space-y-3 w-full mx-auto pb-10 mt-1 px-3">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-primary">
          Receive From Customers
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

      {/* Section 1: Receipt Details */}
      <Card className="shadow-sm">
        <CardContent className="p-5 space-y-4">
          <h2 className="text-base font-semibold text-primary">
            Receipt Details
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

            <div className="space-y-1" ref={customerDropdownRef}>
              <Label>Customer *</Label>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />

                <Input
                  value={customerSearch}
                  placeholder="Search customer"
                  className="pl-9 pr-9"
                  onChange={(event) => {
                    setCustomerSearch(event.target.value);
                    setShowCustomerDropdown(true);
                    if (customerId) setCustomerId("");
                  }}
                  onFocus={() => setShowCustomerDropdown(true)}
                />

                {customerSearch ? (
                  <button
                    type="button"
                    onClick={handleClearCustomer}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500"
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : null}

                {showCustomerDropdown ? (
                  <div className="absolute z-20 mt-1 w-full rounded-md border bg-white shadow-lg max-h-64 overflow-y-auto">
                    {filteredCustomers.length > 0 ? (
                      filteredCustomers.map((customer) => (
                        <button
                          key={customer.id}
                          type="button"
                          className="w-full px-3 py-2 text-left hover:bg-gray-50 border-b last:border-b-0"
                          onClick={() => handleSelectCustomer(customer)}
                        >
                          <div className="font-medium text-sm text-gray-800">
                            {customer.name}
                          </div>
                          {customer.mobile || customer.phone ? (
                            <div className="text-xs text-muted-foreground">
                              {customer.mobile || customer.phone}
                            </div>
                          ) : null}
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-3 text-sm text-muted-foreground">
                        No customers found
                      </div>
                    )}
                  </div>
                ) : null}
              </div>

              {selectedCustomer ? (
                <div className="flex flex-col gap-1 mt-2">
                  <p className="text-xs text-muted-foreground">
                    Selected: {selectedCustomer.name}
                  </p>
                  <p className="text-sm font-semibold text-red-500">
                    Total Receivable: {receivableBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
              <Label>Total Received</Label>
              <div className="h-10 px-3 rounded-md border bg-gray-50 flex items-center font-bold text-primary">
                {totalReceived.toLocaleString(undefined, {
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
          onClick={handleSaveReceipt}
          disabled={isSaving}
          className="bg-primary hover:bg-primary px-6"
        >
          {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
          {isSaving ? "Saving..." : "Save Receipt"}
        </Button>
      </div>
    </div>
  );
}