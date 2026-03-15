/**
 * Formats a date or the current time into a HH:MM string.
 * 
 * @param {Date} [date=new Date()] - The date to format.
 * @returns {string} - Formatted time string.
 */
export function formatTime(date = new Date()) {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
