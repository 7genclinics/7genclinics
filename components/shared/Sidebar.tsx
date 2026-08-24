"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { logout } from "@/lib/auth/session";
import {
  Globe,
  LayoutDashboard,
  Calendar,
  UserCheck,
  FileText,
  CreditCard,
  User,
  Users,
  Clock,
  DollarSign,
  ShieldCheck,
  TrendingUp,
  Settings,
  LogOut,
  X,
  MessageSquare,
  Stethoscope,
  Ticket,
  Wallet,
  Pill,
  Megaphone,
  Repeat,
} from "lucide-react";
import { useContext, useState } from "react";
import { ChatContext } from "@/contexts/ChatContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { BrandMark } from "@/components/brand/BrandMark";

interface SidebarProps {
  role: "patient" | "doctor" | "admin" | "receptionist";
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ role, isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  // Safely read unread count — ChatContext may not be mounted in all portals
  const chatCtx = useContext(ChatContext as React.Context<{ totalUnread: number } | null>);
  const totalUnread = chatCtx?.totalUnread ?? 0;
  const { snapshot } = useSubscription();
  const frozen = Boolean(snapshot?.frozen);

  // Define navigation items based on role
  const navigationMap = {
    patient: [
      { name: "Dashboard", href: "/patient/dashboard", icon: LayoutDashboard },
      { name: "Appointments", href: "/patient/appointments", icon: Calendar },
      { name: "Browse Doctors", href: "/patient/doctors", icon: UserCheck },
      { name: "Messages", href: "/patient/chat", icon: MessageSquare, badge: totalUnread },
      { name: "Prescriptions", href: "/patient/prescriptions", icon: FileText },
      { name: "Payments", href: "/patient/payments", icon: CreditCard },
      { name: "My Profile", href: "/patient/profile", icon: User },
    ],
    doctor: [
      { name: "Dashboard", href: "/doctor/dashboard", icon: LayoutDashboard },
      { name: "Queue", href: "/doctor/queue", icon: Ticket },
      { name: "Appointments", href: "/doctor/appointments", icon: Calendar },
      { name: "Medicines", href: "/doctor/medicines", icon: Pill },
      { name: "My Patients", href: "/doctor/patients", icon: Users },
      { name: "Messages", href: "/doctor/chat", icon: MessageSquare, badge: totalUnread },
      { name: "Schedule", href: "/doctor/schedule", icon: Clock },
      { name: "Public Profile", href: "/doctor/landing", icon: Globe },
      { name: "Marketing", href: "/doctor/marketing", icon: Megaphone },
      { name: "Reception / Staff", href: "/doctor/staff", icon: UserCheck },
      { name: "Earnings", href: "/doctor/earnings", icon: DollarSign },
      { name: "Subscription", href: "/doctor/subscription", icon: Repeat },
      { name: "Profile Settings", href: "/doctor/profile", icon: User },
    ],
    receptionist: [
      { name: "Dashboard", href: "/reception/dashboard", icon: LayoutDashboard },
      { name: "Queue", href: "/reception/queue", icon: Ticket },
      { name: "Walk-In", href: "/reception/walk-in", icon: Stethoscope },
      { name: "Patients", href: "/reception/patients", icon: Users },
      { name: "Billing", href: "/reception/billing", icon: Wallet },
      { name: "Medicines", href: "/reception/medicines", icon: Pill },
      { name: "Subscription", href: "/reception/subscription", icon: Repeat },
    ],
    admin: [
      { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
      { name: "Manage Doctors", href: "/admin/doctors", icon: UserCheck },
      { name: "Doctor Pages", href: "/admin/doctor-pages", icon: Globe },
      { name: "Manage Patients", href: "/admin/patients", icon: Users },
      { name: "Appointments", href: "/admin/appointments", icon: Calendar },
      { name: "Services", href: "/admin/services", icon: Stethoscope },
      { name: "Medicines", href: "/admin/medicines", icon: Pill },
      { name: "Messages", href: "/admin/chat", icon: MessageSquare, badge: totalUnread },
      { name: "Payments", href: "/admin/payments", icon: CreditCard },
      { name: "Subscription", href: "/admin/subscription", icon: Repeat },
      { name: "Staff Management", href: "/admin/staff", icon: ShieldCheck },
      { name: "Reports & Analytics", href: "/admin/reports", icon: TrendingUp },
      { name: "Settings", href: "/admin/settings", icon: Settings },
    ],
  };

  const navItems = (navigationMap[role] || []).filter((item) => {
    if (!frozen || (role !== "doctor" && role !== "receptionist")) return true;
    return item.href.endsWith("/subscription");
  });

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await logout("/login");
    } catch {
      setIsLoggingOut(false);
    }
  };

  const sidebarContent = (
    <div className="flex h-full flex-col overflow-y-auto border-r border-border bg-card px-4 py-6">
      {/* Brand */}
      <div className="mb-8 flex items-center justify-between px-2">
        <BrandMark size="sm" />
        {onClose && (
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 hover:bg-accent hover:text-accent-foreground md:hidden cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Nav List */}
      <nav className="flex-1 space-y-1.5">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          const badge = (item as { badge?: number }).badge;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 cursor-pointer",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon className={cn("h-4 w-4 shrink-0 transition-transform duration-200 group-hover:scale-110", isActive ? "" : "text-muted-foreground")} />
              <span className="flex-1">{item.name}</span>
              {badge && badge > 0 && (
                <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                  {badge > 99 ? "99+" : badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Logout Footer */}
      <div className="border-t border-border pt-4">
        <button
          type="button"
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10 transition-all duration-200 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
        >
          <LogOut className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5" />
          <span>{isLoggingOut ? "Logging out..." : "Log Out"}</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (Permanent) */}
      <aside className="hidden md:fixed md:inset-y-0 md:z-30 md:flex md:w-64 md:flex-col">
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar Slide-out Drawer */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/40 backdrop-blur-xs transition-opacity duration-300 md:hidden",
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      >
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-50 w-72 transform transition-transform duration-300 ease-out bg-card",
            isOpen ? "translate-x-0" : "-translate-x-full"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {sidebarContent}
        </aside>
      </div>
    </>
  );
}
