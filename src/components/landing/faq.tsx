"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const faqs = [
  {
    question: "Who can register for SheepShep?",
    answer: "Currently, only shepherds can register through the registration form. After registration, your account will be reviewed and approved by an administrator or pastor. Once approved, you can access the system. Admins can create accounts for pastors and other admins directly.",
  },
  {
    question: "How do I get approved after registering as a shepherd?",
    answer: "After you register, your registration request will be sent to administrators and pastors for review. You'll receive a notification once your account has been approved. You can then log in to access the system.",
  },
  {
    question: "What can shepherds do in the system?",
    answer: "Shepherds can add and manage members, mark attendance, create reports on visitations and prayers, send prayer requests, view assigned members, and participate in groups and events.",
  },
  {
    question: "How does attendance tracking work?",
    answer: "Shepherds can mark attendance for members and submit it for review. Pastors or admins can then approve or reject attendance records. The system also automatically tracks at-risk members who haven't attended in a while.",
  },
  {
    question: "Can I create groups and events?",
    answer: "Yes! Admins, pastors, and shepherds can create groups (like bacenta, bible study groups, choirs) and events (prayer meetings, evangelism days, etc.). Members can be added to multiple groups.",
  },
  {
    question: "How do prayer requests work?",
    answer: "Shepherds can send prayer requests for members to other shepherds, pastors, or admins. Recipients can respond to prayer requests, and the system tracks the status of each request.",
  },
  {
    question: "Is my data secure?",
    answer: "Yes, we use secure authentication and role-based access control. Only authorized users can access member information based on their role and permissions.",
  },
  {
    question: "Can I export data?",
    answer: "Yes, the system supports CSV and PDF exports for members, attendance records, and reports, making it easy to create backups and generate reports.",
  },
];

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="py-24 px-4 sm:px-6 lg:px-8 bg-muted/50">
      <div className="mx-auto max-w-3xl">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-50 sm:text-4xl">
            Frequently Asked Questions
          </h2>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
            Everything you need to know about SheepShep
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="rounded-lg border bg-card text-card-foreground shadow-sm"
            >
              <button
                className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-muted/50 transition-colors"
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                aria-expanded={openIndex === index}
              >
                <span className="font-semibold text-gray-900 dark:text-gray-50">
                  {faq.question}
                </span>
                <ChevronDown
                  className={cn(
                    "h-5 w-5 text-muted-foreground transition-transform flex-shrink-0 ml-4",
                    openIndex === index && "rotate-180"
                  )}
                />
              </button>
              {openIndex === index && (
                <div className="px-6 pb-4 pt-0">
                  <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
