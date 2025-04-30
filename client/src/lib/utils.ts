export const dataGridClassNames =
  "border border-gray-200 bg-white shadow dark:border-stroke-dark dark:bg-dark-secondary dark:text-gray-200";

export const dataGridSxStyles = (isDarkMode: boolean) => {
  return {
    "& .MuiDataGrid-columnHeaders": {
      color: `${isDarkMode ? "#e5e7eb" : ""}`,
      '& [role="row"] > *': {
        backgroundColor: `${isDarkMode ? "#1d1f21" : "white"}`,
        borderColor: `${isDarkMode ? "#2d3135" : ""}`,
      },
    },
    "& .MuiIconbutton-root": {
      color: `${isDarkMode ? "#a3a3a3" : ""}`,
    },
    "& .MuiTablePagination-root": {
      color: `${isDarkMode ? "#a3a3a3" : ""}`,
    },
    "& .MuiTablePagination-selectIcon": {
      color: `${isDarkMode ? "#a3a3a3" : ""}`,
    },
    "& .MuiDataGrid-cell": {
      border: "none",
    },
    "& .MuiDataGrid-row": {
      borderBottom: `1px solid ${isDarkMode ? "#2d3135" : "e5e7eb"}`,
    },
    "& .MuiDataGrid-withBorderColor": {
      borderColor: `${isDarkMode ? "#2d3135" : "e5e7eb"}`,
    },
  };
};

import {
  startOfDay,
  endOfDay,
  subDays,
  startOfMonth,
  endOfMonth,
  subMonths,
  startOfWeek,
  endOfWeek,
  subWeeks,
  subYears,
  startOfYear,
  endOfYear,
} from "date-fns";

export type DatePreset =
  | "Today"
  | "Yesterday"
  | "This Week"
  | "Last Week"
  | "Today Last Week"
  | "This Month"
  | "Last Month"
  | "This Day Last Year"
  | "This Year";

export const datePresets: DatePreset[] = [
  "Today",
  "Yesterday",
  "This Week",
  "Last Week",
  "Today Last Week",
  "This Month",
  "Last Month",
  "This Day Last Year",
  "This Year",
];

export const getDateRangeForPreset = (
  preset: DatePreset
): { startDate: Date; endDate: Date } => {
  const now = new Date();
  let startDate: Date;
  let endDate: Date;

  switch (preset) {
    case "Today":
      startDate = startOfDay(now);
      endDate = endOfDay(now);
      break;
    case "Yesterday":
      startDate = startOfDay(subDays(now, 1));
      endDate = endOfDay(subDays(now, 1));
      break;
    case "This Week":
      startDate = startOfWeek(now);
      endDate = endOfWeek(now);
      break;
    case "Last Week":
      startDate = startOfWeek(subWeeks(now, 1));
      endDate = endOfWeek(subWeeks(now, 1));
      break;
    case "Today Last Week":
      startDate = startOfDay(subWeeks(now, 1));
      endDate = endOfDay(subWeeks(now, 1));
      break;
    case "This Month":
      startDate = startOfMonth(now);
      endDate = endOfMonth(now);
      break;
    case "Last Month":
      startDate = startOfMonth(subMonths(now, 1));
      endDate = endOfMonth(subMonths(now, 1));
      break;
    case "This Day Last Year":
        startDate = startOfDay(subYears(now, 1));
        endDate = endOfDay(subYears(now, 1));
        break;
    case "This Year":
      startDate = startOfYear(now);
      endDate = endOfYear(now);
      break;
    default:
      // Should not happen with TypeScript, but good practice
      startDate = startOfDay(now);
      endDate = endOfDay(now);
  }

  return { startDate, endDate };
};
