import { ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { formatDistanceToNow } from 'date-fns';
import { TicketPriority, TicketStatus } from '@/typescript/ticket'; // Import ticket types

/**
 * Combines multiple class names into a single string, properly handles
 * conditional classes and merges Tailwind classes efficiently.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Formato de fecha
export function formatDate(date: Date | string): string {
  if (typeof date === 'string') {
    date = new Date(date);
  }

  return date.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

// Limitar caracteres con ellipsis
export function truncateText(text: string, limit: number): string {
  if (text.length <= limit) return text;
  return text.substring(0, limit) + '...';
}

// Generar un color aleatorio pero consistente basado en un string (para avatares)
export function stringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }

  let color = '#';
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xff;
    color += ('00' + value.toString(16)).slice(-2);
  }

  return color;
}

// Format date relative to now, ensuring UTC interpretation
export function formatRelativeTime(dateString: string | Date | null | undefined): string {
  try {
    if (!dateString) {
      return '-';
    }

    let dateToParse: Date;
    if (typeof dateString === 'string') {
      // Ensure the date string is treated as UTC by appending 'Z' if no timezone info exists
      const hasTimezone = /Z|([+-]\d{2}:\d{2})$/.test(dateString);
      const dateStrToParse = hasTimezone ? dateString : `${dateString}Z`;
      dateToParse = new Date(dateStrToParse);
    } else {
      dateToParse = dateString; // Assume Date object is already correct
    }

    if (isNaN(dateToParse.getTime())) {
      // If parsing failed, return the original string or a default message
      return typeof dateString === 'string' ? dateString : 'Invalid date';
    }
    // Use formatDistanceToNow without includeSeconds
    return formatDistanceToNow(dateToParse, { addSuffix: true });
  } catch (error) {
    console.error('Error formatting relative time:', dateString, error);
    return typeof dateString === 'string' ? dateString : 'Error formatting date';
  }
}

// Get badge variant based on ticket priority
export const getPriorityVariant = (
  priority: TicketPriority | string | undefined
): 'destructive' | 'default' | 'secondary' => {
  switch (priority) {
    case 'High':
    case 'high': // Allow lowercase
      return 'destructive';
    case 'Medium':
    case 'medium': // Allow lowercase
      return 'default';
    case 'Low':
    case 'low': // Allow lowercase
      return 'secondary';
    default:
      return 'secondary';
  }
};

// Get badge variant based on ticket status
export const getStatusVariant = (
  status: TicketStatus | string | undefined
): 'default' | 'secondary' | 'outline' => {
  switch (status) {
    case 'Unread':
    case 'unread': // Allow lowercase
      return 'default'; // Or maybe another color like 'primary'?
    case 'Open':
    case 'open': // Allow lowercase
      return 'secondary';
    case 'Closed':
    case 'closed': // Allow lowercase
      return 'outline';
    default:
      return 'outline';
  }
};
