"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import { api } from "../../../../convex/_generated/api";
import { Mail, Lock, Loader2 } from "lucide-react";
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
import { PasswordToggle } from "@/components/auth/password-toggle";
import { AuthLayout } from "@/components/auth/auth-layout";
import { ForgotPasswordDialog } from "@/components/auth/forgot-password-dialog";
import { toast } from "sonner";
import { authScriptures, defaultAuthScripture } from "@/lib/auth-scriptures";
import { setSessionCookie } from "@/lib/session";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);

  const login = useMutation(api.auth.login);

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

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setIsLoading(true);
    try {
      const result = await login({
        email: values.email,
        password: values.password,
      });

      if (result.token && result.user) {
        setSessionCookie(result.token);
        const randomScripture =
          authScriptures[Math.floor(Math.random() * authScriptures.length)];
        toast.success("Login successful!", {
          description: `"${randomScripture.verse}" - ${randomScripture.reference}`,
          duration: 5000,
        });
        router.push("/dashboard");
      }
    } catch (error: unknown) {
      const message =
        error instanceof ConvexError &&
        typeof (error.data as { message?: string })?.message === "string"
          ? (error.data as { message: string }).message
          : error instanceof Error
            ? error.message
            : "Failed to login. Please try again.";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout scripture={defaultAuthScripture}>
      <div className="flex w-full lg:w-1/2 flex-col justify-center px-6 py-8 sm:px-12 lg:px-16">
        <div className="mx-auto w-full max-w-sm space-y-6">
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
                    <div className="flex items-center justify-between">
                      <FormLabel>Password</FormLabel>
                      <button
                        type="button"
                        className="text-xs font-medium text-primary hover:underline"
                        onClick={() => setForgotPasswordOpen(true)}
                      >
                        Forgot password?
                      </button>
                    </div>
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

      <ForgotPasswordDialog
        open={forgotPasswordOpen}
        onOpenChange={setForgotPasswordOpen}
      />
    </AuthLayout>
  );
}
