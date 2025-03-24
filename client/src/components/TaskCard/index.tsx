import { Priority, Status, Task } from "@/state/api";
import { format } from "date-fns";
import Image from "next/image";
import React from "react";

type Props = {
  task: Task;
};

const TaskCard = ({ task }: Props) => {
  return (
    <div className="mb-3 rounded-lg bg-white p-5 shadow-md border border-gray-100 hover:shadow-lg transition-shadow dark:bg-dark-secondary dark:text-white dark:border-stroke-dark">
      {task.attachments && task.attachments.length > 0 && (
        <div className="mb-4">
          <strong className="text-blue-600 dark:text-blue-400 font-medium">Attachments:</strong>
          <div className="flex flex-wrap mt-2">
            {task.attachments && task.attachments.length > 0 && (
              <Image
                src={`https://huey-site-images.s3.us-east-2.amazonaws.com/${task.attachments[0].fileURL}`}
                alt={task.attachments[0].fileName}
                width={400}
                height={200}
                className="rounded-md border border-gray-200 shadow-sm dark:border-stroke-dark"
              />
            )}
          </div>
        </div>
      )}
      
      <div className="border-b border-gray-200 pb-3 mb-3 dark:border-stroke-dark">
        <p className="text-lg font-semibold text-gray-800 dark:text-white mb-1">{task.title}</p>
        <p className="text-sm text-gray-500 dark:text-gray-300">ID: {task.id}</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <p className="mb-2">
            <strong className="text-gray-700 dark:text-gray-200">Description:</strong>{" "}
            <span className="text-gray-600 dark:text-gray-300">{task.description || "No description provided"}</span>
          </p>
          
          <p className="mb-2">
            <strong className="text-gray-700 dark:text-gray-200">Status:</strong>{" "}
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              task.status === Status.Completed ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200' :
              task.status === Status.WorkInProgress ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-200' :
              task.status === Status.UnderReview ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200' :
              'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
            }`}>{task.status}</span>
          </p>
          
          <p className="mb-2">
            <strong className="text-gray-700 dark:text-gray-200">Priority:</strong>{" "}
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              task.priority === Priority.Urgent ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-200' :
              task.priority === Priority.High ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-200' :
              task.priority === Priority.Medium ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200' :
              task.priority === Priority.Low ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200' :
              'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
            }`}>{task.priority}</span>
          </p>
        </div>
        
        <div>
          <p className="mb-2">
            <strong className="text-gray-700 dark:text-gray-200">Start Date:</strong>{" "}
            <span className="text-gray-600 dark:text-gray-300">{task.startDate ? format(new Date(task.startDate), "P") : "Not set"}</span>
          </p>
          
          <p className="mb-2">
            <strong className="text-gray-700 dark:text-gray-200">Due Date:</strong>{" "}
            <span className="text-gray-600 dark:text-gray-300">{task.dueDate ? format(new Date(task.dueDate), "P") : "Not set"}</span>
          </p>
          
          <p className="mb-2">
            <strong className="text-gray-700 dark:text-gray-200">Author:</strong>{" "}
            <span className="text-gray-600 dark:text-gray-300">{task.author ? task.author.username : "Unknown"}</span>
          </p>
          
          <p className="mb-2">
            <strong className="text-gray-700 dark:text-gray-200">Assignee:</strong>{" "}
            <span className="text-gray-600 dark:text-gray-300">{task.assignee ? task.assignee.username : "Unassigned"}</span>
          </p>
        </div>
      </div>
      
      {task.tags && (
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-stroke-dark">
          <strong className="text-gray-700 dark:text-gray-200">Tags:</strong>{" "}
          <div className="flex flex-wrap gap-1 mt-1">
            {task.tags.split(',').map((tag, index) => (
              <span key={index} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full dark:bg-blue-900/20 dark:text-blue-200">
                {tag.trim()}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskCard;
