"use client";

import Image from "next/image";

interface AuthBrandingProps {
  scripture?: {
    verse: string;
    reference: string;
  };
}

export function AuthBranding({ scripture }: AuthBrandingProps) {
  const defaultScripture = scripture || {
    verse: "I am the good shepherd. The good shepherd lays down his life for the sheep.",
    reference: "John 10:11",
  };

  return (
    <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-start pt-16 pb-12 px-12 relative overflow-hidden rounded-r-xl border-l border-border bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-950/30 dark:via-indigo-950/30 dark:to-purple-950/30">
      {/* Decorative blur orbs */}
      <div className="absolute inset-0 opacity-30 dark:opacity-20">
        <div className="absolute top-20 left-20 w-72 h-72 bg-blue-400 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-400 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md space-y-8 text-center">
        {/* Logo/Brand */}
        <div className="space-y-4">
          <div className="relative w-full max-w-sm mx-auto aspect-[4/3]">
            <Image
              src="/logo.png"
              alt="SheepShep"
              fill
              className="object-contain"
              priority
            />
          </div>
          <p className="text-lg text-muted-foreground">
            Leading and caring for God&apos;s flock
          </p>
        </div>

        {/* Scripture */}
        <div className="space-y-3 pt-8 border-t border-border">
          <p className="text-lg italic text-foreground/90 leading-relaxed">
            &quot;{defaultScripture.verse}&quot;
          </p>
          <p className="text-sm font-semibold text-muted-foreground">
            {defaultScripture.reference}
          </p>
        </div>

        {/* Additional text */}
        <p className="text-sm text-muted-foreground pt-4">
          A comprehensive church management system designed to help shepherds, pastors, and administrators
          care for and manage their congregation with love and efficiency.
        </p>
      </div>
    </div>
  );
}
