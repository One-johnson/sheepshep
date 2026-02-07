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

        {/* Shepherd Illustration Placeholder */}
        <div className="relative w-full aspect-square max-w-sm mx-auto">
          <div className="absolute inset-0 flex items-center justify-center">
            {/* Placeholder for shepherd image - you can replace this with an actual image */}
            <div className="w-full h-full rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 flex items-center justify-center border-2 border-blue-200 dark:border-blue-800">
              <svg
                className="w-3/4 h-3/4 text-blue-400 dark:text-blue-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
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
