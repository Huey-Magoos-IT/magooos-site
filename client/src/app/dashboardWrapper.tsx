"use client";

import React, { useEffect } from "react";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import AuthProvider, { useAuth } from "./authProvider";
import LoginForm from "@/components/LoginForm";
import StoreProvider, { useAppSelector } from "./redux";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const isSidebarCollapsed = useAppSelector(
    (state) => state.global.isSidebarCollapsed,
  );
  const isDarkMode = useAppSelector((state) => state.global.isDarkMode);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDarkMode]);

  // Show loading spinner while checking auth
  if (isAuthenticated === null) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-orange-50 via-cream-100 to-gold-50 dark:from-dark-bg dark:via-dark-secondary dark:to-dark-tertiary">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  // Show login form if not authenticated
  if (!isAuthenticated) {
    return <LoginForm />;
  }

  // Show dashboard if authenticated
  return (
    <div className="flex min-h-screen w-full bg-cream-100 dark:bg-dark-bg text-charcoal-900 dark:text-cream-100">
      <Sidebar />
      <main
        className={`flex w-full flex-col bg-cream-100 dark:bg-dark-bg ${
          isSidebarCollapsed ? "" : "md:pl-64"
        }`}
      >
        <Navbar />
        <div className="pt-24">
          {children}
        </div>
      </main>
    </div>
  );
};

const DashboardWrapper = ({ children }: { children: React.ReactNode }) => {
  return (
    <StoreProvider>
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <AuthProvider>
          <DashboardLayout>{children}</DashboardLayout>
        </AuthProvider>
      </LocalizationProvider>
    </StoreProvider>
  );
};

export default DashboardWrapper;
