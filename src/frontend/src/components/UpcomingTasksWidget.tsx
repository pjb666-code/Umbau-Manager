import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Clock } from "lucide-react";
import { useMemo } from "react";
import type { Project, Task } from "../backend";

interface UpcomingTasksWidgetProps {
  tasks: Task[];
  projects?: Project[];
  onTaskClick: (taskId: string) => void;
}

export function UpcomingTasksWidget({
  tasks,
  projects = [],
  onTaskClick,
}: UpcomingTasksWidgetProps) {
  const upcomingTasks = useMemo(() => {
    // Filter out completed tasks and sort by due date
    const openTasks = tasks.filter((t) => t.status !== "Erledigt");
    return openTasks
      .sort((a, b) => Number(a.faelligkeit - b.faelligkeit))
      .slice(0, 7); // Show max 7 tasks
  }, [tasks]);

  const formatDateTime = (timestamp: bigint) => {
    const date = new Date(Number(timestamp) / 1000000);
    const dateStr = date.toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    const timeStr = date.toLocaleTimeString("de-DE", {
      hour: "2-digit",
      minute: "2-digit",
    });
    return { dateStr, timeStr };
  };

  const getProjectName = (projectId?: string) => {
    if (!projectId) return null;
    const project = projects.find((p) => p.id === projectId);
    return project?.name;
  };

  const getDringlichkeitColor = (dringlichkeit: bigint) => {
    const level = Number(dringlichkeit);
    if (level === 3) return "bg-red-500";
    if (level === 2) return "bg-orange-500";
    return "bg-green-500";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Anstehende Aufgaben
        </CardTitle>
      </CardHeader>
      <CardContent>
        {upcomingTasks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Keine anstehenden Aufgaben</p>
          </div>
        ) : (
          <div className="space-y-3">
            {upcomingTasks.map((task) => {
              const { dateStr, timeStr } = formatDateTime(task.faelligkeit);
              const projectName = getProjectName(task.projectId);

              return (
                <button
                  type="button"
                  key={task.id}
                  onClick={() => onTaskClick(task.id)}
                  className="w-full text-left flex items-start gap-3 p-3 rounded-lg border hover:bg-accent/50 cursor-pointer transition-colors"
                >
                  <div
                    className={`w-1 h-full rounded-full ${getDringlichkeitColor(task.dringlichkeit)}`}
                  />
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-sm truncate">
                        {task.titel}
                      </p>
                      <Badge variant="outline" className="shrink-0 text-xs">
                        {task.kategorie}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>{dateStr}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{timeStr}</span>
                      </div>
                    </div>
                    {projectName && (
                      <p className="text-xs text-muted-foreground truncate">
                        Phase: {projectName}
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
