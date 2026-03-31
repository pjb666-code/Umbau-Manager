import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { useMemo, useState } from "react";
import type { Project, Task } from "../backend";

interface CalendarViewProps {
  projects: Project[];
  tasks?: Task[];
  onTaskClick?: (taskId: string) => void;
}

export function CalendarView({
  projects,
  tasks = [],
  onTaskClick,
}: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const daysInMonth = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysCount = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (Date | null)[] = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add all days of the month
    for (let i = 1; i <= daysCount; i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  }, [currentDate]);

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const getProjectsForDate = (date: Date | null) => {
    if (!date) return [];

    return projects.filter((project) => {
      // Only include projects with both start and end dates
      if (!project.startDate || !project.endDate) {
        return false;
      }

      const projectStart = new Date(Number(project.startDate) / 1000000);
      const projectEnd = new Date(Number(project.endDate) / 1000000);

      // Check if date falls within project range
      return date >= projectStart && date <= projectEnd;
    });
  };

  const getTasksForDate = (date: Date | null) => {
    if (!date) return [];

    return tasks.filter((task) => {
      if (task.status === "Erledigt") return false;

      const taskDate = new Date(Number(task.faelligkeit) / 1000000);
      // Compare only the date part (ignore time)
      return (
        taskDate.getFullYear() === date.getFullYear() &&
        taskDate.getMonth() === date.getMonth() &&
        taskDate.getDate() === date.getDate()
      );
    });
  };

  const formatTaskTime = (timestamp: bigint) => {
    const date = new Date(Number(timestamp) / 1000000);
    return date.toLocaleTimeString("de-DE", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Get projects without complete date ranges for separate display
  const undatedProjects = useMemo(() => {
    return projects.filter((p) => !p.startDate || !p.endDate);
  }, [projects]);

  const previousMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1),
    );
  };

  const nextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1),
    );
  };

  const monthName = currentDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{monthName}</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={previousMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={nextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((day) => (
              <div key={day} className="text-center font-semibold text-sm p-2">
                {day}
              </div>
            ))}
            {daysInMonth.map((day, index) => {
              const dayProjects = getProjectsForDate(day);
              const dayTasks = getTasksForDate(day);

              return (
                <div
                  key={day ? day.toISOString() : `empty-${index}`}
                  className={`min-h-24 p-2 border rounded-lg ${
                    day ? "bg-background hover:bg-accent/50" : "bg-muted/30"
                  } transition-colors`}
                >
                  {day && (
                    <>
                      <div className="text-sm font-medium mb-1">
                        {day.getDate()}
                      </div>
                      <div className="space-y-1">
                        {/* Render projects */}
                        {dayProjects.slice(0, 2).map((project) => (
                          <div
                            key={project.id}
                            className="text-xs p-1 rounded truncate"
                            style={{
                              backgroundColor: `${project.color}20`,
                              color: project.color,
                            }}
                            title={project.name}
                          >
                            {project.name}
                          </div>
                        ))}
                        {/* Render tasks with time */}
                        {dayTasks.slice(0, 2).map((task) => (
                          <button
                            type="button"
                            key={task.id}
                            onClick={() => onTaskClick?.(task.id)}
                            className="w-full text-xs p-1 rounded truncate bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-900 transition-colors flex items-center gap-1"
                            title={`${task.titel} - ${formatTaskTime(task.faelligkeit)}`}
                          >
                            <Clock className="h-3 w-3 shrink-0" />
                            <span className="truncate">
                              {formatTaskTime(task.faelligkeit)} {task.titel}
                            </span>
                          </button>
                        ))}
                        {dayProjects.length + dayTasks.length > 2 && (
                          <div className="text-xs text-muted-foreground">
                            +{dayProjects.length + dayTasks.length - 2} more
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Undated Projects Section */}
      {undatedProjects.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Undated Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {undatedProjects.map((project) => (
                <div
                  key={project.id}
                  className="p-3 rounded-lg border"
                  style={{
                    borderLeftColor: project.color,
                    borderLeftWidth: "4px",
                  }}
                >
                  <div className="font-medium">{project.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {!project.startDate && !project.endDate && "No dates set"}
                    {project.startDate &&
                      !project.endDate &&
                      `Start: ${new Date(Number(project.startDate) / 1000000).toLocaleDateString("de-DE")}`}
                    {!project.startDate &&
                      project.endDate &&
                      `End: ${new Date(Number(project.endDate) / 1000000).toLocaleDateString("de-DE")}`}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
