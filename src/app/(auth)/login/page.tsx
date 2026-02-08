"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Mail, Lock, Loader2, Home } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { PasswordToggle } from "@/components/auth/password-toggle";
import { AuthBranding } from "@/components/auth/auth-branding";
import { ThemeToggle } from "@/components/auth/theme-toggle";
import { toast } from "sonner";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const loginScriptures = [
  {
    verse: "Come to me, all you who are weary and burdened, and I will give you rest.",
    reference: "Matthew 11:28",
  },
  {
    verse: "I am the good shepherd. The good shepherd lays down his life for the sheep.",
    reference: "John 10:11",
  },
  {
    verse: "He tends his flock like a shepherd: He gathers the lambs in his arms and carries them close to his heart.",
    reference: "Isaiah 40:11",
  },
];

const loginScripture = {
  verse: "Come to me, all you who are weary and burdened, and I will give you rest.",
  reference: "Matthew 11:28",
};

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentScriptureIndex, setCurrentScriptureIndex] = useState(0);

  const login = useMutation(api.auth.login);

  // Rotate scriptures every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentScriptureIndex((prev) => (prev + 1) % loginScriptures.length);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setIsLoading(true);
    try {
      const result = await login({
        email: values.email,
        password: values.password,
      });

      if (result.token && result.user) {
        // Store token in localStorage
        localStorage.setItem("authToken", result.token);
        const randomScripture = loginScriptures[Math.floor(Math.random() * loginScriptures.length)];
        toast.success("Login successful!", {
          description: `"${randomScripture.verse}" - ${randomScripture.reference}`,
          duration: 5000,
        });
        router.push("/dashboard");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to login. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen relative">
      {/* Theme Toggle - Fixed position */}
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      {/* Back to Home Button */}
      <div className="fixed top-4 left-4 z-50">
        <Button variant="outline" size="sm" asChild>
          <Link href="/">
            <Home className="mr-2 h-4 w-4" />
            Back to Home
          </Link>
        </Button>
      </div>

      {/* Left Side - Login Form */}
      <div className="flex w-full lg:w-1/2 flex-col justify-center px-6 py-8 sm:px-12 lg:px-16">
        <div className="mx-auto w-full max-w-sm space-y-6">
          {/* Scripture */}
          <div className="rounded-lg border-2 border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-800 p-4 text-center transition-all duration-500">
            <p className="text-sm italic text-blue-900 dark:text-blue-100 leading-relaxed">
              &quot;{loginScriptures[currentScriptureIndex].verse}&quot;
            </p>
            <p className="mt-2 text-xs font-semibold text-blue-700 dark:text-blue-300">
              {loginScriptures[currentScriptureIndex].reference}
            </p>
          </div>

          <div className="space-y-2 text-center lg:text-left">
            <h2 className="text-3xl font-bold tracking-tight">Welcome back</h2>
            <p className="text-muted-foreground">
              Sign in to your account to continue
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          {...field}
                          type="email"
                          placeholder="Enter your email"
                          className="pl-10"
                          disabled={isLoading}
                        />
                      </div>
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
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          {...field}
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter your password"
                          className="pl-10 pr-10"
                          disabled={isLoading}
                        />
                        <PasswordToggle
                          show={showPassword}
                          onToggle={() => setShowPassword(!showPassword)}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign in"
                )}
              </Button>
            </form>
          </Form>

          <div className="text-center text-sm">
            <span className="text-muted-foreground">Don&apos;t have an account? </span>
            <Link
              href="/register"
              className="font-medium text-primary hover:underline"
            >
              Sign up
            </Link>
          </div>
        </div>
      </div>

      {/* Right Side - Branding */}
      <AuthBranding scripture={loginScripture} />
    </div>
  );
}
