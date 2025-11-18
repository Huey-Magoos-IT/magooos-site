import { useGetTasksQuery, useUpdateTaskStatusMutation } from "@/state/api";
import React from "react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { Task as TaskType } from "@/state/api";
import { EllipsisVertical, MessageSquareMore, Plus } from "lucide-react";
import { format } from "date-fns";
import Image from "next/image";

type BoardProps = {
  id: string;
  setIsModalNewTaskOpen: (isOpen: boolean) => void;
};

const taskStatus = ["To Do", "Work In Progress", "Under Review", "Completed"];

const BoardView = ({ id, setIsModalNewTaskOpen }: BoardProps) => {
  const {
    data: tasks,
    isLoading,
    error,
  } = useGetTasksQuery({ projectId: Number(id) });
  const [updateTaskStatus] = useUpdateTaskStatusMutation();

  const moveTask = (taskId: number, toStatus: string) => {
    updateTaskStatus({ taskId, status: toStatus });
  };

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>An error occurred while fetching tasks</div>;

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 xl:grid-cols-4">
        {taskStatus.map((status) => (
          <TaskColumn
            key={status}
            status={status}
            tasks={tasks || []}
            moveTask={moveTask}
            setIsModalNewTaskOpen={setIsModalNewTaskOpen}
          />
        ))}
      </div>
    </DndProvider>
  );
};

type TaskColumnProps = {
  status: string;
  tasks: TaskType[];
  moveTask: (taskId: number, toStatus: string) => void;
  setIsModalNewTaskOpen: (isOpen: boolean) => void;
};

const TaskColumn = ({
  status,
  tasks,
  moveTask,
  setIsModalNewTaskOpen,
}: TaskColumnProps) => {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: "task",
    drop: (item: { id: number }) => moveTask(item.id, status),
    collect: (monitor: any) => ({
      isOver: !!monitor.isOver(),
    }),
  }));

  const tasksCount = tasks.filter((task) => task.status === status).length;

  const statusColor: any = {
    "To Do": "#2563EB",
    "Work In Progress": "#059669",
    "Under Review": "#D97706",
    Completed: "#000000",
  };

  return (
    <div
      ref={(instance) => {
        drop(instance);
      }}
      className={`sl:py-4 rounded-lg py-2 xl:px-2 transition-colors duration-200 ${
        isOver ? "bg-[var(--theme-primary)]/10" : ""
      }`}
    >
      <div className="mb-3 flex w-full shadow-sm">
        <div
          className={`w-2 !bg-[${statusColor[status]}] rounded-s-lg`}
          style={{ backgroundColor: statusColor[status] }}
        />
        <div className="flex w-full items-center justify-between rounded-e-lg bg-[var(--theme-surface)] px-5 py-4 border border-[var(--theme-border)]">
          <h3 className="flex items-center text-lg font-semibold text-[var(--theme-text)]">
            {status}{" "}
            <span
              className="ml-2 inline-block rounded-full bg-[var(--theme-primary)]/20 text-[var(--theme-primary)] p-1 text-center text-sm leading-none font-bold border border-[var(--theme-primary)]/30"
              style={{ width: "1.5rem", height: "1.5rem" }}
            >
              {tasksCount}
            </span>
          </h3>
          <div className="flex items-center gap-2">
            <button className="flex h-6 w-5 items-center justify-center text-[var(--theme-text-muted)] hover:text-[var(--theme-text)] transition-colors">
              <EllipsisVertical size={26} />
            </button>
            <button
              className="flex h-6 w-6 items-center justify-center rounded bg-[var(--theme-primary)]/20 text-[var(--theme-primary)] hover:bg-[var(--theme-primary)]/30 transition-colors"
              onClick={() => setIsModalNewTaskOpen(true)}
            >
              <Plus size={16} />
            </button>
          </div>
        </div>
      </div>

      {tasks
        .filter((task) => task.status === status)
        .map((task) => (
          <Task key={task.id} task={task} />
        ))}
    </div>
  );
};

type TaskProps = {
  task: TaskType;
};

const Task = ({ task }: TaskProps) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: "task",
    item: { id: task.id },
    collect: (monitor: any) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }));

  const taskTagsSplit = task.tags ? task.tags.split(",") : [];

  const formattedStartDate = task.startDate
    ? format(new Date(task.startDate), "P")
    : "";
  const formattedDueDate = task.dueDate
    ? format(new Date(task.dueDate), "P")
    : "";

  const numberOfComments = (task.comments && task.comments.length) || 0;

  const PriorityTag = ({ priority }: { priority: TaskType["priority"] }) => (
    <div
      className={`rounded-full px-2 py-1 text-xs font-semibold shadow-sm ${
        priority === "Urgent"
          ? "bg-[var(--theme-error)]/20 text-[var(--theme-error)] border border-[var(--theme-error)]/30"
          : priority === "High"
            ? "bg-[var(--theme-warning)]/20 text-[var(--theme-warning)] border border-[var(--theme-warning)]/30"
            : priority === "Medium"
              ? "bg-[var(--theme-primary)]/20 text-[var(--theme-primary)] border border-[var(--theme-primary)]/30"
              : priority === "Low"
                ? "bg-[var(--theme-success)]/20 text-[var(--theme-success)] border border-[var(--theme-success)]/30"
                : "bg-[var(--theme-surface-hover)] text-[var(--theme-text-secondary)] border border-[var(--theme-border)]"
      }`}
    >
      {priority}
    </div>
  );

  return (
    <div
      ref={(instance) => {
        drag(instance);
      }}
      className={`mb-4 rounded-lg bg-[var(--theme-surface)] shadow-md border border-[var(--theme-border)] hover:shadow-lg transition-all ${
        isDragging ? "opacity-50" : "opacity-100"
      }`}
    >
      {task.attachments && task.attachments.length > 0 && (
        <Image
          src={`https://huey-site-images.s3.us-east-2.amazonaws.com/${task.attachments[0].fileURL}`}
          alt={task.attachments[0].fileName}
          width={400}
          height={200}
          className="h-auto w-full rounded-t-lg object-cover"
        />
      )}
      <div className="p-4 md:p-6">
        <div className="flex items-start justify-between">
          <div className="flex flex-1 flex-wrap items-center gap-2">
            {task.priority && <PriorityTag priority={task.priority} />}
            <div className="flex gap-2">
              {taskTagsSplit.map((tag) => (
                <div
                  key={tag}
                  className="rounded-full bg-[var(--theme-primary)]/20 text-[var(--theme-primary)] px-2 py-1 text-xs border border-[var(--theme-primary)]/30"
                >
                  {tag.trim()}
                </div>
              ))}
            </div>
          </div>
          <button className="flex h-6 w-4 flex-shrink-0 items-center justify-center text-[var(--theme-text-muted)] hover:text-[var(--theme-text)] transition-colors">
            <EllipsisVertical size={26} />
          </button>
        </div>

        <div className="my-3 flex justify-between">
          <h4 className="text-md font-bold text-[var(--theme-text)]">{task.title}</h4>
          {typeof task.points === "number" && (
            <div className="text-xs font-semibold bg-[var(--theme-primary)]/20 text-[var(--theme-primary)] px-2 py-1 rounded-full">
              {task.points} pts
            </div>
          )}
        </div>

        <div className="text-xs text-[var(--theme-text-muted)] mb-2 font-medium">
          {formattedStartDate && <span>{formattedStartDate}</span>}
          {formattedStartDate && formattedDueDate && <span> - </span>}
          {formattedDueDate && <span>{formattedDueDate}</span>}
        </div>
        <p className="text-sm text-[var(--theme-text-secondary)] line-clamp-2">
          {task.description}
        </p>
        <div className="mt-4 border-t border-[var(--theme-border)]" />

        {/* Users */}
        <div className="mt-3 flex items-center justify-between">
          <div className="flex -space-x-[6px] overflow-hidden">
            {task.assignee && (
              <Image
                key={task.assignee.userId}
                src={`https://huey-site-images.s3.us-east-2.amazonaws.com/${task.assignee.profilePictureUrl!}`}
                alt={task.assignee.username}
                width={30}
                height={30}
                className="h-8 w-8 rounded-full border-2 border-[var(--theme-surface)] object-cover shadow-sm"
              />
            )}
            {task.author && (
              <Image
                key={task.author.userId}
                src={`https://huey-site-images.s3.us-east-2.amazonaws.com/${task.author.profilePictureUrl!}`}
                alt={task.author.username}
                width={30}
                height={30}
                className="h-8 w-8 rounded-full border-2 border-[var(--theme-surface)] object-cover shadow-sm"
              />
            )}
          </div>
          <div className="flex items-center text-[var(--theme-primary)]">
            <MessageSquareMore size={20} />
            <span className="ml-1 text-sm font-medium">
              {numberOfComments}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BoardView;
