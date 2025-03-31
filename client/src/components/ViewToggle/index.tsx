"use client";

import React from "react";
import { Grid, List } from "lucide-react";

export type ViewType = "grid" | "list";

interface ViewToggleProps {
  currentView: ViewType;
  onChange: (view: ViewType) => void;
  className?: string;
}

const ViewToggle: React.FC<ViewToggleProps> = ({
  currentView,
  onChange,
  className = "",
}) => {
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <button
        onClick={() => onChange("grid")}
        className={`p-2 rounded-md transition-colors ${
          currentView === "grid"
            ? "bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300"
            : "text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
        }`}
        aria-label="Table View"
        title="Table View"
      >
        <List size={20} />
      </button>
      <button
        onClick={() => onChange("list")}
        className={`p-2 rounded-md transition-colors ${
          currentView === "list"
            ? "bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300"
            : "text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
        }`}
        aria-label="Card View"
        title="Card View"
      >
        <Grid size={20} />
      </button>
    </div>
  );
};

export default ViewToggle;