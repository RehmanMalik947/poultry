import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signupOrganizationSchema, type SignupOrganizationFormValues } from "../../utils/validation";
import { Link } from "react-router";
import { Scissors } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../../components/ui/form";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { toast } from "sonner";
import { API_BASE } from "../../../api/ApiService";

const INDUSTRY_OPTIONS = [
  { value: "salon", label: "Salon" },
  { value: "spa", label: "Spa" },
  { value: "barbershop", label: "Barbershop" },
  { value: "beauty", label: "Beauty" },
  { value: "wellness", label: "Wellness" },
  { value: "other", label: "Other" },
];

const TIMEZONE_OPTIONS = [
  { value: "UTC", label: "UTC" },
  { value: "Asia/Karachi", label: "Asia/Karachi (PKT)" },
  { value: "Asia/Dubai", label: "Asia/Dubai (GST)" },
  { value: "Asia/Kolkata", label: "Asia/Kolkata (IST)" },
  { value: "Europe/London", label: "Europe/London (GMT/BST)" },
  { value: "Europe/Paris", label: "Europe/Paris (CET)" },
  { value: "America/New_York", label: "America/New_York (EST)" },
  { value: "America/Los_Angeles", label: "America/Los_Angeles (PST)" },
];



export function Signup() {
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const form = useForm<SignupOrganizationFormValues>({
    resolver: zodResolver(signupOrganizationSchema),
    mode: "onChange",
    defaultValues: {
      organizationName: "",
      username: "",
      email: "",
      phone: "",
      emergencyContact: "",
      address: "",
      totalEmployees: 0,
      industryCategory: "",
      timezone: "UTC",
    },
  });

  async function onSubmit(values: SignupOrganizationFormValues) {
    setMessage(null);
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationName: values.organizationName.trim(),
          username: values.username.trim(),
          email: values.email.trim(),
          phone: values.phone.trim(),
          emergencyContact: values.emergencyContact || undefined,
          address: values.address || undefined,
          totalEmployees: values.totalEmployees || undefined,
          industryCategory: values.industryCategory || undefined,
          timezone: values.timezone || "UTC",
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setMessage({ type: "error", text: data.message || "Registration failed" });
        return;
      }
      setMessage({
        type: "success",
        text: data.message || "Account created. Check your email for login credentials.",
      });
      form.reset();
    } catch (err) {
      setMessage({ type: "error", text: "Network error. Please try again." });
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4 overflow-hidden">
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0" aria-hidden>
        <div className="flex flex-col items-center gap-4 opacity-[0.06] dark:opacity-[0.08]">
          <Scissors className="w-48 h-48 text-gray-600 dark:text-gray-400" strokeWidth={1.5} />
          <span className="text-4xl font-bold text-gray-600 dark:text-gray-400 tracking-tight">Salon Pro</span>
        </div>
      </div>
      <Card className="relative z-10 w-full max-w-md border shadow-lg bg-card/95 backdrop-blur-sm">
        <CardHeader className="space-y-4 text-center">
          <div className="flex justify-center">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-600 rounded-xl">
                <Scissors className="w-7 h-7 text-white" />
              </div>
              <div className="text-left">
                <h1 className="font-bold text-xl text-gray-900 dark:text-gray-100">Salon Pro</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Management System</p>
              </div>
            </div>
          </div>
          <div className="space-y-1">
            <CardTitle className="text-2xl font-semibold">Create Organization</CardTitle>
            <CardDescription>
              Enter your organization details. We&apos;ll send login credentials to your email.
            </CardDescription>
          </div>
        </CardHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
          >
            <CardContent className="space-y-4">
              {message && (
                <p
                  className={`text-sm p-2 rounded-md ${
                    message.type === "success"
                      ? "text-green-700 bg-green-100 dark:text-green-300 dark:bg-green-900/30"
                      : "text-destructive bg-destructive/10"
                  }`}
                >
                  {message.text}
                </p>
              )}
              <FormField
                control={form.control}
                name="organizationName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Organization Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Acme Corporation" autoComplete="organization" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="username"
                        autoComplete="username"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email *</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="admin@yourcompany.com"
                        autoComplete="email"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone *</FormLabel>
                    <FormControl>
                      <Input placeholder="+92 300 1234567" autoComplete="tel" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="emergencyContact"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Emergency Contact</FormLabel>
                    <FormControl>
                      <Input placeholder="Optional" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Input placeholder="Office #, Street, City" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="totalEmployees"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Employees</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} placeholder="e.g. 25" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="industryCategory"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Industry Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || undefined}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {INDUSTRY_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="timezone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Timezone</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || "UTC"}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select timezone" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {TIMEZONE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter className="flex flex-col gap-4 pt-6">
              <Button type="submit" className="w-full" size="lg" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Creating..." : "Create Organization"}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link
                  to="/login"
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  Sign in
                </Link>
              </p>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}
