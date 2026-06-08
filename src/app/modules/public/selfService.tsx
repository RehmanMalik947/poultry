import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  Scissors, 
  MapPin, 
  CheckCircle2, 
  Phone, 
  UserPlus, 
  Loader2,
  Package as PackageIcon,
  ShieldCheck,
  Undo2,
  Check,
  Sparkles,
  Award,
  Zap,
  Star,
  ChevronDown,
  Store,
  Users,
  Tag,
  Briefcase
} from 'lucide-react';
import { API_BASE } from '../../../api/ApiService';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { publicBookingSchema, type PublicBookingFormValues } from "../../utils/validation";
import { toast } from 'sonner';

// Standard UI components
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Textarea } from '../../components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../../components/ui/form';

// Custom Dropdown Component
interface DropdownOption {
  id: number | string;
  name: string;
  [key: string]: any;
}

interface CustomDropdownProps {
  options: DropdownOption[];
  selectedValue: DropdownOption | null;
  onSelect: (option: DropdownOption) => void;
  placeholder: string;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  loading?: boolean;
  renderOption?: (option: DropdownOption) => React.ReactNode;
  renderSelected?: (option: DropdownOption) => React.ReactNode;
}

function CustomDropdown({ 
  options, 
  selectedValue, 
  onSelect, 
  placeholder, 
  label, 
  icon,
  disabled = false,
  loading = false,
  renderOption,
  renderSelected
}: CustomDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  const defaultRenderOption = (option: DropdownOption) => (
    <div className="flex flex-col">
      <span className="font-medium text-slate-800">{option.name}</span>
      {option.address && <span className="text-xs text-slate-500">{option.address}</span>}
      {option.specialization && <span className="text-xs text-slate-500">{option.specialization}</span>}
    </div>
  );

  const defaultRenderSelected = (option: DropdownOption) => (
    <div className="flex flex-col">
      <span className="font-medium text-slate-800">{option.name}</span>
      {option.address && <span className="text-xs text-slate-500 truncate">{option.address}</span>}
    </div>
  );

  return (
    <div className="relative">
      <Label className="text-xs md:text-sm font-bold text-[#5B6E8C] mb-1.5 block">
        {icon} {label}
      </Label>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full p-3 rounded-xl border bg-white text-left flex items-center justify-between transition-all ${
          disabled 
            ? 'bg-slate-50 cursor-not-allowed border-slate-200' 
            : 'border-slate-250 hover:border-[#7c3aed] focus:outline-none focus:ring-2 focus:ring-purple-500/20'
        }`}
      >
        <div className="flex-1">
          {selectedValue ? (
            renderSelected ? renderSelected(selectedValue) : defaultRenderSelected(selectedValue)
          ) : (
            <span className="text-slate-400">{placeholder}</span>
          )}
        </div>
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
        ) : (
          <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        )}
      </button>

      {isOpen && !disabled && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute z-20 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-lg max-h-64 overflow-y-auto">
            {options.length === 0 ? (
              <div className="p-4 text-center text-slate-500 text-sm">No options available</div>
            ) : (
              options.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => {
                    onSelect(option);
                    setIsOpen(false);
                  }}
                  className={`w-full p-3 text-left hover:bg-purple-50 transition-colors border-b border-slate-100 last:border-0 ${
                    selectedValue?.id === option.id ? 'bg-purple-50' : ''
                  }`}
                >
                  {renderOption ? renderOption(option) : defaultRenderOption(option)}
                </button>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}

interface Branch {
  id: number;
  name: string;
  address: string | null;
  phone: string | null;
}

interface ServiceCategory {
  id: number;
  name: string;
  description?: string;
  services: ServiceItem[];
}

interface ServiceItem {
  id: number;
  serviceName: string;
  price: string;
  duration: number | null;
  description: string | null;
  categoryId?: number;
  categoryName?: string;
}

interface PackageItem {
  id: number;
  packageName: string;
  price: string;
  description: string | null;
  services: any[];
}

interface StaffMember {
  id: number;
  name: string;
  firstName: string;
  lastName: string;
  specialization?: string;
  avatar?: string;
}

export function SelfService() {
  const [orgId, setOrgId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [orgName, setOrgName] = useState<string>(''); 

  // Loaded Options
  const [branches, setBranches] = useState<Branch[]>([]);
  const [serviceCategories, setServiceCategories] = useState<ServiceCategory[]>([]);
  const [allServices, setAllServices] = useState<ServiceItem[]>([]);
  const [packages, setPackages] = useState<PackageItem[]>([]);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);

  // Selection State
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [selectedItemType, setSelectedItemType] = useState<'service' | 'package'>('service');
  const [selectedService, setSelectedService] = useState<ServiceItem | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<PackageItem | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory | null>(null);

  const form = useForm<PublicBookingFormValues>({
    resolver: zodResolver(publicBookingSchema),
    mode: "onChange",
    defaultValues: {
      orgId: "",
      name: "",
      mobile: "",
      email: "",
      notes: "",
    },
  });

  // User Details State - synced to form
  const clientName = form.watch('name');
  const clientEmail = form.watch('email');
  const clientMobile = form.watch('mobile');
  const clientNotes = form.watch('notes') || '';

  // Booking Results
  const [bookingResult, setBookingResult] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Extract orgId from query parameter
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const org = params.get('orgId');
    if (org) {
      setOrgId(org);
      form.setValue('orgId', org);
    } else {
      setErrorMessage("Organization ID (orgId) is missing in the URL. Please scan the correct salon QR code.");
    }
  }, []);

  // Fetch branches once orgId is resolved
  useEffect(() => {
    if (!orgId) return;

    setLoading(true);
    axios.get(`${API_BASE}/public/branches?orgId=${orgId}`)
      .then(res => {
        if (res.data.success) {
          setBranches(res.data.data);
          if (res.data.data.length === 1) {
            setSelectedBranch(res.data.data[0]);
          }
        }
      })
      .catch(err => {
        console.error(err);
        setErrorMessage("Failed to load branches. Please verify the Organization ID.");
      })
      .finally(() => setLoading(false));
  }, [orgId]);

  // Fetch organization name
  useEffect(() => {
    if (!orgId) return;

    axios.get(`${API_BASE}/public/organization?orgId=${orgId}`)
      .then(res => {
        if (res.data.success) {
          setOrgName(res.data.name);
        }
      })
      .catch(err => {
        console.error("Failed to load organization name:", err);
        setOrgName("SALONPOS");
      });
  }, [orgId]);

  // Fetch services and packages when branch is selected
  useEffect(() => {
    if (!selectedBranch || !orgId) {
      setAllServices([]);
      setServiceCategories([]);
      setPackages([]);
      return;
    }

    // Fetch services
    axios.get(`${API_BASE}/public/services?orgId=${orgId}`)
      .then(res => {
        if (res.data.success) {
          const services = res.data.data;
          setAllServices(services);
          
          // Group services by category
          const categoriesMap = new Map<number, ServiceCategory>();
          services.forEach((service: ServiceItem) => {
            const categoryId = service.categoryId || 0;
            const categoryName = service.categoryName || 'Uncategorized';
            
            if (!categoriesMap.has(categoryId)) {
              categoriesMap.set(categoryId, {
                id: categoryId,
                name: categoryName,
                services: []
              });
            }
            categoriesMap.get(categoryId)!.services.push(service);
          });
          
          setServiceCategories(Array.from(categoriesMap.values()));
        }
      })
      .catch(console.error);

    // Fetch packages
    axios.get(`${API_BASE}/public/packages?orgId=${orgId}`)
      .then(res => {
        if (res.data.success) setPackages(res.data.data);
      })
      .catch(console.error);
  }, [selectedBranch, orgId]);

  // Fetch staff list based on branch and selected service (filters dynamically)
  useEffect(() => {
    if (!selectedBranch) {
      setStaffList([]);
      return;
    }

    const serviceId = selectedService?.id || '';
    
    setLoading(true);
    axios.get(`${API_BASE}/public/staff`, {
      params: {
        branchId: selectedBranch.id,
        serviceId: serviceId || undefined
      }
    })
      .then(res => {
        if (res.data.success) {
          const fetchedStaff = res.data.data;
          setStaffList(fetchedStaff);

          // Reset selected staff if they are not allowed to perform the newly selected service
          if (selectedStaff && selectedStaff.id !== 0) {
            const isStillAvailable = fetchedStaff.some((s: StaffMember) => s.id === selectedStaff.id);
            if (!isStillAvailable) {
              setSelectedStaff(null);
              setSelectedSlot('');
            }
          }
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedBranch, selectedService]);

  // Fetch available slots when staff, date, service, or package changes
  useEffect(() => {
    if (!selectedBranch || !selectedDate || !orgId) {
      setAvailableSlots([]);
      return;
    }
    const serviceId = selectedService?.id || null;
    const packageId = selectedPackage?.id || null;
    if (!serviceId && !packageId) { setAvailableSlots([]); return; }

    // For service booking, staff selection is required
    if (selectedItemType === 'service' && (!selectedStaff || selectedStaff.id === 0)) {
      setAvailableSlots([]);
      return;
    }

    setLoading(true);
    axios.get(`${API_BASE}/public/available-slots`, {
      params: {
        orgId,
        branchId: selectedBranch.id,
        staffId: selectedStaff && selectedStaff.id !== 0 ? selectedStaff.id : 0,
        ...(serviceId ? { serviceId } : { packageId }),
        date: selectedDate
      }
    })
      .then(res => {
        if (res.data.success) {
          setAvailableSlots(res.data.data.slots || []);
        }
      })
      .catch(err => {
        console.error(err);
        setAvailableSlots([]);
      })
      .finally(() => setLoading(false));
  }, [selectedBranch, selectedStaff, selectedDate, selectedService, selectedPackage, orgId, selectedItemType]);

  const resetAll = () => {
    setSelectedBranch(branches.length === 1 ? branches[0] : null);
    setSelectedService(null);
    setSelectedPackage(null);
    setSelectedStaff(null);
    setSelectedSlot('');
    setSelectedDate('');
    setSelectedCategory(null);
    form.reset();
    setBookingResult(null);
  };

  const submitBooking = form.handleSubmit(async () => {
    if (!selectedBranch) { toast.error("Please select a branch."); return; }
    if (!selectedService && !selectedPackage) { toast.error("Please select a service or package."); return; }
    if (selectedItemType === 'service' && !selectedStaff) { toast.error("Please choose a stylist."); return; }
    if (!selectedDate || !selectedSlot) { toast.error("Please pick a date and time."); return; }

    setSubmitLoading(true);

    const payload: any = {
      orgId: orgId,
      branchId: selectedBranch.id,
      staffId: selectedStaff && selectedStaff.id !== 0 ? selectedStaff.id : null,
      date: selectedDate,
      timeSlot: selectedSlot,
      notes: form.watch('notes'),
      name: form.watch('name'),
      email: form.watch('email'),
      mobile: form.watch('mobile')
    };

    if (selectedPackage) {
      payload.packageId = selectedPackage.id;
      payload.serviceId = null;
    } else {
      payload.serviceId = selectedService!.id;
      payload.packageId = null;
    }

    try {
      const res = await axios.post(`${API_BASE}/public/book`, payload);
      if (res.data.success) {
        setBookingResult(res.data.data);
      } else {
        toast.error(res.data.message || "Failed to place booking");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || "Server error while placing booking");
    } finally {
      setSubmitLoading(false);
    }
  });

  const formatPrice = (p: string) => {
    const val = parseFloat(p);
    return isNaN(val) ? p : `Rs. ${val.toLocaleString()}`;
  };

  const selectedItemName = selectedService?.serviceName || selectedPackage?.packageName || "— Not selected —";
  const selectedItemPrice = selectedService ? formatPrice(selectedService.price) : selectedPackage ? formatPrice(selectedPackage.price) : "Rs. 0";

  // Get filtered services based on selected category
  const getFilteredServices = () => {
    if (selectedCategory && selectedCategory.id !== 0) {
      return selectedCategory.services;
    }
    return allServices;
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#1A2C3E] font-sans flex flex-col">
      
      {/* Navigation Header */}
      <nav className="w-full bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm px-6 py-4">
        <div className="max-w-[1300px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[#7c3aed]" />
            <span className="font-black text-lg tracking-tight uppercase">
              {orgName || 'SALONPOS'}
            </span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm font-semibold text-slate-650">
            <a href="#booking-section" className="hover:text-[#7c3aed] transition-all">Book Online</a>
            <a href="#features-section" className="hover:text-[#7c3aed] transition-all">Our Features</a>
            <a href="#how-it-works" className="hover:text-[#7c3aed] transition-all">How it Works</a>
          </div>
          <div>
            <a 
              href="#booking-section" 
              className="bg-[#7c3aed] text-white hover:bg-purple-700 text-xs md:text-sm font-bold px-4 py-2 rounded-full transition-all shadow-sm"
            >
              Book Now
            </a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-[#4c1d95] via-[#6d28d9] to-[#7c3aed] text-white py-12 md:py-20 px-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.08),transparent_40%)]" />
        <div className="max-w-[800px] mx-auto relative z-10 space-y-4">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest bg-white/10 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/20 text-purple-200">
            <ShieldCheck className="h-4 w-4 text-purple-200" /> Instant Online Appointment
          </span>
          <h2 className="text-3xl md:text-5xl font-black tracking-tight leading-tight">
            Book Your Next Hair & Beauty Treatment Instantly
          </h2>
          <p className="text-sm md:text-lg text-purple-100 opacity-90 max-w-2xl mx-auto leading-relaxed">
            Experience premium salon care. Choose a convenient branch location, select your expert stylist, pick a time slot, and reserve your chair in under a minute.
          </p>
          <div className="flex items-center justify-center gap-6 pt-2 text-xs md:text-sm text-purple-200 font-semibold">
            <span className="flex items-center gap-1"><Check className="h-4 w-4 text-emerald-400 stroke-[3]" /> Real-time Availability</span>
            <span className="flex items-center gap-1"><Check className="h-4 w-4 text-emerald-400 stroke-[3]" /> Certified Stylists</span>
          </div>
        </div>
      </section>

      {/* Main Booking Section */}
      <section id="booking-section" className="max-w-[1300px] w-full mx-auto px-4 md:px-6 -mt-8 md:-mt-12 relative z-20 pb-12 flex-1">
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
          {errorMessage ? (
            <div className="p-8 text-center bg-white">
              <div className="max-w-md mx-auto p-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-750">
                <h4 className="font-bold text-base">Alert</h4>
                <p className="text-xs mt-1">{errorMessage}</p>
              </div>
            </div>
          ) : bookingResult ? (
            /* SUCCESS SCREEN */
            <div className="p-6 md:p-12 text-center bg-white flex flex-col items-center justify-center min-h-[420px]">
              <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-250 flex items-center justify-center text-emerald-500 mb-4 shadow-sm animate-bounce">
                <Check className="h-8 w-8 stroke-[3]" />
              </div>
              <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900">
                {selectedPackage ? 'Booking Request Submitted!' : 'Appointment Confirmed!'}
              </h2>
              <p className="text-xs md:text-sm text-slate-505 mt-1.5 max-w-sm">
                {selectedPackage
                  ? 'Your package booking request is pending approval. Our team will confirm your appointment and assign the best stylists shortly.'
                  : 'Your appointment has been placed successfully in our scheduling system.'
                }
              </p>

              <div className="w-full max-w-md rounded-xl border border-slate-200 bg-slate-50/50 p-5 mt-5 text-left space-y-3 shadow-sm relative text-xs md:text-sm">
                <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                  <span className="text-xs uppercase font-bold text-slate-400">Booking ID</span>
                  <span className="font-bold text-slate-800">#{bookingResult.id}</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-xs uppercase font-bold text-slate-400">Date</span>
                    <h4 className="font-bold text-slate-850 mt-0.5">{bookingResult.date}</h4>
                  </div>
                  <div>
                    <span className="text-xs uppercase font-bold text-slate-400">Time</span>
                    <h4 className="font-bold text-purple-700 mt-0.5">{bookingResult.timeSlot}</h4>
                  </div>
                </div>
                <div>
                  <span className="text-xs uppercase font-bold text-slate-400">Branch Location</span>
                  <h4 className="font-bold text-slate-850 mt-0.5">{selectedBranch?.name}</h4>
                </div>
                <div>
                  <span className="text-xs uppercase font-bold text-slate-400">Booked Treatment</span>
                  <h4 className="font-bold text-slate-850 mt-0.5">{selectedItemName}</h4>
                </div>
                <div>
                  <span className="text-xs uppercase font-bold text-slate-400">Assigned Stylist</span>
                  <h4 className="font-bold text-slate-850 mt-0.5">{selectedStaff?.name}</h4>
                </div>
              </div>

              <button 
                onClick={resetAll}
                className="mt-6 bg-[#7c3aed] hover:bg-purple-750 text-white font-bold px-7 py-2.5 rounded-full text-xs md:text-sm transition-all shadow-md"
              >
                Book Another Appointment
              </button>
            </div>
          ) : (
            /* BOOKING PORTAL FORM */
            <Form {...form}>
            <div className="flex flex-wrap lg:flex-nowrap gap-4 p-4 md:p-6 bg-white">
              
              {/* Left Panel: Form Sections */}
              <div className="w-full lg:w-[67%] space-y-4">
                
                {/* Section 1: Select Branch - Dropdown */}
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                  <div className="border-l-4 border-[#7c3aed] pl-2.5 mb-3">
                    <h3 className="text-lg md:text-xl font-bold text-[#4c1d95] flex items-center gap-2">
                      <Store className="h-5 w-5 text-[#7c3aed]" /> 1. Select Branch Location
                    </h3>
                  </div>
                  
                  <CustomDropdown
                    options={branches}
                    selectedValue={selectedBranch}
                    onSelect={(branch) => {
                      setSelectedBranch(branch as Branch);
                      form.setValue('branchId', (branch as Branch).id);
                      setSelectedStaff(null);
                      setSelectedService(null);
                      setSelectedPackage(null);
                      setSelectedCategory(null);
                      setSelectedSlot('');
                    }}
                    placeholder="Select a branch..."
                    label="Branch"
                    icon={<MapPin className="h-3.5 w-3.5 inline-block mr-1" />}
                    loading={loading && branches.length === 0}
                    renderOption={(option) => (
                      <div>
                        <div className="font-semibold text-slate-800">{option.name}</div>
                        {option.address && <div className="text-xs text-slate-500 mt-0.5">{option.address}</div>}
                        {option.phone && <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-1"><Phone className="h-3 w-3" /> {option.phone}</div>}
                      </div>
                    )}
                  />
                </div>

                {/* Section 2: Select Service/package with Category Dropdown */}
                <div className={`bg-white rounded-xl border border-slate-200 p-4 shadow-sm transition-opacity duration-150 ${!selectedBranch ? 'opacity-40 pointer-events-none' : ''}`}>
                  <div className="border-l-4 border-[#7c3aed] pl-2.5 mb-3">
                    <h3 className="text-lg md:text-xl font-bold text-[#4c1d95] flex items-center gap-2">
                      <Scissors className="h-5 w-5 text-[#7c3aed]" /> 2. Select your service
                    </h3>
                  </div>
                  
                  <Tabs value={selectedItemType} onValueChange={(val: any) => {
                    setSelectedItemType(val);
                    setSelectedService(null);
                    setSelectedPackage(null);
                    setSelectedCategory(null);
                  }} className="w-full">
                    <TabsList className="grid grid-cols-2 bg-slate-100 p-0.5 rounded-lg mb-4 max-w-[200px] h-8">
                      <TabsTrigger value="service" className="data-[state=active]:bg-white data-[state=active]:text-purple-750 data-[state=active]:shadow-sm text-slate-500 rounded-md text-xs py-1 font-bold transition-all">Services</TabsTrigger>
                      <TabsTrigger value="package" className="data-[state=active]:bg-white data-[state=active]:text-purple-750 data-[state=active]:shadow-sm text-slate-500 rounded-md text-xs py-1 font-bold transition-all">Packages</TabsTrigger>
                    </TabsList>

                    <TabsContent value="service">
                      {/* Category Dropdown for Services */}
                      {serviceCategories.length > 0 && (
                        <div className="mb-4">
                          <CustomDropdown
                            options={[{ id: 0, name: 'All Categories', services: allServices }, ...serviceCategories]}
                            selectedValue={selectedCategory || { id: 0, name: 'All Categories', services: allServices }}
                            onSelect={(category) => setSelectedCategory(category as ServiceCategory)}
                            placeholder="Select category..."
                            label="Service Category"
                            icon={<Tag className="h-3.5 w-3.5 inline-block mr-1" />}
                            renderOption={(option) => (
                              <div className="font-medium text-slate-800">
                                {option.name} 
                                {option.services && <span className="text-xs text-slate-500 ml-2">({option.services.length} services)</span>}
                              </div>
                            )}
                          />
                        </div>
                      )}
                      
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-80 overflow-y-auto p-1">
                        {getFilteredServices().length === 0 && (
                          <p className="text-center text-slate-450 py-3 text-sm col-span-3">No services found in this category.</p>
                        )}
                        {getFilteredServices().map(s => {
                          const isSelected = selectedService?.id === s.id;
                          return (
                            <div 
                              key={s.id}
                                                    onClick={() => {
                                                      setSelectedService(s);
                                                      form.setValue('serviceId', s.id);
                                                      setSelectedPackage(null);
                                                    }}
                              className={`p-3 rounded-lg border text-center cursor-pointer transition-all duration-150 ${
                                isSelected 
                                  ? 'bg-[#7c3aed] border-[#7c3aed] text-white shadow-sm' 
                                  : 'bg-white border-slate-200 hover:bg-slate-50/40'
                              }`}
                            >
                              <h4 className="text-sm font-bold truncate">{s.serviceName}</h4>
                              <span className={`text-xs md:text-sm font-black block mt-1.5 ${isSelected ? 'text-purple-200' : 'text-emerald-700'}`}>{formatPrice(s.price)}</span>
                              {s.duration && <span className={`text-[10px] md:text-xs block mt-2 opacity-80 ${isSelected ? 'text-white' : 'text-slate-500'}`}><Clock className="h-3.5 w-3.5 inline-block mr-0.5" /> {s.duration} mins</span>}
                            </div>
                          );
                        })}
                      </div>
                    </TabsContent>

                    <TabsContent value="package">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-80 overflow-y-auto p-1">
                        {packages.length === 0 && <p className="text-center text-slate-450 py-3 text-sm col-span-3">No active packages found.</p>}
                        {packages.map(p => {
                          const isSelected = selectedPackage?.id === p.id;
                          return (
                            <div 
                              key={p.id}
                                                    onClick={() => {
                                                      setSelectedPackage(p);
                                                      form.setValue('serviceId', undefined);
                                                      setSelectedService(null);
                                                    }}
                              className={`p-3 rounded-lg border text-center cursor-pointer transition-all duration-150 ${
                                isSelected 
                                  ? 'bg-[#7c3aed] border-[#7c3aed] text-white shadow-sm' 
                                  : 'bg-white border-slate-200 hover:bg-slate-50/40'
                              }`}
                            >
                              <h4 className="text-sm font-bold truncate flex items-center justify-center gap-1">
                                <PackageIcon className="h-3.5 w-3.5 inline text-purple-300" /> {p.packageName}
                              </h4>
                              <span className={`text-xs md:text-sm font-black block mt-1.5 ${isSelected ? 'text-purple-200' : 'text-emerald-700'}`}>{formatPrice(p.price)}</span>
                              {p.description && <p className={`text-[10px] md:text-xs block mt-2 truncate ${isSelected ? 'text-purple-100' : 'text-slate-500'}`}>{p.description}</p>}
                            </div>
                          );
                        })}
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>

                {/* Section 3: Choose Stylist - Dropdown */}
                <div className={`bg-white rounded-xl border border-slate-200 p-4 shadow-sm transition-opacity duration-150 ${!selectedBranch ? 'opacity-40 pointer-events-none' : ''}`}>
                  <div className="border-l-4 border-[#7c3aed] pl-2.5 mb-3">
                    <h3 className="text-lg md:text-xl font-bold text-[#4c1d95] flex items-center gap-2">
                      <Users className="h-5 w-5 text-[#7c3aed]" /> 3. Choose stylist
                    </h3>
                  </div>
                  
                  {selectedItemType === 'package' ? (
                    <div className="p-4 bg-purple-50 rounded-xl border border-purple-100 text-[#6d28d9] flex items-start gap-3">
                      <Sparkles className="h-5 w-5 shrink-0 text-[#7c3aed] mt-0.5" />
                      <div>
                        <p className="font-bold text-sm text-[#4c1d95]">Stylist selection is not required</p>
                        <p className="text-xs md:text-sm text-purple-700 mt-1">Our receptionist will assign qualified stylists to each of your package services after your appointment is confirmed.</p>
                      </div>
                    </div>
                  ) : (
                    selectedBranch && (
                      <CustomDropdown
                        options={[
                          { id: 0, name: "Any Available Stylist", specialization: "First available expert" },
                          ...staffList
                        ]}
                        selectedValue={selectedStaff}
                                                    onSelect={(staff) => {
                                                          setSelectedStaff(staff as StaffMember);
                                                          form.setValue('staffId', (staff as StaffMember).id || undefined);
                                                          setSelectedSlot('');
                                                        }}
                        placeholder={selectedService ? "Select a stylist..." : "Please select a service first"}
                        label="Stylist"
                        icon={<User className="h-3.5 w-3.5 inline-block mr-1" />}
                        disabled={!selectedService && !selectedPackage}
                        renderOption={(option) => (
                          <div>
                            <div className="font-semibold text-slate-800">{option.name}</div>
                            {option.specialization && <div className="text-xs text-slate-500 mt-0.5">{option.specialization}</div>}
                          </div>
                        )}
                        renderSelected={(option) => (
                          <div>
                            <div className="font-semibold text-slate-800">{option.name}</div>
                            {option.specialization && option.id !== 0 && <div className="text-xs text-slate-500">{option.specialization}</div>}
                          </div>
                        )}
                      />
                    )
                  )}
                </div>

                {/* Section 4: Schedule Appointment */}
                <div className={`bg-white rounded-xl border border-slate-200 p-4 shadow-sm transition-opacity duration-150 ${!selectedBranch ? 'opacity-40 pointer-events-none' : ''}`}>
                  <div className="border-l-4 border-[#7c3aed] pl-2.5 mb-3">
                    <h3 className="text-lg md:text-xl font-bold text-[#4c1d95] flex items-center gap-2">
                      <CalendarIcon className="h-5 w-5 text-[#7c3aed]" /> 4. Schedule appointment
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <FormField
                      control={form.control}
                      name="date"
                      render={({ field }) => (
                        <FormItem className="space-y-1">
                          <FormLabel className="text-xs md:text-sm font-bold text-[#5B6E8C]">Select Date</FormLabel>
                          <FormControl>
                            <Input 
                              type="date"
                              value={field.value ?? ''}
                              onChange={(e) => {
                                field.onChange(e);
                                setSelectedDate(e.target.value);
                                setSelectedSlot('');
                              }}
                              min={new Date().toISOString().split('T')[0]}
                              className="w-full h-11"
                            />
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />
                    <div className="flex flex-col justify-end">
                      <p className="text-xs text-slate-555 leading-normal mb-1">
                        Available hours depend on the selected stylist's calendar.
                      </p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <Label className="text-xs md:text-sm font-bold text-[#5B6E8C] block mb-2">Available Time Slots</Label>
                    
                    {loading && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 py-1">
                        <Loader2 className="h-4.5 w-4.5 animate-spin text-[#7c3aed]" /> Loading slots...
                      </div>
                    )}

                    {!loading && !selectedDate && (
                      <div className="text-xs md:text-sm text-slate-450 py-1">Please pick date and select location branch above to view slots.</div>
                    )}

                    {!loading && selectedDate && availableSlots.length === 0 && (
                      <div className="text-xs md:text-sm text-slate-455 py-1">No slots available for this stylist on the selected date.</div>
                    )}

                    {!loading && availableSlots.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-1 max-h-48 overflow-y-auto">
                        {availableSlots.map(slot => {
                          const isSelected = selectedSlot === slot;
                          return (
                            <div 
                              key={slot}
                                                    onClick={() => { setSelectedSlot(slot); form.setValue('timeSlot', slot); }}
                              className={`px-5 py-2.5 rounded-full border text-xs md:text-sm font-bold cursor-pointer transition-all ${
                                isSelected
                                  ? 'bg-[#7c3aed] border-[#7c3aed] text-white shadow-sm'
                                  : 'bg-[#F8FAFE] border-slate-250 hover:bg-slate-100 text-slate-700'
                              }`}
                            >
                              {slot}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Section 5: Customer Details */}
                <div className={`bg-white rounded-xl border border-slate-200 p-4 shadow-sm transition-opacity duration-150 ${!selectedBranch ? 'opacity-40 pointer-events-none' : ''}`}>
                  <div className="border-l-4 border-[#7c3aed] pl-2.5 mb-3">
                    <h3 className="text-lg md:text-xl font-bold text-[#4c1d95] flex items-center gap-2">
                      <UserPlus className="h-5 w-5 text-[#7c3aed]" /> 5. Your details
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem className="space-y-1.5">
                          <FormLabel className="text-xs md:text-sm font-semibold">Full name *</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="e.g. Sara Ahmed"
                              className="bg-white border-slate-250 text-sm rounded-xl focus:ring-purple-550/20 h-11"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="mobile"
                      render={({ field }) => (
                        <FormItem className="space-y-1.5">
                          <FormLabel className="text-xs md:text-sm font-semibold">Mobile number *</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="+92 3XX XXXXXXX"
                              className="bg-white border-slate-250 text-sm rounded-xl focus:ring-purple-550/20 h-11"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem className="space-y-1.5">
                          <FormLabel className="text-xs md:text-sm font-semibold">Email (optional)</FormLabel>
                          <FormControl>
                            <Input 
                              type="email"
                              placeholder="hello@example.com"
                              className="bg-white border-slate-250 text-sm rounded-xl focus:ring-purple-550/20 h-11"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem className="mt-4 space-y-1.5">
                        <FormLabel className="text-xs md:text-sm font-semibold">Special notes (optional)</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Allergies, preferences, or extra requests"
                            className="bg-white border-slate-250 text-sm rounded-xl focus:ring-purple-550/20 h-11"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                </div>

              </div>

              {/* Right Panel: Summary Receipt */}
              <div className="w-full lg:w-[33%]">
                <div className="bg-[#F8FAFE] rounded-xl p-4 border border-slate-200 sticky top-20 shadow-sm">
                  
                  <div className="flex items-center justify-between border-b-2 border-dashed border-slate-200 pb-3 mb-3">
                    <span className="text-base font-bold text-slate-800 flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-purple-600" /> Booking summary
                    </span>
                    <span 
                      onClick={resetAll}
                      className="text-xs font-bold text-slate-500 bg-slate-200/60 px-3 py-1.5 rounded-full flex items-center gap-1 cursor-pointer hover:bg-slate-200 transition-all"
                    >
                      <Undo2 className="h-3.5 w-3.5" /> Reset
                    </span>
                  </div>

                  <div className="space-y-4 text-sm">
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-500">Branch:</span>
                      <span className="font-bold text-slate-800 text-right">{selectedBranch ? selectedBranch.name : '— Select branch —'}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-500">Service:</span>
                      <span className="font-bold text-slate-800 text-right truncate max-w-[200px]">{selectedItemName}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-500">Stylist:</span>
                      <span className="font-bold text-slate-800 text-right">
                        {selectedItemType === 'package' ? (selectedStaff ? selectedStaff.name : 'Assigned after confirmation') : (selectedStaff ? selectedStaff.name : '— Choose stylist —')}
                      </span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-500">Date & Time:</span>
                      <span className="font-bold text-slate-800 text-right">
                        {selectedDate && selectedSlot ? `${selectedDate} at ${selectedSlot}` : selectedDate ? `${selectedDate} (pending slot)` : '— Pending —'}
                      </span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-500">Customer:</span>
                      <span className="font-bold text-slate-800 text-right truncate max-w-[180px]">{clientName || '— Add name —'}</span>
                    </div>

                    <hr className="border-t border-slate-200 my-3" />

                    <div className="flex justify-between items-center text-purple-700 font-black text-lg pt-0.5">
                      <span>Total amount</span>
                      <span>{selectedItemPrice}</span>
                    </div>
                  </div>

                  <Button 
                    onClick={submitBooking}
                    disabled={submitLoading}
                    className="w-full mt-4 bg-gradient-to-r from-[#7c3aed] to-[#5b21b6] hover:from-[#6d28d9] hover:to-[#4c1d95] text-white font-extrabold py-5 text-sm rounded-full shadow-md flex items-center justify-center gap-2 transition-all h-12"
                  >
                    {submitLoading && <Loader2 className="h-5 w-5 animate-spin mr-1" />}
                    <CheckCircle2 className="h-5 w-5 stroke-[2.5]" /> Confirm Appointment
                  </Button>

                  <div className="text-xs text-slate-450 text-center mt-2.5 flex items-center justify-center gap-1">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" /> Secured by POS salon system
                  </div>
                </div>
              </div>

            </div>
            </Form>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section id="features-section" className="bg-white py-12 border-t border-slate-200">
        <div className="max-w-[1100px] mx-auto px-6">
          <div className="text-center space-y-2 mb-10">
            <h2 className="text-2xl md:text-3xl font-black text-[#4c1d95]">Why Book With Us?</h2>
            <p className="text-xs md:text-sm text-slate-500">Enjoy premium treatments and digital convenience at our studios.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2.5 text-center">
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center mx-auto text-[#7c3aed]">
                <Award className="h-5 w-5" />
              </div>
              <h4 className="font-extrabold text-slate-800 text-sm md:text-base">Expert Stylists</h4>
              <p className="text-xs text-slate-500 leading-relaxed">Our professionals are trained in the latest global hair, skin, and beauty trends.</p>
            </div>
            <div className="p-5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2.5 text-center">
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center mx-auto text-[#7c3aed]">
                <Zap className="h-5 w-5" />
              </div>
              <h4 className="font-extrabold text-slate-800 text-sm md:text-base">Instant Booking</h4>
              <p className="text-xs text-slate-500 leading-relaxed">No phone calls required. Check stylist availability and book your chair instantly.</p>
            </div>
            <div className="p-5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2.5 text-center">
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center mx-auto text-[#7c3aed]">
                <Star className="h-5 w-5" />
              </div>
              <h4 className="font-extrabold text-slate-800 text-sm md:text-base">Premium Experience</h4>
              <p className="text-xs text-slate-500 leading-relaxed">We utilize top-tier, international brands to provide a relaxing, high-end environment.</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="bg-[#F8FAFE] py-12 border-t border-slate-200">
        <div className="max-w-[1000px] mx-auto px-6 text-center">
          <div className="space-y-2 mb-10">
            <h2 className="text-2xl md:text-3xl font-black text-[#4c1d95]">How It Works</h2>
            <p className="text-xs md:text-sm text-slate-500">Book your salon chair in 3 simple steps</p>
          </div>
          <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16">
            <div className="space-y-1">
              <div className="w-9 h-9 rounded-full bg-[#7c3aed] text-white flex items-center justify-center mx-auto font-black text-sm">1</div>
              <h4 className="font-bold text-slate-800 text-sm mt-2">Select Location & Service</h4>
              <p className="text-xs text-slate-500 max-w-xs">Pick the nearest branch and choose a beauty treatment.</p>
            </div>
            <div className="space-y-1">
              <div className="w-9 h-9 rounded-full bg-[#7c3aed] text-white flex items-center justify-center mx-auto font-black text-sm">2</div>
              <h4 className="font-bold text-slate-800 text-sm mt-2">Choose Stylist & Time</h4>
              <p className="text-xs text-slate-500 max-w-xs">Pick your preferred stylist and select an open time slot.</p>
            </div>
            <div className="space-y-1">
              <div className="w-9 h-9 rounded-full bg-[#7c3aed] text-white flex items-center justify-center mx-auto font-black text-sm">3</div>
              <h4 className="font-bold text-slate-800 text-sm mt-2">Get Instant Confirmation</h4>
              <p className="text-xs text-slate-500 max-w-xs">Confirm your details and receive your slot confirmation code.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0f172a] text-slate-400 py-10 px-6 border-t border-slate-900 mt-auto text-xs">
        <div className="max-w-[1100px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-[#7c3aed]" />
              <span className="font-black text-sm tracking-tight text-white uppercase">
                {orgName || 'SALONPOS'}
              </span>
            </div>
            <p className="text-slate-400 max-w-xs leading-normal">
              Digital booking portal, integrated with retail sales inventory, payroll, and stylist schedules.
            </p>
          </div>
          <div className="space-y-2">
            <h4 className="font-extrabold text-white text-xs uppercase tracking-wider">Quick Links</h4>
            <ul className="space-y-1.5 text-slate-450">
              <li><a href="#booking-section" className="hover:text-white transition-all">Book Online</a></li>
              <li><a href="#features-section" className="hover:text-white transition-all">Features Grid</a></li>
              <li><a href="#how-it-works" className="hover:text-white transition-all">How it Works</a></li>
            </ul>
          </div>
          <div className="space-y-2">
            <h4 className="font-extrabold text-white text-xs uppercase tracking-wider">Secure Operations</h4>
            <p className="text-slate-450 leading-relaxed">
              All appointments are synchronized immediately with the front-desk register to prevent double-booking.
            </p>
          </div>
        </div>
        <div className="max-w-[1100px] mx-auto text-center border-t border-slate-800 mt-8 pt-4 text-slate-500">
          &copy; {new Date().getFullYear()} Salon POS Systems. All Rights Reserved.
        </div>
      </footer>

    </div>
  );
}