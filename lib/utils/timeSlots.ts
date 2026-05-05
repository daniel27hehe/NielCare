/**
 * Time slot generation and filtering utilities
 * All times use Asia/Makassar (WITA, UTC+8) timezone
 */

import { format, parse, isBefore, isToday, startOfDay } from 'date-fns';

const CLINIC_TIMEZONE = 'Asia/Makassar';

/**
 * Get current time in WITA timezone
 */
export function getCurrentTimeWITA(): Date {
  const now = new Date();
  const witaOffset = 8 * 60; // WITA is UTC+8
  const localOffset = now.getTimezoneOffset();
  const diff = witaOffset + localOffset;
  return new Date(now.getTime() + diff * 60 * 1000);
}

/**
 * Format time string (HH:mm) to display format (HH:mm)
 */
export function formatTimeSlot(time: string): string {
  return time;
}

/**
 * Generate time slots between start and end time with given duration
 */
export function generateTimeSlots(
  startTime: string,
  endTime: string,
  durationMinutes: number
): string[] {
  const slots: string[] = [];
  const start = parse(startTime, 'HH:mm:ss', new Date());
  const end = parse(endTime, 'HH:mm:ss', new Date());

  let current = start;
  while (isBefore(current, end)) {
    slots.push(format(current, 'HH:mm'));
    current = new Date(current.getTime() + durationMinutes * 60 * 1000);
  }

  return slots;
}

/**
 * Filter out past time slots for today's date
 */
export function filterPastSlots(
  slots: string[],
  selectedDate: string
): string[] {
  const selected = new Date(selectedDate);
  const witaNow = getCurrentTimeWITA();

  if (!isToday(selected)) {
    return slots; // All slots available for future dates
  }

  const currentTime = format(witaNow, 'HH:mm');
  return slots.filter(slot => slot > currentTime);
}

/**
 * Filter out already booked slots
 */
export function filterBookedSlots(
  slots: string[],
  bookedTimes: string[]
): string[] {
  const bookedSet = new Set(
    bookedTimes.map(t => {
      // Handle both HH:mm and HH:mm:ss formats
      const parts = t.split(':');
      return `${parts[0]}:${parts[1]}`;
    })
  );
  return slots.filter(slot => !bookedSet.has(slot));
}

/**
 * Check if a date is in the past
 */
export function isDateInPast(date: Date): boolean {
  const today = startOfDay(getCurrentTimeWITA());
  return isBefore(startOfDay(date), today);
}

/**
 * Get day of week number (0=Sunday) from a date
 */
export function getDayOfWeek(date: Date): number {
  return date.getDay();
}
