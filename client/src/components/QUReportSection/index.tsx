"use client";

import React, { useState, ReactNode } from "react";
import { ChevronDown, ChevronUp, Info } from "lucide-react";
import { Tooltip } from "@mui/material";

interface QUReportSectionProps {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  infoTooltip?: string;
}

const QUReportSection: React.FC<QUReportSectionProps> = ({
  title,
  children,
  defaultOpen = true,
  infoTooltip
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="mb-4 border border-gray-200 rounded-md overflow-hidden shadow-sm dark:border-gray-700">
      {/* Section Header */}
      <div
        className="flex items-center justify-between px-4 py-3 bg-white cursor-pointer dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center">
          {isOpen ? (
            <ChevronDown className="h-5 w-5 text-gray-500 mr-2 dark:text-gray-400" />
          ) : (
            <ChevronUp className="h-5 w-5 text-gray-500 mr-2 dark:text-gray-400" />
          )}
          <h3 className="text-md font-medium text-gray-800 dark:text-white">{title}</h3>
          
          {infoTooltip && (
            <Tooltip title={infoTooltip} arrow placement="top">
              <div className="ml-2 cursor-help">
                <Info className="h-4 w-4 text-gray-400 dark:text-gray-500" />
              </div>
            </Tooltip>
          )}
        </div>
      </div>
      
      {/* Section Content */}
      {isOpen && (
        <div className="border-t border-gray-200 dark:border-gray-700">
          {children}
        </div>
      )}
    </div>
  );
};

export default QUReportSection;