"use client";

import Image from "next/image";
import { Heart } from "lucide-react";
import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t bg-background">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          {/* Brand */}
          <div className="space-y-4">
            <Link href="/" className="inline-block">
              <Image
                src="/logo.png"
                alt="SheepShep"
                width={200}
                height={200}
                className="h-20 w-auto object-contain"
              />
            </Link>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Leading and caring for God&apos;s flock with comprehensive church management.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-gray-50 mb-4">
              Quick Links
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="#features"
                  className="text-gray-600 hover:text-primary dark:text-gray-400 dark:hover:text-primary transition-colors"
                >
                  Features
                </Link>
              </li>
              <li>
                <Link
                  href="#faq"
                  className="text-gray-600 hover:text-primary dark:text-gray-400 dark:hover:text-primary transition-colors"
                >
                  FAQ
                </Link>
              </li>
              <li>
                <Link
                  href="/login"
                  className="text-gray-600 hover:text-primary dark:text-gray-400 dark:hover:text-primary transition-colors"
                >
                  Login
                </Link>
              </li>
              <li>
                <Link
                  href="/register"
                  className="text-gray-600 hover:text-primary dark:text-gray-400 dark:hover:text-primary transition-colors"
                >
                  Register
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-gray-50 mb-4">
              Resources
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <span className="text-gray-600 dark:text-gray-400">
                  Documentation
                </span>
              </li>
              <li>
                <span className="text-gray-600 dark:text-gray-400">
                  Support
                </span>
              </li>
              <li>
                <span className="text-gray-600 dark:text-gray-400">
                  Privacy Policy
                </span>
              </li>
              <li>
                <span className="text-gray-600 dark:text-gray-400">
                  Terms of Service
                </span>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-gray-50 mb-4">
              Contact
            </h4>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li>Email: support@sheepshep.com</li>
              <li>Phone: +233 XX XXX XXXX</li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 text-center sm:text-left">
            © {new Date().getFullYear()} SheepShep. All rights reserved.
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
            Built with <Heart className="h-4 w-4 text-red-500 fill-red-500" /> by{" "}
            <span className="font-semibold text-primary">FlowRiver Technologies</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
