/**
 * Date utility functions for the Umbau Manager application
 */

/**
 * Checks if a given date (as bigint timestamp) falls within the current calendar week
 * Week starts on Monday (German standard)
 */
export function isThisWeek(timestamp: bigint): boolean {
  const date = new Date(Number(timestamp) / 1000000);
  const today = new Date();

  // Get Monday of current week
  const currentMonday = new Date(today);
  const dayOfWeek = today.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Sunday is 0, Monday is 1
  currentMonday.setDate(today.getDate() + diff);
  currentMonday.setHours(0, 0, 0, 0);

  // Get Sunday of current week
  const currentSunday = new Date(currentMonday);
  currentSunday.setDate(currentMonday.getDate() + 6);
  currentSunday.setHours(23, 59, 59, 999);

  return date >= currentMonday && date <= currentSunday;
}

/**
 * Gets the start and end dates of the current week (Monday to Sunday)
 */
export function getCurrentWeekRange(): { start: Date; end: Date } {
  const today = new Date();

  // Get Monday of current week
  const monday = new Date(today);
  const dayOfWeek = today.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  monday.setDate(today.getDate() + diff);
  monday.setHours(0, 0, 0, 0);

  // Get Sunday of current week
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return { start: monday, end: sunday };
}

/**
 * Formats a bigint timestamp to German date format
 */
export function formatDate(timestamp: bigint): string {
  const date = new Date(Number(timestamp) / 1000000);
  return date.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/**
 * Formats a bigint timestamp to German date and time format
 */
export function formatDateTime(timestamp: bigint): string {
  const date = new Date(Number(timestamp) / 1000000);
  return date.toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Alias for formatDateTime for German format
 */
export function formatDateTimeGerman(timestamp: bigint): string {
  return formatDateTime(timestamp);
}

/**
 * Converts a Date object to bigint timestamp (nanoseconds)
 */
export function dateToBigInt(date: Date): bigint {
  return BigInt(date.getTime() * 1000000);
}

/**
 * Converts a bigint timestamp to Date object
 */
export function bigIntToDate(timestamp: bigint): Date {
  return new Date(Number(timestamp) / 1000000);
}

/**
 * Converts a month string (YYYY-MM) to start and end timestamps for that month
 */
export function monthToTimestamps(monthStr: string): {
  start: bigint;
  end: bigint;
} {
  const [year, month] = monthStr.split("-").map(Number);
  const startDate = new Date(year, month - 1, 1);
  startDate.setHours(0, 0, 0, 0);

  const endDate = new Date(year, month, 0); // Last day of the month
  endDate.setHours(23, 59, 59, 999);

  return {
    start: dateToBigInt(startDate),
    end: dateToBigInt(endDate),
  };
}

/**
 * Converts timestamps to month string (YYYY-MM) if they represent a full month
 */
export function timestampToMonth(timestamp: bigint): string {
  const date = bigIntToDate(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

/**
 * Checks if timestamps represent exact full-month boundaries
 */
export function isFullMonthRange(start: bigint, end: bigint): boolean {
  const startDate = bigIntToDate(start);
  const endDate = bigIntToDate(end);

  // Check if start is first day of month at midnight
  const isStartFirstDay =
    startDate.getDate() === 1 &&
    startDate.getHours() === 0 &&
    startDate.getMinutes() === 0 &&
    startDate.getSeconds() === 0;

  // Check if end is last day of month at 23:59:59
  const lastDayOfMonth = new Date(
    endDate.getFullYear(),
    endDate.getMonth() + 1,
    0,
  ).getDate();
  const isEndLastDay =
    endDate.getDate() === lastDayOfMonth &&
    endDate.getHours() === 23 &&
    endDate.getMinutes() === 59;

  return isStartFirstDay && isEndLastDay;
}

/**
 * Formats a date range, detecting month-range format when appropriate
 */
export function formatDateRangeSmart(start?: bigint, end?: bigint): string {
  if (!start && !end) {
    return "No dates set";
  }
  if (!start) {
    const endDate = bigIntToDate(end!);
    return `End: ${endDate.toLocaleDateString("de-DE", { day: "2-digit", month: "short", year: "numeric" })}`;
  }
  if (!end) {
    const startDate = bigIntToDate(start);
    return `Start: ${startDate.toLocaleDateString("de-DE", { day: "2-digit", month: "short", year: "numeric" })}`;
  }

  // Check if this is a full-month range
  if (isFullMonthRange(start, end)) {
    const startDate = bigIntToDate(start);
    const endDate = bigIntToDate(end);

    const startMonth = startDate.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
    const endMonth = endDate.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });

    if (startMonth === endMonth) {
      return startMonth;
    }
    return `${startMonth} – ${endMonth}`;
  }

  // Otherwise use day-precise format
  const startDate = bigIntToDate(start);
  const endDate = bigIntToDate(end);
  return `${startDate.toLocaleDateString("de-DE", { day: "2-digit", month: "short", year: "numeric" })} - ${endDate.toLocaleDateString("de-DE", { day: "2-digit", month: "short", year: "numeric" })}`;
}

/**
 * Validates that end month is not before start month
 */
export function validateMonthRange(
  startMonth: string,
  endMonth: string,
): boolean {
  const [startYear, startMo] = startMonth.split("-").map(Number);
  const [endYear, endMo] = endMonth.split("-").map(Number);

  if (endYear < startYear) return false;
  if (endYear === startYear && endMo < startMo) return false;

  return true;
}

/**
 * Combines a date string (YYYY-MM-DD) and time string (HH:MM) into a bigint timestamp
 */
export function combineDateAndTime(dateStr: string, timeStr: string): bigint {
  const date = new Date(dateStr);

  if (timeStr) {
    const [hours, minutes] = timeStr.split(":").map(Number);
    date.setHours(hours, minutes, 0, 0);
  } else {
    // Default to 9:00 AM if no time specified
    date.setHours(9, 0, 0, 0);
  }

  return dateToBigInt(date);
}

/**
 * Alias for combineDateAndTime
 */
export function combineDateTimeToTimestamp(
  dateStr: string,
  timeStr: string,
): bigint {
  return combineDateAndTime(dateStr, timeStr);
}

/**
 * Extracts date string (YYYY-MM-DD) from a bigint timestamp
 */
export function extractDateString(timestamp: bigint): string {
  const date = bigIntToDate(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Alias for extractDateString
 */
export function extractDateFromTimestamp(timestamp: bigint): string {
  return extractDateString(timestamp);
}

/**
 * Extracts time string (HH:MM) from a bigint timestamp
 */
export function extractTimeString(timestamp: bigint): string {
  const date = bigIntToDate(timestamp);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

/**
 * Alias for extractTimeString
 */
export function extractTimeFromTimestamp(timestamp: bigint): string {
  return extractTimeString(timestamp);
}

/**
 * Formats a bigint timestamp to show date and time in a user-friendly format
 */
export function formatDateTimeShort(timestamp: bigint): string {
  const date = bigIntToDate(timestamp);
  const dateStr = date.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const timeStr = date.toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${dateStr}, ${timeStr}`;
}
