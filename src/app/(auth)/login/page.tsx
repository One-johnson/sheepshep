"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import { api } from "../../../../convex/_generated/api";
import { Mail, Lock, Loader2, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { motion } from "framer-motion";
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
  rememberEmail: z.boolean().optional(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const REMEMBER_EMAIL_KEY = "sheepshep_remember_email";

function getRedirectPath(searchParams: URLSearchParams | null): string {
  if (!searchParams) return "/dashboard";
  const redirect = searchParams.get("redirect");
  if (typeof redirect === "string" && redirect.startsWith("/") && !redirect.startsWith("//")) {
    return redirect;
  }
  return "/dashboard";
}

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const passwordInputRef = useRef<HTMLInputElement>(null);

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
    mode: "onTouched",
    defaultValues: { email: "", password: "", rememberEmail: false },
  });

  useEffect(() => {
    try {
      const remembered = localStorage.getItem(REMEMBER_EMAIL_KEY);
      if (remembered && typeof remembered === "string") {
        form.setValue("email", remembered);
        form.setValue("rememberEmail", true);
      }
    } catch {
      // ignore
    }
  }, [form]);

  const onSubmit = async (values: LoginFormValues) => {
    setIsLoading(true);
    try {
      const result = await login({
        email: values.email,
        password: values.password,
      });

      if (result.token && result.user) {
        try {
          if (values.rememberEmail) {
            localStorage.setItem(REMEMBER_EMAIL_KEY, values.email);
          } else {
            localStorage.removeItem(REMEMBER_EMAIL_KEY);
          }
        } catch {
          // ignore
        }
        setSessionCookie(result.token);
        const randomScripture =
          authScriptures[Math.floor(Math.random() * authScriptures.length)];
        toast.success("Login successful!", {
          description: `"${randomScripture.verse}" - ${randomScripture.reference}`,
          duration: 5000,
        });
        setIsRedirecting(true);
        router.push(getRedirectPath(searchParams));
      }
    } catch (error: unknown) {
      const data = error instanceof ConvexError ? (error.data as { code?: string; message?: string }) : null;
      const code = data?.code;
      const message =
        typeof data?.message === "string"
          ? data.message
          : error instanceof Error
            ? error.message
            : "Failed to login. Please try again.";

      if (code === "ACCOUNT_LOCKED" || code === "LOCKOUT" || /lockout|locked|too many attempt/i.test(message)) {
        toast.error("Too many failed attempts", {
          description: "Please try again in a few minutes or contact support.",
          duration: 6000,
        });
      } else {
        toast.error(message);
      }

      if (code === "INVALID_CREDENTIALS" || message.toLowerCase().includes("invalid")) {
        form.setValue("password", "");
        setTimeout(() => passwordInputRef.current?.focus(), 100);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fillDemoCredentials = () => {
    form.setValue("email", "demo@sheepshep.demo");
    form.setValue("password", "Demo123!");
    toast.info("Demo credentials filled", {
      description: "Sign in if this account exists, or use your own credentials.",
    });
  };

  const isDev = typeof process !== "undefined" && process.env.NODE_ENV === "development";
  const isFormDisabled = isLoading || isRedirecting;

  return (
    <AuthLayout scripture={defaultAuthScripture}>
      <div className="flex w-full lg:w-1/2 flex-col justify-center px-6 py-8 sm:px-12 lg:px-16">
        <div className="mx-auto w-full max-w-sm space-y-6">
          <motion.div
            className="relative overflow-hidden rounded-xl border-2 border-primary/20 bg-primary/5 dark:bg-primary/10"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
          >
            <div className="embla" ref={emblaRef}>
              <div className="embla__container flex">
                {authScriptures.map((scripture, index) => (
                  <div
                    key={index}
                    className="embla__slide min-w-0 flex-shrink-0 flex-grow-0 basis-full"
                  >
                    <div className="p-4 text-center">
                      <p className="text-sm italic text-foreground/90 leading-relaxed">
                        &quot;{scripture.verse}&quot;
                      </p>
                      <p className="mt-2 text-xs font-semibold text-muted-foreground">
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
                      ? "w-6 bg-primary"
                      : "w-1.5 bg-primary/40"
                  )}
                  onClick={() => scrollTo(index)}
                  aria-label={`Go to scripture ${index + 1}`}
                />
              ))}
            </div>
          </motion.div>

          <motion.div
            className="space-y-2 text-center lg:text-left"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.05 }}
          >
            <h1 className="text-3xl font-bold tracking-tight">Welcome back</h1>
            <p className="text-muted-foreground">
              Sign in to your account to continue
            </p>
          </motion.div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <fieldset className="space-y-6" disabled={isFormDisabled}>
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
                            className="pl-10 rounded-lg"
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
                          className="text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                          onClick={() => setForgotPasswordOpen(true)}
                          tabIndex={isFormDisabled ? -1 : 0}
                        >
                          Forgot password?
                        </button>
                      </div>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            {...field}
                            ref={(el) => {
                              (passwordInputRef as React.MutableRefObject<HTMLInputElement | null>).current = el;
                              field.ref(el);
                            }}
                            type={showPassword ? "text" : "password"}
                            placeholder="Enter your password"
                            className="pl-10 pr-10 rounded-lg"
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

                <FormField
                  control={form.control}
                  name="rememberEmail"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center gap-2 space-y-0">
                      <FormControl>
                        <input
                          id="rememberEmail"
                          type="checkbox"
                          className="h-4 w-4 rounded border-input accent-primary"
                          checked={!!field.value}
                          onChange={(e) => field.onChange(e.target.checked)}
                          onBlur={field.onBlur}
                          aria-label="Remember my email"
                        />
                      </FormControl>
                      <FormLabel htmlFor="rememberEmail" className="font-normal text-muted-foreground cursor-pointer">
                        Remember my email
                      </FormLabel>
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full rounded-lg"
                  disabled={isFormDisabled}
                >
                  {isRedirecting ? (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Redirecting...
                    </>
                  ) : isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    "Sign in"
                  )}
                </Button>
              </fieldset>
            </form>
          </Form>

          {isDev && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-center"
            >
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full rounded-lg text-muted-foreground"
                onClick={fillDemoCredentials}
                disabled={isFormDisabled}
              >
                Try demo credentials
              </Button>
            </motion.div>
          )}

          <motion.div
            className="text-center text-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
          >
            <span className="text-muted-foreground">Don&apos;t have an account? </span>
            <Link
              href="/register"
              className="font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
            >
              Sign up
            </Link>
          </motion.div>
        </div>
      </div>

      <ForgotPasswordDialog
        open={forgotPasswordOpen}
        onOpenChange={setForgotPasswordOpen}
      />
    </AuthLayout>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <AuthLayout scripture={defaultAuthScripture}>
          <div className="flex w-full lg:w-1/2 flex-col justify-center items-center px-6 py-8 min-h-[40vh]">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden />
          </div>
        </AuthLayout>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
