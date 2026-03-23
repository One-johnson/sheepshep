"use client";

import { motion } from "framer-motion";
import { Users, Calendar, FileText, Bell, BarChart3, Shield, Heart, MessageCircle } from "lucide-react";
import { Card } from "@/components/ui/card";

const container = {
  hidden: { opacity: 0 },
  visible: (i = 1) => ({
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.04 * i },
  }),
};

const item = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4 },
  },
};

const features = [
  {
    icon: Users,
    title: "Member Management",
    description: "Comprehensive member profiles with photos, contact information, and detailed records.",
    iconBg: "bg-blue-500/15",
    iconColor: "text-blue-600 dark:text-blue-400",
  },
  {
    icon: Calendar,
    title: "Attendance Tracking",
    description: "Track member attendance with review and approval workflows, plus automated risk alerts.",
    iconBg: "bg-emerald-500/15",
    iconColor: "text-emerald-600 dark:text-emerald-400",
  },
  {
    icon: FileText,
    title: "Reports & Assignments",
    description: "Assign members to shepherds for visitation and prayer, with detailed reporting system.",
    iconBg: "bg-amber-500/15",
    iconColor: "text-amber-600 dark:text-amber-400",
  },
  {
    icon: Bell,
    title: "Notifications & Reminders",
    description: "Automated reminders for attendance, birthdays, anniversaries, and important events.",
    iconBg: "bg-violet-500/15",
    iconColor: "text-violet-600 dark:text-violet-400",
  },
  {
    icon: BarChart3,
    title: "Analytics & Insights",
    description: "View attendance trends, member statistics, and at-risk member reports.",
    iconBg: "bg-sky-500/15",
    iconColor: "text-sky-600 dark:text-sky-400",
  },
  {
    icon: Shield,
    title: "Role-Based Access",
    description: "Secure access control with admin, pastor, and shepherd roles with appropriate permissions.",
    iconBg: "bg-slate-500/15",
    iconColor: "text-slate-600 dark:text-slate-400",
  },
  {
    icon: Heart,
    title: "Prayer Requests",
    description: "Shepherds can send prayer requests for members to pastors and other shepherds.",
    iconBg: "bg-rose-500/15",
    iconColor: "text-rose-600 dark:text-rose-400",
  },
  {
    icon: MessageCircle,
    title: "Groups & Events",
    description: "Create and manage groups (bacenta, bible study, choirs) and organize church events.",
    iconBg: "bg-indigo-500/15",
    iconColor: "text-indigo-600 dark:text-indigo-400",
  },
];

export function Features() {
  return (
    <motion.section
      id="features"
      className="py-24 px-4 sm:px-6 lg:px-8"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-64px" }}
      variants={container}
    >
      <div className="mx-auto max-w-7xl">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
        >
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-50 sm:text-4xl">
            Powerful Features for Church Management
          </h2>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
            Everything you need to care for and manage your congregation effectively
          </p>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4"
          variants={container}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-48px" }}
        >
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div key={index} variants={item}>
                <Card
                  className="group p-6 border-2 transition-all duration-300 ease-out hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-1 hover:scale-[1.02] hover:border-primary/30"
                >
                <div className="mb-4">
                  <div className={`inline-flex items-center justify-center w-12 h-12 rounded-lg transition-transform duration-300 group-hover:scale-110 ${feature.iconBg} ${feature.iconColor}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-50">
                  {feature.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {feature.description}
                </p>
              </Card>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </motion.section>
  );
}
