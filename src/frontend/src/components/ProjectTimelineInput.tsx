import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, CalendarRange } from "lucide-react";
import { useEffect, useState } from "react";

export type TimelineMode = "exact" | "month";

export interface ProjectTimelineInputProps {
  mode: TimelineMode;
  onModeChange: (mode: TimelineMode) => void;
  exactStartDate: string;
  exactEndDate: string;
  monthStartDate: string;
  monthEndDate: string;
  onExactStartChange: (value: string) => void;
  onExactEndChange: (value: string) => void;
  onMonthStartChange: (value: string) => void;
  onMonthEndChange: (value: string) => void;
}

export function ProjectTimelineInput({
  mode,
  onModeChange,
  exactStartDate,
  exactEndDate,
  monthStartDate,
  monthEndDate,
  onExactStartChange,
  onExactEndChange,
  onMonthStartChange,
  onMonthEndChange,
}: ProjectTimelineInputProps) {
  return (
    <div className="space-y-4">
      <Tabs value={mode} onValueChange={(v) => onModeChange(v as TimelineMode)}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="exact">
            <Calendar className="h-4 w-4 mr-2" />
            Exact dates
          </TabsTrigger>
          <TabsTrigger value="month">
            <CalendarRange className="h-4 w-4 mr-2" />
            Month range
          </TabsTrigger>
        </TabsList>

        <TabsContent value="exact" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="exact-start">Start date</Label>
              <Input
                id="exact-start"
                type="date"
                value={exactStartDate}
                onChange={(e) => onExactStartChange(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="exact-end">End date</Label>
              <Input
                id="exact-end"
                type="date"
                value={exactEndDate}
                onChange={(e) => onExactEndChange(e.target.value)}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="month" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="month-start">Start month</Label>
              <Input
                id="month-start"
                type="month"
                value={monthStartDate}
                onChange={(e) => onMonthStartChange(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="month-end">End month</Label>
              <Input
                id="month-end"
                type="month"
                value={monthEndDate}
                onChange={(e) => onMonthEndChange(e.target.value)}
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
