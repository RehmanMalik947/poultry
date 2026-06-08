import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginFormValues } from "../../utils/validation";
import { Link, useNavigate } from "react-router";
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
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { toast } from "sonner";
import { API_BASE } from "../../../api/ApiService";


const LAST_LOGIN_KEY = "lastLogin";

export function Login() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    mode: "onChange",
    defaultValues: { login: "", password: "" },
  });
  useEffect(() => {
    const last = localStorage.getItem(LAST_LOGIN_KEY);
    if (last) form.setValue("login", last);
  }, [form]);

  async function onSubmit(values: LoginFormValues) {
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          login: values.login.trim(),
          password: values.password,
        }),
      });
      let data: {
        success?: boolean;
        message?: string;
        data?: {
          isStaff: any;
          token: string;
          isSuperAdmin?: boolean;
          user?: unknown;
          organization?: unknown;
        };
      };
      try {
        data = await res.json();
      } catch {
        setError(
          "Server not responding correctly. Is the backend running? Start it with: cd backend then npm start (port 3000)."
        );
        return;
      }
      if (!data.success) {
        setError(data.message || "Login failed");
        return;
      }
      if (!data.data?.token) {
        setError("Invalid response from server.");
        return;
      }
      localStorage.setItem("token", data.data.token);
      if (values.login?.trim()) localStorage.setItem(LAST_LOGIN_KEY, values.login.trim());
      const user = data.data.user as { role?: string; permissions?: string[] } | undefined;
      if (data.data.user) localStorage.setItem("user", JSON.stringify(data.data.user));
      if (data.data.organization) localStorage.setItem("organization", JSON.stringify(data.data.organization));
      if (Array.isArray(user?.permissions)) {
        localStorage.setItem("permissions", JSON.stringify(user.permissions));
      } else {
        localStorage.removeItem("permissions");
      }
      if (data.data.isSuperAdmin) {
        localStorage.setItem("isSuperAdmin", "true");
        localStorage.removeItem("isStaff");
        localStorage.setItem("role", "super_admin");
        navigate("/super-admin", { replace: true });
      } else if (data.data.isStaff) {
        localStorage.removeItem("isSuperAdmin");
        localStorage.setItem("isStaff", "true");
        localStorage.setItem("role", user?.role ?? "Staff");
        navigate("/", { replace: true });
      } else {
        localStorage.removeItem("isSuperAdmin");
        localStorage.removeItem("isStaff");
        localStorage.setItem("role", user?.role ?? "USER");
        navigate("/", { replace: true });
      }
    } catch (err) {
      setError(
        "Cannot connect to server. Start the backend: open a terminal, run cd backend then npm start (port 3000), then try again."
      );
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
            <CardTitle className="text-2xl font-semibold">Sign in</CardTitle>
            <CardDescription>
              Enter your username or email and password to access your dashboard
            </CardDescription>
          </div>
        </CardHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit, () => {
              setError("Please fill the form completely.");
              toast.error("Please fill the form completely.");
            })}
          >
            <CardContent className="space-y-4">
              {error && (
                <p className="text-sm text-destructive bg-destructive/10 p-2 rounded-md">{error}</p>
              )}
              <FormField
                control={form.control}
                name="login"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username or Email</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="Username or email"
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
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Enter your password"
                        autoComplete="current-password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter className="flex flex-col gap-4 pt-6">
              <Button type="submit" className="w-full" size="lg">
                Sign in
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                Don&apos;t have an account?{" "}
                <Link
                  to="/signup"
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  Sign up
                </Link>
              </p>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}
