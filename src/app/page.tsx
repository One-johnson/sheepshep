"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { HeroCarousel } from "@/components/landing/hero-carousel";
import { Features } from "@/components/landing/features";
import { FAQ } from "@/components/landing/faq";
import { Footer } from "@/components/landing/footer";
import { ThemeToggle } from "@/components/auth/theme-toggle";
import { LogIn, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";

const fadeInUpView = {
  initial: { opacity: 0, y: 32 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-48px" },
  transition: { duration: 0.5 },
};

function HeaderThemeToggle() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  // Same element type on server and client until mount to avoid hydration mismatch
  if (!mounted) {
    return <div className="size-9 shrink-0" aria-hidden />;
  }
  return <ThemeToggle />;
}

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header with Theme Toggle */}
      <motion.header
        className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="container flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          <a href="/" className="flex items-center gap-2">
            <Image
              src="/logo.png"
              alt="SheepShep"
              width={200}
              height={200}
              className="h-16 w-auto object-contain"
              priority
            />
          </a>
          <HeaderThemeToggle />
        </div>
      </motion.header>

      {/* Hero Section with Carousel */}
      <motion.section
        className="w-full py-16"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.1 }}
      >
        <HeroCarousel />
      </motion.section>

      {/* CTA Section */}
      <motion.section
        className="px-4 py-16 sm:px-6 lg:px-8 bg-primary/5"
        {...fadeInUpView}
      >
        <div className="mx-auto max-w-4xl text-center">
          <motion.h2
            className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-50 sm:text-4xl"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
          >
            Ready to Get Started?
          </motion.h2>
          <motion.p
            className="mt-4 text-lg text-gray-600 dark:text-gray-400"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            Join our community of shepherds, pastors, and administrators working together to care for God&apos;s flock.
          </motion.p>
          <motion.div
            className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <Button size="lg" asChild>
              <Link href="/register">
                <UserPlus className="mr-2 h-5 w-5" />
                Register as Shepherd
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/login">
                <LogIn className="mr-2 h-5 w-5" />
                Login to Your Account
              </Link>
            </Button>
          </motion.div>
        </div>
      </motion.section>

      {/* Features Section */}
      <Features />

      {/* FAQ Section */}
      <FAQ />

      {/* Footer */}
      <Footer />
    </div>
  );
}
