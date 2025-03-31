"use client";

import React, { ReactNode } from "react";
import QUNavbar from "@/components/QUNavbar";
import QUSidebar from "@/components/QUSidebar";

interface QUReportLayoutProps {
  children: ReactNode;
}

const QUReportLayout: React.FC<QUReportLayoutProps> = ({ children }) => {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <div className="hidden md:block">
        <QUSidebar />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Navbar */}
        <QUNavbar />

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
          {children}
        </div>
      </div>
    </div>
  );
};

export default QUReportLayout;