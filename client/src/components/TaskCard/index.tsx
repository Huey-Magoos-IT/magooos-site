import { Priority, Status, Task } from "@/state/api";
import { format } from "date-fns";
import Image from "next/image";
import React from "react";

type Props = {
  task: Task;
};

const TaskCard = ({ task }: Props) => {
  return (
    <div className="mb-3 rounded-lg bg-[var(--theme-surface)] p-5 shadow-md border border-[var(--theme-border)] hover:shadow-lg transition-shadow">
      {task.attachments && task.attachments.length > 0 && (
        <div className="mb-4">
          <strong className="text-[var(--theme-primary)] font-medium">Attachments:</strong>
          <div className="flex flex-wrap mt-2">
            {task.attachments && task.attachments.length > 0 && (
              <Image
                src={`https://huey-site-images.s3.us-east-2.amazonaws.com/${task.attachments[0].fileURL}`}
                alt={task.attachments[0].fileName}
                width={400}
                height={200}
                className="rounded-md border border-[var(--theme-border)] shadow-sm"
              />
            )}
          </div>
        </div>
      )}

      <div className="border-b border-[var(--theme-border)] pb-3 mb-3">
        <p className="text-lg font-semibold text-[var(--theme-text)] mb-1">{task.title}</p>
        <p className="text-sm text-[var(--theme-text-muted)]">ID: {task.id}</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <p className="mb-2">
            <strong className="text-[var(--theme-text-secondary)]">Description:</strong>{" "}
            <span className="text-[var(--theme-text-muted)]">{task.description || "No description provided"}</span>
          </p>

          <p className="mb-2">
            <strong className="text-[var(--theme-text-secondary)]">Status:</strong>{" "}
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              task.status === Status.Completed ? 'bg-[var(--theme-success)]/20 text-[var(--theme-success)]' :
              task.status === Status.WorkInProgress ? 'bg-[var(--theme-primary)]/20 text-[var(--theme-primary)]' :
              task.status === Status.UnderReview ? 'bg-[var(--theme-warning)]/20 text-[var(--theme-warning)]' :
              'bg-[var(--theme-surface-hover)] text-[var(--theme-text-secondary)]'
            }`}>{task.status}</span>
          </p>

          <p className="mb-2">
            <strong className="text-[var(--theme-text-secondary)]">Priority:</strong>{" "}
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              task.priority === Priority.Urgent ? 'bg-[var(--theme-error)]/20 text-[var(--theme-error)]' :
              task.priority === Priority.High ? 'bg-[var(--theme-warning)]/20 text-[var(--theme-warning)]' :
              task.priority === Priority.Medium ? 'bg-[var(--theme-primary)]/20 text-[var(--theme-primary)]' :
              task.priority === Priority.Low ? 'bg-[var(--theme-success)]/20 text-[var(--theme-success)]' :
              'bg-[var(--theme-surface-hover)] text-[var(--theme-text-secondary)]'
            }`}>{task.priority}</span>
          </p>
        </div>

        <div>
          <p className="mb-2">
            <strong className="text-[var(--theme-text-secondary)]">Start Date:</strong>{" "}
            <span className="text-[var(--theme-text-muted)]">{task.startDate ? format(new Date(task.startDate), "P") : "Not set"}</span>
          </p>

          <p className="mb-2">
            <strong className="text-[var(--theme-text-secondary)]">Due Date:</strong>{" "}
            <span className="text-[var(--theme-text-muted)]">{task.dueDate ? format(new Date(task.dueDate), "P") : "Not set"}</span>
          </p>

          <p className="mb-2">
            <strong className="text-[var(--theme-text-secondary)]">Author:</strong>{" "}
            <span className="text-[var(--theme-text-muted)]">{task.author ? task.author.username : "Unknown"}</span>
          </p>

          <p className="mb-2">
            <strong className="text-[var(--theme-text-secondary)]">Assignee:</strong>{" "}
            <span className="text-[var(--theme-text-muted)]">{task.assignee ? task.assignee.username : "Unassigned"}</span>
          </p>
        </div>
      </div>
      
      {task.tags && (
        <div className="mt-3 pt-3 border-t border-[var(--theme-border)]">
          <strong className="text-[var(--theme-text-secondary)]">Tags:</strong>{" "}
          <div className="flex flex-wrap gap-1 mt-1">
            {task.tags.split(',').map((tag, index) => (
              <span key={index} className="px-2 py-1 bg-[var(--theme-primary)]/20 text-[var(--theme-primary)] text-xs rounded-full">
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
