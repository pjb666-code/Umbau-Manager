import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "lucide-react";
import { useMemo } from "react";
import type { Project, Task } from "../backend";

interface CalendarWidgetProps {
  projects: Project[];
  tasks: Task[];
}

export function CalendarWidget({ projects, tasks }: CalendarWidgetProps) {
  const upcomingEvents = useMemo(() => {
    const now = new Date();
    const events: Array<{
      type: "phase" | "task";
      name: string;
      date: Date;
      color?: string;
    }> = [];

    // Add project start dates
    for (const project of projects) {
      if (project.startDate) {
        const startDate = new Date(Number(project.startDate) / 1000000);
        if (startDate >= now) {
          events.push({
            type: "phase",
            name: `${project.name} starts`,
            date: startDate,
            color: project.color,
          });
        }
      }
    }

    // Add task due dates
    for (const task of tasks) {
      if (task.faelligkeit) {
        const dueDate = new Date(Number(task.faelligkeit) / 1000000);
        if (dueDate >= now) {
          events.push({
            type: "task",
            name: task.titel,
            date: dueDate,
          });
        }
      }
    }

    // Sort by date and take first 5
    return events
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 5);
  }, [projects, tasks]);

  const formatDateTime = (date: Date) => {
    const dateStr = date.toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "short",
    });
    const timeStr = date.toLocaleTimeString("de-DE", {
      hour: "2-digit",
      minute: "2-digit",
    });
    return `${dateStr}, ${timeStr}`;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("de-DE", { day: "2-digit", month: "short" });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Upcoming Events
        </CardTitle>
      </CardHeader>
      <CardContent>
        {upcomingEvents.length === 0 ? (
          <p className="text-sm text-muted-foreground">No upcoming events</p>
        ) : (
          <div className="space-y-3">
            {upcomingEvents.map((event) => (
              <div
                key={`${event.type}-${event.name}-${event.date.getTime()}`}
                className="flex items-start gap-3"
              >
                <div className="text-sm font-medium text-muted-foreground min-w-20">
                  {event.type === "task"
                    ? formatDateTime(event.date)
                    : formatDate(event.date)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {event.color && (
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: event.color }}
                      />
                    )}
                    <p className="text-sm font-medium">{event.name}</p>
                  </div>
                  <p className="text-xs text-muted-foreground capitalize">
                    {event.type}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
