"use client";

import React, { useEffect } from "react";
import AuthProvider from "./authProvider";
import StoreProvider, { useAppSelector } from "./redux";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import QUNavbar from "@/components/QUNavbar";
import QUSidebar from "@/components/QUSidebar";

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const isSidebarCollapsed = useAppSelector(
    (state) => state.global.isSidebarCollapsed,
  );
  const isDarkMode = useAppSelector((state) => state.global.isDarkMode);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  });

  return (
    <div className="flex min-h-screen w-full bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-white">
      {/* Left Sidebar */}
      <div className="hidden md:block">
        <QUSidebar />
      </div>
      
      {/* Main Content */}
      <main
        className={`flex w-full flex-col bg-gray-50 dark:bg-gray-900 ${
          isSidebarCollapsed ? "" : "md:pl-64"
        }`}
      >
        <QUNavbar />
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
};

const DashboardWrapper = ({ children }: { children: React.ReactNode }) => {
  return (
    <StoreProvider>
      <AuthProvider>
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <DashboardLayout>{children}</DashboardLayout>
        </LocalizationProvider>
      </AuthProvider>
    </StoreProvider>
  );
};

export default DashboardWrapper;
