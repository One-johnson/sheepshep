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
    <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-950/20 dark:via-indigo-950/20 dark:to-purple-950/20 p-12 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-20 w-72 h-72 bg-blue-400 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-400 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md space-y-8 text-center">
        {/* Logo/Brand */}
        <div className="space-y-4">
          <h1 className="text-5xl font-bold text-gray-900 dark:text-gray-50">
            Sheep<span className="text-blue-600 dark:text-blue-400">Shep</span>
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Leading and caring for God&apos;s flock
          </p>
        </div>

        {/* Shepherd Illustration */}
        <div className="relative w-full aspect-square max-w-sm mx-auto">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-full h-full rounded-2xl overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=800&h=800&fit=crop&q=80"
                alt="Shepherd leading sheep"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-indigo-600/20 to-purple-600/20 dark:from-blue-900/30 dark:via-indigo-900/30 dark:to-purple-900/30" />
            </div>
          </div>
        </div>

        {/* Scripture */}
        <div className="space-y-3 pt-8 border-t border-gray-200 dark:border-gray-800">
          <p className="text-lg italic text-gray-700 dark:text-gray-300 leading-relaxed">
            &quot;{defaultScripture.verse}&quot;
          </p>
          <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">
            {defaultScripture.reference}
          </p>
        </div>

        {/* Additional text */}
        <p className="text-sm text-gray-500 dark:text-gray-500 pt-4">
          A comprehensive church management system designed to help shepherds, pastors, and administrators
          care for and manage their congregation with love and efficiency.
        </p>
      </div>
    </div>
  );
}
