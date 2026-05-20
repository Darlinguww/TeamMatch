import { useCallback, useRef } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Badge } from './ui/badge';
import { Calendar, GripVertical, User, Edit3 } from 'lucide-react';
import type { Task, TaskStatus } from '../lib/mockData';
import { cn } from './ui/utils';

const TASK_DRAG_TYPE = 'KANBAN_TASK';

interface DragItem {
  id: string;
  status: TaskStatus;
}

const COLUMNS: { id: TaskStatus; title: string; accent: string; headerBg: string }[] = [
  { id: 'pending', title: 'Pendiente', accent: 'border-slate-300', headerBg: 'bg-slate-100' },
  { id: 'in-progress', title: 'En progreso', accent: 'border-blue-300', headerBg: 'bg-blue-50' },
  { id: 'blocked', title: 'En revisión', accent: 'border-amber-300', headerBg: 'bg-amber-50' },
  { id: 'completed', title: 'Completada', accent: 'border-green-300', headerBg: 'bg-green-50' },
];

const priorityStyles = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-blue-100 text-blue-700',
};

const priorityLabels = {
  high: 'Alta',
  medium: 'Media',
  low: 'Baja',
};

interface KanbanBoardProps {
  tasks: Task[];
  onTasksChange: (tasks: Task[]) => void;
  getAssigneeName: (userId: string) => string;
  // Optional permission check callback: return true if the current user may drag this task
  canDrag?: (task: Task) => boolean;
  // Optional permission check callback: return true if the current user may drop this task in the target column
  canDrop?: (task: Task, targetStatus: TaskStatus) => boolean;
  // Optional delete handler
  onDeleteTask?: (taskId: string) => void;
  // Optional edit handler for leader-only task edits
  onEditTask?: (task: Task) => void;
}

function KanbanCard({
  task,
  assigneeName,
  canDrag = () => true,
  onDelete,
  onEdit,
}: {
  task: Task;
  assigneeName: string;
  canDrag?: (task: Task) => boolean;
  onDelete?: (taskId: string) => void;
  onEdit?: (task: Task) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const allowDrag = canDrag(task);
  const [{ isDragging }, drag] = useDrag(
    () => ({
      type: TASK_DRAG_TYPE,
      item: { id: task.id, status: task.status } satisfies DragItem,
      canDrag: () => allowDrag,
      collect: (monitor) => ({ isDragging: monitor.isDragging() }),
    }),
    [task.id, task.status, allowDrag]
  );

  drag(ref);

  return (
    <div
      ref={ref}
      className={cn(
        'rounded-lg border bg-card p-3 shadow-sm transition-shadow',
        allowDrag ? 'cursor-grab active:cursor-grabbing' : 'cursor-default',
        isDragging && allowDrag && 'opacity-50 shadow-md ring-2 ring-primary/30'
      )}
    >
      <div className="mb-2 flex items-start gap-2">
        {allowDrag && (
          <GripVertical className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        )}
        <h4 className="flex-1 text-sm font-medium leading-snug">{task.title}</h4>
        {onEdit && (
          <button onClick={() => onEdit(task)} className="text-muted-foreground hover:text-primary ml-2" aria-label="Editar tarea">
            <Edit3 className="h-4 w-4" />
          </button>
        )}
        {onDelete && (
          <button onClick={() => onDelete(task.id)} className="text-muted-foreground hover:text-destructive ml-2" aria-label="Eliminar tarea">
            ✖
          </button>
        )}
      </div>
      <p className="mb-3 line-clamp-2 text-xs text-muted-foreground">{task.description}</p>
      <div className="mb-3 flex flex-wrap gap-1.5">
        <Badge className={cn('text-xs', priorityStyles[task.priority])}>
          {priorityLabels[task.priority]}
        </Badge>
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <User className="h-3 w-3" />
          {assigneeName}
        </span>
        <span className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          {new Date(task.dueDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
        </span>
      </div>
    </div>
  );
}

function KanbanColumn({
  column,
  tasks,
  allTasks,
  onDropTask,
  getAssigneeName,
  canDrag,
  canDrop,
  onDeleteTask,
  onEditTask,
}: {
  column: (typeof COLUMNS)[number];
  tasks: Task[];
  allTasks: Task[];
  onDropTask: (taskId: string, status: TaskStatus) => void;
  getAssigneeName: (userId: string) => string;
  canDrag?: (task: Task) => boolean;
  canDrop?: (task: Task, targetStatus: TaskStatus) => boolean;
  onDeleteTask?: (taskId: string) => void;
  onEditTask?: (task: Task) => void;
}) {
  const dropRef = useRef<HTMLDivElement>(null);

  const [{ isOver, canDrop: canDropOnColumn }, drop] = useDrop({
    accept: TASK_DRAG_TYPE,
    canDrop: (item: DragItem) => {
      const draggedTask = allTasks.find((t) => t.id === item.id);
      return draggedTask ? canDrop?.(draggedTask, column.id) ?? true : false;
    },
    drop: (item: DragItem) => {
      if (item.status !== column.id) {
        onDropTask(item.id, column.id);
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  });

  drop(dropRef);

  return (
    <div
      className={cn(
        'flex min-w-[260px] flex-1 flex-col rounded-xl border-2 bg-muted/30 transition-colors',
        column.accent,
        isOver && canDropOnColumn && 'ring-2 ring-primary ring-offset-2 bg-primary/5'
      )}
    >
      <div className={cn('rounded-t-[10px] border-b px-4 py-3', column.headerBg)}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">{column.title}</h3>
          <Badge variant="secondary" className="text-xs">
            {tasks.length}
          </Badge>
        </div>
      </div>
      <div ref={dropRef} className="flex min-h-[320px] flex-1 flex-col gap-3 p-3">
        {tasks.length > 0 ? (
          tasks.map((task) => (
            <KanbanCard
              key={task.id}
              task={task}
              assigneeName={getAssigneeName(task.assignedTo)}
              canDrag={canDrag}
              onDelete={onDeleteTask}
              onEdit={onEditTask}
            />
          ))
        ) : (
          <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-muted-foreground/25 px-4 py-8 text-center text-sm text-muted-foreground">
            Arrastra una tarea aquí
          </div>
        )}
      </div>
    </div>
  );
}

function KanbanBoardInner({ tasks, onTasksChange, getAssigneeName, canDrag, canDrop, onDeleteTask, onEditTask }: KanbanBoardProps) {
  const handleDropTask = useCallback(
    (taskId: string, status: TaskStatus) => {
      onTasksChange(
        tasks.map((t) => (t.id === taskId ? { ...t, status } : t))
      );
    },
    [tasks, onTasksChange]
  );

  const tasksByStatus = (status: TaskStatus) =>
    tasks.filter((t) => t.status === status);

  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {COLUMNS.map((column) => (
        <KanbanColumn
          key={column.id}
          column={column}
          tasks={tasksByStatus(column.id)}
          allTasks={tasks}
          onDropTask={handleDropTask}
          getAssigneeName={getAssigneeName}
          canDrag={canDrag}
          canDrop={canDrop}
          onDeleteTask={onDeleteTask}
          onEditTask={onEditTask}
        />
      ))}
    </div>
  );
}

export function KanbanBoard(props: KanbanBoardProps) {
  return (
    <DndProvider backend={HTML5Backend}>
      <KanbanBoardInner {...props} />
    </DndProvider>
  );
}
