"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import { api } from "../../../../convex/_generated/api";
import {
  Mail,
  Lock,
  User,
  Phone,
  Loader2,
  MessageCircle,
} from "lucide-react";
import Link from "next/link";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { PasswordToggle } from "@/components/auth/password-toggle";
import { PasswordStrength } from "@/components/auth/password-strength";
import { AuthLayout } from "@/components/auth/auth-layout";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";
import { authScriptures, defaultAuthScripture } from "@/lib/auth-scriptures";

const passwordRequirements = [
  { text: "At least 8 characters", id: "length" },
  { text: "One uppercase letter", id: "uppercase" },
  { text: "One lowercase letter", id: "lowercase" },
  { text: "One number", id: "number" },
  { text: "One special character", id: "special" },
];

const registerSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Please enter a valid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number")
      .regex(/[^a-zA-Z0-9]/, "Password must contain at least one special character"),
    confirmPassword: z.string(),
    phone: z.string().optional(),
    whatsappNumber: z.string().optional(),
    preferredName: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showApprovalAlert, setShowApprovalAlert] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [registrationStatus, setRegistrationStatus] = useState<{
    status: "pending" | "approved";
    message: string;
  } | null>(null);

  const register = useMutation(api.auth.register);

  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true, duration: 20 },
    [Autoplay({ delay: 5000, stopOnInteraction: false })]
  );

  const scrollTo = useCallback(
    (index: number) => {
      if (emblaApi) emblaApi.scrollTo(index);
    },
    [emblaApi]
  );

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setSelectedIndex(emblaApi.selectedScrollSnap());
    emblaApi.on("select", onSelect);
    onSelect();
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi]);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      phone: "",
      whatsappNumber: "",
      preferredName: "",
    },
  });

  const password = form.watch("password");

  const checkPasswordRequirement = (requirement: string): boolean => {
    if (!password) return false;
    switch (requirement) {
      case "length":
        return password.length >= 8;
      case "uppercase":
        return /[A-Z]/.test(password);
      case "lowercase":
        return /[a-z]/.test(password);
      case "number":
        return /[0-9]/.test(password);
      case "special":
        return /[^a-zA-Z0-9]/.test(password);
      default:
        return false;
    }
  };

  const onSubmit = async (values: RegisterFormValues) => {
    setIsLoading(true);
    try {
      const result = await register({
        email: values.email,
        password: values.password,
        name: values.name,
        role: "shepherd", // Only shepherds can register via this form
        phone: values.phone || undefined,
        whatsappNumber: values.whatsappNumber || undefined,
        preferredName: values.preferredName || undefined,
      });

      // Check if this was the first admin (auto-approved)
      if (result.isFirstAdmin) {
        toast.success("First admin account created successfully! You can now log in.");
        router.push("/login");
      } else if (result.status === "pending") {
        // Shepherd registration requires approval
        setRegistrationStatus({
          status: "pending",
          message: result.message || "Registration request submitted for approval",
        });
        setShowApprovalAlert(true);
        form.reset();
      } else {
        // Direct registration (shouldn't happen for shepherd, but handle it)
        toast.success("Account created successfully!");
        router.push("/login");
      }
    } catch (error: unknown) {
      const message =
        error instanceof ConvexError &&
        typeof (error.data as { message?: string })?.message === "string"
          ? (error.data as { message: string }).message
          : error instanceof Error
            ? error.message
            : "Failed to register. Please try again.";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout scripture={defaultAuthScripture}>
      <div className="flex w-full lg:w-1/2 flex-col justify-center px-6 py-12 sm:px-12 lg:px-16 overflow-y-auto">
        <div className="mx-auto w-full max-w-sm space-y-8">
          {/* Scripture Carousel */}
          <div className="relative overflow-hidden rounded-lg border-2 border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-800">
            <div className="embla" ref={emblaRef}>
              <div className="embla__container flex">
                {authScriptures.map((scripture, index) => (
                  <div
                    key={index}
                    className="embla__slide min-w-0 flex-shrink-0 flex-grow-0 basis-full"
                  >
                    <div className="p-4 text-center">
                      <p className="text-sm italic text-blue-900 dark:text-blue-100 leading-relaxed">
                        &quot;{scripture.verse}&quot;
                      </p>
                      <p className="mt-2 text-xs font-semibold text-blue-700 dark:text-blue-300">
                        {scripture.reference}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
              {authScriptures.map((_, index) => (
                <button
                  key={index}
                  className={cn(
                    "h-1.5 rounded-full transition-all",
                    index === selectedIndex
                      ? "w-6 bg-blue-700 dark:bg-blue-300"
                      : "w-1.5 bg-blue-400/50 dark:bg-blue-600/50"
                  )}
                  onClick={() => scrollTo(index)}
                  aria-label={`Go to scripture ${index + 1}`}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2 text-center lg:text-left">
            <h2 className="text-3xl font-bold tracking-tight">Create an account</h2>
            <p className="text-muted-foreground">
              Register as a shepherd (admin approval required)
            </p>
          </div>

          {/* Approval Alert */}
          {showApprovalAlert && registrationStatus?.status === "pending" && (
            <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800">
              <CheckCircle2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <AlertTitle className="text-blue-900 dark:text-blue-100">
                Registration Submitted
              </AlertTitle>
              <AlertDescription className="text-blue-800 dark:text-blue-200 space-y-3 mt-2">
                <p>
                  Your account registration has been submitted and is pending approval
                  by an administrator or pastor.
                </p>
                <div className="pt-2 border-t border-blue-200 dark:border-blue-800">
                  <p className="text-sm italic text-blue-700 dark:text-blue-300">
                    &quot;For I know the plans I have for you,&quot; declares the Lord,
                    &quot;plans to prosper you and not to harm you, plans to give you
                    hope and a future.&quot;
                  </p>
                  <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mt-1">
                    Jeremiah 29:11
                  </p>
                </div>
                <p className="text-sm pt-2">
                  You will be notified once your account has been approved. You can then
                  sign in to access the system.
                </p>
                <Button
                  variant="outline"
                  className="w-full mt-4 border-blue-300 dark:border-blue-700"
                  onClick={() => {
                    setShowApprovalAlert(false);
                    router.push("/login");
                  }}
                >
                  Go to Login
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {!showApprovalAlert && (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            {...field}
                            type="text"
                            placeholder="Enter your full name"
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
                  name="preferredName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preferred Name (Optional)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            {...field}
                            type="text"
                            placeholder="What should we call you?"
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
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number (Optional)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            {...field}
                            type="tel"
                            placeholder="Enter your phone number"
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
                  name="whatsappNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>WhatsApp Number (Optional)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <MessageCircle className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            {...field}
                            type="tel"
                            placeholder="Enter your WhatsApp number"
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
                            placeholder="Create a password"
                            className="pl-10 pr-10"
                            disabled={isLoading}
                          />
                          <PasswordToggle
                            show={showPassword}
                            onToggle={() => setShowPassword(!showPassword)}
                          />
                        </div>
                      </FormControl>
                      <PasswordStrength password={password || ""} className="mt-2" />
                      <div className="text-xs space-y-1 mt-2 text-muted-foreground">
                        <p className="font-medium">Password requirements:</p>
                        <ul className="space-y-1">
                          {passwordRequirements.map((req) => (
                            <li
                              key={req.id}
                              className={`flex items-center gap-2 text-xs ${
                                checkPasswordRequirement(req.id)
                                  ? "text-green-600 dark:text-green-400"
                                  : "text-muted-foreground"
                              }`}
                            >
                              <span>
                                {checkPasswordRequirement(req.id) ? "✓" : "○"}
                              </span>
                              {req.text}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            {...field}
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="Confirm your password"
                            className="pl-10 pr-10"
                            disabled={isLoading}
                          />
                          <PasswordToggle
                            show={showConfirmPassword}
                            onToggle={() =>
                              setShowConfirmPassword(!showConfirmPassword)
                            }
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    "Create account"
                  )}
                </Button>
              </form>
            </Form>
          )}

          <div className="text-center text-sm">
            <span className="text-muted-foreground">Already have an account? </span>
            <Link
              href="/login"
              className="font-medium text-primary hover:underline"
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
}
