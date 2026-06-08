import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { appointmentSchema, type AppointmentFormValues } from "../../utils/validation";
import { useNavigate, useParams } from 'react-router';
import { Card, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Button } from '../../components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../../components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../../components/ui/command';
import { cn } from '../../components/ui/utils';
import { Calendar } from '../../components/ui/calendar';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Loader2, Save, X, Plus, Clock, UserCheck, CalendarDays, Info, ChevronsUpDown, Check } from 'lucide-react';
import { ApiService } from '../../../api/ApiService';
import { toast } from 'sonner';
import { useBranch } from '../../contexts/BranchContext';

type CustomerOption = { id: number; name: string; mobile: string | null; email?: string | null };
type ServiceOption = { id: number; serviceName: string; price: number | null; duration?: number | null; category?: { id: number; name: string } };
type PackageOption = { id: number; packageName: string; price: number | null; description?: string | null; services?: any[] };
type StaffOption = {
  id: number; firstName: string; lastName: string | null; email: string; name?: string; role?: string;
  Services?: Array<{ id: number; serviceName: string }>;
};

/** Parse "01:00 PM", "12:00 AM", or 24h "13:30" to minutes since midnight. Returns null if invalid. */
function parseTimeSlotToMinutes(slot: string): number | null {
  const trimmed = slot.trim();
  const amPm = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (amPm) {
    let hours = parseInt(amPm[1], 10);
    const minutes = parseInt(amPm[2], 10);
    const ap = (amPm[3] || '').toUpperCase();
    if (ap === 'PM' && hours !== 12) hours += 12;
    if (ap === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  }
  const twenty4 = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (twenty4) {
    const hours = parseInt(twenty4[1], 10);
    const minutes = parseInt(twenty4[2], 10);
    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      return hours * 60 + minutes;
    }
  }
  return null;
}

function timeSlotToMinutes(slot: string): number {
  return parseTimeSlotToMinutes(slot) ?? 0;
}

/** Convert minutes since midnight to "11:30 AM" format. */
function minutesToTimeSlot(totalMinutes: number): string {
  const hours24 = Math.floor(totalMinutes / 60) % 24;
  const mins = totalMinutes % 60;
  const hours12 = hours24 === 0 ? 12 : hours24 > 12 ? hours24 - 12 : hours24;
  const ampm = hours24 < 12 ? 'AM' : 'PM';
  return `${hours12}:${String(mins).padStart(2, '0')} ${ampm}`;
}

const TIME_RANGE_START_MIN = 0;
const TIME_RANGE_END_MIN = 23 * 60 + 59;

function isValidTimeSlotInRange(slot: string): boolean {
  const min = timeSlotToMinutes(slot);
  return min >= TIME_RANGE_START_MIN && min <= TIME_RANGE_END_MIN;
}

function timeSlotToTimeInputValue(slot: string): string {
  const m = timeSlotToMinutes(slot);
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

function timeInputValueToTimeSlot(value: string): string {
  const [hStr, mStr] = value.split(':');
  const hours24 = parseInt(hStr ?? '0', 10);
  const minutes = parseInt(mStr ?? '0', 10);
  const total = hours24 * 60 + minutes;
  return minutesToTimeSlot(total);
}

function getCurrentMinutes(): number {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

function getTodayLocalStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getStaffDisplayName(s: StaffOption | null): string {
  if (!s) return '—';
  if (s.name) return s.name;
  return [s.firstName, s.lastName].filter(Boolean).join(' ').trim() || s.email;
}

export default function AddAppointment() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  const { selectedBranchId } = useBranch();

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(false);

  // Data Lists
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [packages, setPackages] = useState<PackageOption[]>([]);
  const [staffList, setStaffList] = useState<StaffOption[]>([]);

  // Form State
  const [formCustomerId, setFormCustomerId] = useState<string>('');
  const [bookingType, setBookingType] = useState<'service' | 'package'>('service');
  const [formServiceId, setFormServiceId] = useState<string>('');
  const [formPackageId, setFormPackageId] = useState<string>('');
  const [formStaffId, setFormStaffId] = useState<string>('none');
  const [formDate, setFormDate] = useState<string>(getTodayLocalStr());
  const [formTimeSlot, setFormTimeSlot] = useState<string>('09:00 AM');
  const [useCustomTimeInput, setUseCustomTimeInput] = useState(true);
  const [customTimeInputValue, setCustomTimeInputValue] = useState('09:00');
  const [formNotes, setFormNotes] = useState('');

  const form = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentSchema),
    mode: "onChange",
    defaultValues: {
      customerId: undefined,
      date: getTodayLocalStr(),
      timeSlot: "09:00 AM",
      staffId: undefined,
      serviceId: undefined,
      packageId: undefined,
      notes: "",
    },
  });

  // Add Customer Quick Form State
  const [showAddCustomerForm, setShowAddCustomerForm] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerEmail, setNewCustomerEmail] = useState('');
  const [newCustomerMobile, setNewCustomerMobile] = useState('');
  const [addCustomerSaving, setAddCustomerSaving] = useState(false);

  // Available Slots State
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [noSlotsReason, setNoSlotsReason] = useState<string>('');

  // Combobox Popover Open States
  const [openCustomerCombobox, setOpenCustomerCombobox] = useState(false);
  const [openServiceCombobox, setOpenServiceCombobox] = useState(false);
  const [openPackageCombobox, setOpenPackageCombobox] = useState(false);
  const [openStaffCombobox, setOpenStaffCombobox] = useState(false);

  const timeSlotRef = useRef<string>('09:00 AM');
  const customerIdRef = useRef<string>('');
  const serviceIdRef = useRef<string>('');
  const packageIdRef = useRef<string>('');

  const loadOptions = useCallback(async () => {
    if (selectedBranchId == null) return;
    setLoadingOptions(true);
    try {
      const [customersData, servicesData, packagesData, staffData] = await Promise.all([
        ApiService.customers.getAll({ limit: 1000 }),
        ApiService.services.getAll({ limit: 1000 }),
        ApiService.packages.getAll({ status: 'active' }),
        ApiService.staff.getAll({ limit: 1000, includeServices: true }),
      ]);
      setCustomers(Array.isArray(customersData.data) ? customersData.data : []);
      setServices(Array.isArray(servicesData.data) ? servicesData.data : []);
      setPackages(Array.isArray(packagesData.data) ? packagesData.data : []);
      setStaffList(Array.isArray(staffData.data) ? staffData.data : []);
    } catch {
      toast.error('Failed to load customers, services, packages, or staff');
    } finally {
      setLoadingOptions(false);
    }
  }, [selectedBranchId]);

  useEffect(() => {
    loadOptions();
  }, [loadOptions]);

  // Fetch Appointment Details for Edit Mode
  useEffect(() => {
    if (isEdit && selectedBranchId != null) {
      const fetchAppt = async () => {
        setFetching(true);
        try {
          const res = await ApiService.appointments.getById(Number(id));
          if (res.success && res.data) {
            const appt = res.data;
            const cId = String(appt.customerId);
            setFormCustomerId(cId);
            customerIdRef.current = cId;
            
            if (appt.packageId) {
              setBookingType('package');
              const pId = String(appt.packageId);
              setFormPackageId(pId);
              packageIdRef.current = pId;
              setFormServiceId('');
              serviceIdRef.current = '';
            } else {
              setBookingType('service');
              const sId = String(appt.serviceId);
              setFormServiceId(sId);
              serviceIdRef.current = sId;
              setFormPackageId('');
              packageIdRef.current = '';
            }

            setFormStaffId(appt.staffId != null ? String(appt.staffId) : 'none');
            setFormDate(appt.date);
            const initialSlot = appt.timeSlot && isValidTimeSlotInRange(appt.timeSlot) ? appt.timeSlot : '09:00 AM';
            setFormTimeSlot(initialSlot);
            setUseCustomTimeInput(true);
            setCustomTimeInputValue(
              appt.timeSlot && isValidTimeSlotInRange(appt.timeSlot)
                ? timeSlotToTimeInputValue(appt.timeSlot)
                : '09:00'
            );
            setFormNotes(appt.notes || '');
            timeSlotRef.current = initialSlot;
          }
        } catch (err) {
          toast.error('Failed to fetch appointment details');
        } finally {
          setFetching(false);
        }
      };
      fetchAppt();
    }
  }, [isEdit, id, selectedBranchId]);

  // Filter staff based on selected service
  const filteredStaff = React.useMemo(() => {
    if (bookingType === 'package') return staffList;
    if (!formServiceId) return staffList;
    const sIdNum = parseInt(formServiceId, 10);
    return staffList.filter((staff) => {
      if (!staff.Services || staff.Services.length === 0) return true;
      return staff.Services.some((srv) => srv.id === sIdNum);
    });
  }, [staffList, formServiceId, bookingType]);

  // Filter services based on selected staff
  const filteredServices = React.useMemo(() => {
    if (!formStaffId || formStaffId === 'none') return services;
    const stfIdNum = parseInt(formStaffId, 10);
    const stf = staffList.find((s) => s.id === stfIdNum);
    if (!stf || !stf.Services || stf.Services.length === 0) return services;
    const stfServiceIds = new Set(stf.Services.map((srv) => srv.id));
    return services.filter((srv) => stfServiceIds.has(srv.id));
  }, [services, staffList, formStaffId]);

  // Fetch available slots whenever staff + service/package + date all selected
  useEffect(() => {
    const isService = bookingType === 'service';
    const targetId = isService ? formServiceId : formPackageId;
    if (!targetId || !formDate) {
      setAvailableSlots([]);
      setNoSlotsReason('');
      return;
    }
    let cancelled = false;
    setLoadingSlots(true);
    setAvailableSlots([]);
    setNoSlotsReason('');

    const params: any = {
      staffId: formStaffId && formStaffId !== 'none' ? parseInt(formStaffId, 10) : 0,
      date: formDate,
    };
    if (isService) {
      params.serviceId = parseInt(formServiceId, 10);
    } else {
      params.packageId = parseInt(formPackageId, 10);
    }

    ApiService.appointments.getAvailableSlots(params).then((data: any) => {
      if (cancelled) return;
      const slots: string[] = data?.data?.slots ?? [];
      setAvailableSlots(slots);
      if (data?.data?.message) setNoSlotsReason(data.data.message);
      if (slots.length > 0 && !slots.includes(formTimeSlot)) {
        setFormTimeSlot(slots[0]);
        timeSlotRef.current = slots[0];
        setCustomTimeInputValue(timeSlotToTimeInputValue(slots[0]));
      }
    }).catch(() => {
      if (!cancelled) setNoSlotsReason('Could not load available slots.');
    }).finally(() => {
      if (!cancelled) setLoadingSlots(false);
    });
    return () => { cancelled = true; };
  }, [formStaffId, formServiceId, formPackageId, formDate, bookingType]);

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedBranchId == null) {
      toast.error('Select a branch first');
      return;
    }
    const name = newCustomerName.trim();
    if (!name) {
      toast.error('Customer name is required');
      return;
    }
    setAddCustomerSaving(true);
    try {
      const data = await ApiService.customers.create({
        name,
        email: newCustomerEmail.trim() || undefined,
        mobile: newCustomerMobile.trim() || undefined,
        branchId: selectedBranchId,
      });

      const created = data?.data || data;
      const newId = created?.id != null ? Number(created.id) : null;
      if (newId != null) {
        await loadOptions();
        setFormCustomerId(String(newId));
        customerIdRef.current = String(newId);
        setShowAddCustomerForm(false);
        setNewCustomerName('');
        setNewCustomerEmail('');
        setNewCustomerMobile('');
        toast.success('Customer added. You can now complete the booking below.');
      } else {
        toast.error('Customer was not saved. Please try again.');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Failed to add customer');
    } finally {
      setAddCustomerSaving(false);
    }
  };

  const getEffectiveTimeSlot = (): string => {
    const fromRef = timeSlotRef.current?.trim() ?? '';
    const fromCustom =
      useCustomTimeInput && customTimeInputValue?.trim()
        ? timeInputValueToTimeSlot(customTimeInputValue.trim())
        : '';
    const fromSlot = formTimeSlot?.trim() ?? '';
    const candidate = fromRef || fromCustom || fromSlot;
    if (!candidate) return '';
    if (!isValidTimeSlotInRange(candidate)) return '';
    const dateStr = formDate?.trim() ?? '';
    if (dateStr && dateStr === getTodayLocalStr() && timeSlotToMinutes(candidate) < getCurrentMinutes()) return '';
    return candidate;
  };

  const handleSave = async (values: AppointmentFormValues) => {
    if (selectedBranchId == null) {
      toast.error('Select a branch first');
      return;
    }
    const effectiveTime = getEffectiveTimeSlot();
    const dateStr = formDate?.trim() ?? '';
    const customerIdVal = ((customerIdRef.current?.trim() || formCustomerId?.trim()) ?? '').trim();
    const serviceIdVal = bookingType === 'service' ? ((serviceIdRef.current?.trim() || formServiceId?.trim()) ?? '').trim() : '';
    const packageIdVal = bookingType === 'package' ? ((packageIdRef.current?.trim() || formPackageId?.trim()) ?? '').trim() : '';

    if (!customerIdVal || (!serviceIdVal && !packageIdVal) || !dateStr || !effectiveTime) {
      toast.error('Please fill customer, service/package, date, and time');
      return;
    }
    if (!isValidTimeSlotInRange(effectiveTime)) {
      toast.error('Time must be between 12:00 AM and 11:59 PM');
      return;
    }
    const isToday = dateStr === getTodayLocalStr();
    if (isToday && timeSlotToMinutes(effectiveTime) < getCurrentMinutes()) {
      toast.error('For today, please pick a time from now onward');
      return;
    }

    setLoading(true);
    const payload: any = {
      customerId: parseInt(customerIdVal, 10),
      staffId: formStaffId && formStaffId !== 'none' ? parseInt(formStaffId, 10) : null,
      date: dateStr,
      timeSlot: effectiveTime,
      notes: formNotes.trim() || undefined,
    };

    if (bookingType === 'service') {
      payload.serviceId = parseInt(serviceIdVal, 10);
      payload.packageId = null;
    } else {
      payload.packageId = parseInt(packageIdVal, 10);
      payload.serviceId = null;
    }

    try {
      if (isEdit) {
         await ApiService.appointments.update(Number(id), payload);
        toast.success('Appointment updated successfully');
      } else {
        await ApiService.appointments.create(payload);
        toast.success('Appointment booked successfully');
      }
      navigate('/appointments');
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Failed to save appointment');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-3 max-w-7xl mx-auto pb-10 mt-3 px-3">
      {/* Header Area */}
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <CalendarDays className="h-7 w-7 text-primary" />
          {isEdit ? 'Edit Appointment' : 'Book New Appointment'}
        </h1>
        <Button variant="outline" onClick={() => navigate('/appointments')} className="hover:bg-gray-100 border-gray-300">
          <X className="h-4 w-4 mr-2" /> Cancel
        </Button>
      </div>

      <Form {...form}>
        <form id="appointment-form" onSubmit={(e) => {
          e.preventDefault();
          const customerIdNum = parseInt((customerIdRef.current?.trim() || formCustomerId?.trim() || ''), 10);
          const serviceIdNum = bookingType === 'service' ? parseInt((serviceIdRef.current?.trim() || formServiceId?.trim() || ''), 10) : undefined;
          const packageIdNum = bookingType === 'package' ? parseInt((packageIdRef.current?.trim() || formPackageId?.trim() || ''), 10) : undefined;
          const staffIdNum = formStaffId && formStaffId !== 'none' ? parseInt(formStaffId, 10) : undefined;
          form.setValue("customerId", customerIdNum);
          form.setValue("serviceId", serviceIdNum || undefined);
          form.setValue("packageId", packageIdNum || undefined);
          form.setValue("staffId", staffIdNum || undefined);
          form.setValue("date", formDate);
          form.setValue("timeSlot", formTimeSlot);
          form.setValue("notes", formNotes);
          form.handleSubmit(handleSave)(e);
        }} className="space-y-4">
        {/* Main Form Card */}
        <Card className="shadow-sm border-gray-200">
          <div className="bg-primary px-3 py-2 rounded-t-md">
            <h2 className="text-white font-semibold text-sm flex items-center gap-2">
              <Info className="h-4 w-4" /> Appointment Information
            </h2>
          </div>
          <CardContent className="p-3 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              {/* Customer Selection / Add Customer */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Customer *</Label>
                <Popover open={openCustomerCombobox} onOpenChange={setOpenCustomerCombobox}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={openCustomerCombobox}
                      className="w-full justify-between h-10 border-gray-300 focus:ring-primary/20 font-normal"
                    >
                      {formCustomerId
                        ? customers.find((c) => String(c.id) === formCustomerId)?.name || 'Selected Customer'
                        : 'Search and select customer...'}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search customer by name, phone or email..." />
                      <CommandList>
                        <CommandEmpty>No customer found.</CommandEmpty>
                        <CommandGroup>
                          <CommandItem
                            value="__add_customer__"
                            onSelect={() => {
                              setShowAddCustomerForm(true);
                              setOpenCustomerCombobox(false);
                            }}
                            className="gap-2 font-medium text-primary focus:bg-primary/10 cursor-pointer"
                          >
                            <Plus className="w-4 h-4 shrink-0" />
                            Add New Customer
                          </CommandItem>
                          {customers
                            .filter((c) => c.name.trim().toLowerCase() !== 'walk-in')
                            .map((c) => (
                              <CommandItem
                                key={c.id}
                                value={`${c.name} ${c.mobile || ''} ${c.email || ''}`}
                                onSelect={() => {
                                  setFormCustomerId(String(c.id));
                                  customerIdRef.current = String(c.id);
                                  setOpenCustomerCombobox(false);
                                }}
                                className="cursor-pointer"
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    formCustomerId === String(c.id) ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {c.name} {c.mobile ? `(${c.mobile})` : ''}
                              </CommandItem>
                            ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>

                <FormField
                  control={form.control}
                  name="customerId"
                  render={({ field }) => (
                    <input type="hidden" {...field} value={formCustomerId} />
                  )}
                />

                {showAddCustomerForm && (
                  <div className="w-full rounded-lg border border-border bg-muted/30 p-4 mt-3 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    <p className="text-sm font-semibold text-foreground">Add New Customer</p>
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Name *</Label>
                        <Input placeholder="Customer name" value={newCustomerName} onChange={(e) => setNewCustomerName(e.target.value)} required className="h-9 w-full border-gray-300" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Email</Label>
                        <Input type="email" placeholder="email@example.com" value={newCustomerEmail} onChange={(e) => setNewCustomerEmail(e.target.value)} className="h-9 w-full border-gray-300" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Mobile</Label>
                        <Input placeholder="+1 234 567 8900" value={newCustomerMobile} onChange={(e) => setNewCustomerMobile(e.target.value)} className="h-9 w-full border-gray-300" />
                      </div>
                      <div className="flex w-full gap-2 pt-2">
                        <Button type="button" size="sm" onClick={handleAddCustomer} className="flex-1 min-w-0 bg-primary hover:bg-primary/90 text-white font-medium" disabled={addCustomerSaving || !newCustomerName.trim()}>
                          {addCustomerSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                          Add Customer
                        </Button>
                        <Button type="button" variant="ghost" size="sm" className="shrink-0 hover:bg-gray-100" onClick={() => { setShowAddCustomerForm(false); setNewCustomerName(''); setNewCustomerEmail(''); setNewCustomerMobile(''); }}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Booking Selection */}
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-gray-700">Booking Type *</Label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setBookingType('service');
                        setFormServiceId('');
                        serviceIdRef.current = '';
                        setFormTimeSlot('');
                        timeSlotRef.current = '';
                        setAvailableSlots([]);
                      }}
                      className={cn(
                        "flex-1 py-2 rounded-lg text-xs font-bold border transition-all duration-200 uppercase tracking-wider",
                        bookingType === 'service'
                          ? "bg-primary text-white border-primary shadow-sm"
                          : "bg-background text-gray-700 border-gray-300 hover:bg-gray-50"
                      )}
                    >
                      Service
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setBookingType('package');
                        setFormPackageId('');
                        packageIdRef.current = '';
                        setFormTimeSlot('');
                        timeSlotRef.current = '';
                        setAvailableSlots([]);
                      }}
                      className={cn(
                        "flex-1 py-2 rounded-lg text-xs font-bold border transition-all duration-200 uppercase tracking-wider",
                        bookingType === 'package'
                          ? "bg-primary text-white border-primary shadow-sm"
                          : "bg-background text-gray-700 border-gray-300 hover:bg-gray-50"
                      )}
                    >
                      Package
                    </button>
                  </div>
                </div>

                {bookingType === 'service' ? (
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-gray-700">Service *</Label>
                    <Popover open={openServiceCombobox} onOpenChange={setOpenServiceCombobox}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={openServiceCombobox}
                          className="w-full justify-between h-10 border-gray-300 focus:ring-primary/20 font-normal"
                        >
                          {formServiceId
                            ? services.find((s) => String(s.id) === formServiceId)?.serviceName || 'Selected Service'
                            : 'Search and select service...'}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Search service by name..." />
                          <CommandList>
                            <CommandEmpty>No service found.</CommandEmpty>
                            <CommandGroup>
                              {filteredServices.map((s) => (
                                <CommandItem
                                  key={s.id}
                                  value={s.serviceName}
                                  onSelect={() => {
                                    setFormServiceId(String(s.id));
                                    serviceIdRef.current = String(s.id);
                                    setFormTimeSlot('');
                                    timeSlotRef.current = '';
                                    setAvailableSlots([]);
                                    setOpenServiceCombobox(false);
                                  }}
                                  className="cursor-pointer"
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      formServiceId === String(s.id) ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  {s.serviceName}{s.duration ? ` (${s.duration} min)` : ''}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <FormField
                      control={form.control}
                      name="serviceId"
                      render={({ field }) => (
                        <input type="hidden" {...field} value={formServiceId} />
                      )}
                    />
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-gray-700">Package *</Label>
                    <Popover open={openPackageCombobox} onOpenChange={setOpenPackageCombobox}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={openPackageCombobox}
                          className="w-full justify-between h-10 border-gray-300 focus:ring-primary/20 font-normal"
                        >
                          {formPackageId
                            ? packages.find((p) => String(p.id) === formPackageId)?.packageName || 'Selected Package'
                            : 'Search and select package...'}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Search package by name..." />
                          <CommandList>
                            <CommandEmpty>No package found.</CommandEmpty>
                            <CommandGroup>
                              {packages.map((p) => (
                                <CommandItem
                                  key={p.id}
                                  value={p.packageName}
                                  onSelect={() => {
                                    setFormPackageId(String(p.id));
                                    packageIdRef.current = String(p.id);
                                    setFormTimeSlot('');
                                    timeSlotRef.current = '';
                                    setAvailableSlots([]);
                                    setOpenPackageCombobox(false);
                                  }}
                                  className="cursor-pointer"
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      formPackageId === String(p.id) ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  {p.packageName}{p.price ? ` ($${Number(p.price).toFixed(2)})` : ''}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <FormField
                      control={form.control}
                      name="packageId"
                      render={({ field }) => (
                        <input type="hidden" {...field} value={formPackageId} />
                      )}
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              {/* Staff Selection */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Staff <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <Popover open={openStaffCombobox} onOpenChange={setOpenStaffCombobox}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={openStaffCombobox}
                      className="w-full justify-between h-10 border-gray-300 focus:ring-primary/20 font-normal"
                    >
                      {formStaffId && formStaffId !== 'none'
                        ? getStaffDisplayName(staffList.find((s) => String(s.id) === formStaffId) || null)
                        : '— No staff assigned (Search staff...)'}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search staff by name or email..." />
                      <CommandList>
                        <CommandEmpty>No staff found.</CommandEmpty>
                        <CommandGroup>
                          <CommandItem
                            value="none"
                            onSelect={() => {
                              setFormStaffId('none');
                              setFormTimeSlot('');
                              timeSlotRef.current = '';
                              setAvailableSlots([]);
                              setOpenStaffCombobox(false);
                            }}
                            className="cursor-pointer font-medium text-muted-foreground"
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                formStaffId === 'none' ? "opacity-100" : "opacity-0"
                              )}
                            />
                            — No staff assigned
                          </CommandItem>
                          {filteredStaff.map((s) => (
                            <CommandItem
                              key={s.id}
                              value={`${s.firstName} ${s.lastName || ''} ${s.email || ''} ${s.name || ''}`}
                              onSelect={() => {
                                setFormStaffId(String(s.id));
                                setFormTimeSlot('');
                                timeSlotRef.current = '';
                                setAvailableSlots([]);
                                setOpenStaffCombobox(false);
                              }}
                              className="cursor-pointer"
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  formStaffId === String(s.id) ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {getStaffDisplayName(s)}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <FormField
                  control={form.control}
                  name="staffId"
                  render={({ field }) => (
                    <input type="hidden" {...field} value={formStaffId === 'none' ? '' : formStaffId} />
                  )}
                />
              </div>

              {/* Date Selection */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Date *</Label>
                <Input
                  type="date"
                  value={formDate}
                  min={getTodayLocalStr()}
                  onChange={(e) => setFormDate(e.target.value)}
                  required
                  className="h-10 border-gray-300 focus:ring-primary/20 w-full"
                />
                <p className="text-xs text-muted-foreground">Today or any future date.</p>
              </div>
            </div>

            {/* Time Slot / Free Time Selection */}
            <div className="space-y-2">
              {((bookingType === 'service' && formServiceId) || (bookingType === 'package' && formPackageId)) && formDate ? (
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Available Time Slots *</Label>
                  {loadingSlots ? (
                    <div className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin text-primary" /> Loading slots…
                    </div>
                  ) : noSlotsReason ? (
                    <p className="text-sm text-amber-700 bg-amber-50 dark:bg-amber-950/30 p-3 rounded-md border border-amber-200">{noSlotsReason}</p>
                  ) : availableSlots.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-2">No available slots for this date.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto py-1 pr-1">
                      {availableSlots.map((slot) => (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => {
                            setFormTimeSlot(slot);
                            timeSlotRef.current = slot;
                            setCustomTimeInputValue(timeSlotToTimeInputValue(slot));
                          }}
                          className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${formTimeSlot === slot
                            ? 'bg-primary text-primary-foreground border-primary shadow-md scale-[1.02]'
                            : 'border-border bg-background hover:bg-muted hover:border-primary/50 text-gray-700'
                            }`}
                        >
                          {slot}
                        </button>
                      ))}
                    </div>
                  )}
                  <input type="hidden" value={formTimeSlot} required />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Time *</Label>
                  <Input
                    type="time"
                    value={customTimeInputValue}
                    onChange={(e) => {
                      const v = e.target.value;
                      const slot = timeInputValueToTimeSlot(v);
                      setCustomTimeInputValue(v);
                      setFormTimeSlot(slot);
                      timeSlotRef.current = slot;
                    }}
                    className="h-10 border-gray-300 focus:ring-primary/20 w-full"
                    required
                  />
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Notes / Special Instructions</Label>
              <Input
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="Optional notes or customer requests..."
                className="h-10 border-gray-300 focus:ring-primary/20 w-full"
              />
            </div>

            <div className="flex justify-end pt-4 gap-3 border-t border-gray-100">
              <Button type="button" variant="outline" onClick={() => navigate('/appointments')} className="h-11 px-8 border-gray-300 hover:bg-gray-50 text-gray-600 font-semibold">
                Cancel
              </Button>
              <Button type="submit" disabled={loading || loadingOptions} className="h-11 px-12 bg-primary hover:bg-primary/90 text-white font-bold shadow-md transition-all active:scale-95">
                {loading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Save className="h-5 w-5 mr-2" />}
                {isEdit ? 'Update Appointment' : 'Book Appointment'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
      </Form>
    </div>
  );
}
