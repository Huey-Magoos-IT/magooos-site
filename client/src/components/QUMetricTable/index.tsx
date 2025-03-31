"use client";

import React from "react";
import { Info } from "lucide-react";
import { Tooltip } from "@mui/material";

interface MetricItem {
  name: string;
  value: string | number;
  info?: string;
}

interface QUMetricTableProps {
  metrics: MetricItem[];
}

const QUMetricTable: React.FC<QUMetricTableProps> = ({ metrics }) => {
  return (
    <div className="w-full">
      <table className="w-full border-collapse">
        <tbody>
          {metrics.map((metric, index) => (
            <tr
              key={index}
              className={`
                border-b border-gray-100 dark:border-gray-700
                ${index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-700'}
                hover:bg-blue-50 dark:hover:bg-blue-900/10
              `}
            >
              <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">
                <div className="flex items-center">
                  {metric.name}
                  {metric.info && (
                    <Tooltip title={metric.info} arrow placement="top">
                      <div className="ml-2 cursor-help">
                        <Info className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                      </div>
                    </Tooltip>
                  )}
                </div>
              </td>
              <td className="py-3 px-4 text-sm text-right font-medium text-gray-900 dark:text-white">
                {typeof metric.value === 'number'
                  ? metric.value.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })
                  : metric.value
                }
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default QUMetricTable;