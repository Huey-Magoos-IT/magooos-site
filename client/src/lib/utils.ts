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
  | "Yesterday"
  | "Week to date"
  | "Last Week"
  | "Today Last Week"
  | "Month to date"
  | "Last Month"
  | "This Day Last Year"
  | "This Year";

export const datePresets: DatePreset[] = [
  "Yesterday",
  "Week to date",
  "Last Week",
  "Today Last Week",
  "Month to date",
  "Last Month",
  "This Day Last Year",
  "This Year",
];

export const getDateRangeForPreset = (
  preset: DatePreset
): { startDate: Date; endDate: Date } => {
  const now = new Date();
  const yesterday = endOfDay(subDays(now, 1));
  let startDate: Date;
  let endDate: Date;

  switch (preset) {
    case "Yesterday":
      startDate = startOfDay(subDays(now, 1));
      endDate = yesterday;
      break;
    case "Week to date":
      startDate = startOfWeek(now);
      // Ensure endDate is not after yesterday
      // If start of week is after yesterday (e.g. Monday is today, yesterday is Sunday), then range is just start of week.
      endDate = startOfWeek(now) > yesterday ? startOfWeek(now) : yesterday;
      break;
    case "Last Week":
      startDate = startOfWeek(subWeeks(now, 1));
      endDate = endOfWeek(subWeeks(now, 1));
      // Ensure endDate is not after yesterday
      if (endDate > yesterday) {
        endDate = yesterday;
      }
      break;
    case "Today Last Week":
      startDate = startOfDay(subWeeks(now, 1));
      endDate = endOfDay(subWeeks(now, 1));
      // Ensure endDate is not after yesterday
      if (endDate > yesterday) {
        endDate = yesterday;
      }
      break;
    case "Month to date":
      startDate = startOfMonth(now);
      // Ensure endDate is not after yesterday
      // If start of month is after yesterday (e.g. 1st is today, yesterday was last day of prev month), then range is just start of month.
      endDate = startOfMonth(now) > yesterday ? startOfMonth(now) : yesterday;
      break;
    case "Last Month":
      startDate = startOfMonth(subMonths(now, 1));
      endDate = endOfMonth(subMonths(now, 1));
      // Ensure endDate is not after yesterday
      if (endDate > yesterday) {
        endDate = yesterday;
      }
      break;
    case "This Day Last Year":
      startDate = startOfDay(subYears(now, 1));
      endDate = endOfDay(subYears(now, 1));
      // Ensure endDate is not after yesterday
      if (endDate > yesterday) {
        endDate = yesterday;
      }
      break;
    case "This Year":
      startDate = startOfYear(now);
      endDate = endOfYear(now);
      // Ensure endDate is not after yesterday
      if (endDate > yesterday) {
        endDate = yesterday;
      }
      break;
    default:
      // Should not happen with TypeScript, but good practice
      // Default to yesterday if somehow an invalid preset is passed
      startDate = startOfDay(subDays(now, 1));
      endDate = yesterday;
  }

  // Final check to ensure end date is never after yesterday
  if (endDate > yesterday) {
    endDate = yesterday;
  }
  // Also ensure start date is not after end date (can happen if start of week/month is today and yesterday is in the past)
  if (startDate > endDate) {
    endDate = startDate; // Set end date to start date to make a valid single day range
  }


  return { startDate, endDate };
};
