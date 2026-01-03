import { ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { formatDistanceToNow, format } from 'date-fns';
import { TicketPriority, TicketStatus } from '@/typescript/ticket'; // Import ticket types
import { enUS } from 'date-fns/locale';
import { toZonedTime } from 'date-fns-tz';
//import { EMPTY_PATH } from 'zod';
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
export function formatRelativeTime(
  dateString: string | Date | null | undefined,
  showTime: boolean = false
): string {
  try {
    if (!dateString) return '-';

    let dateToParse: Date;
    const dateToday: Date = new Date();

    if (typeof dateString === 'string') {
      const hasTimezone = /Z|([+-]\d{2}:\d{2})$/.test(dateString);
      const dateStrToParse = hasTimezone ? dateString : `${dateString}Z`;
      dateToParse = new Date(dateStrToParse);
    } else {
      dateToParse = dateString;
    }
    if (isNaN(dateToParse.getTime())) {
      return typeof dateString === 'string' ? dateString : 'Invalid date';
    }
    const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    //const easternDate = toZonedTime(dateToParse, 'America/New_York');
    const easternDate = toZonedTime(dateToParse, userTimeZone);
    if (dateToday.getDate() === easternDate.getDate())
      return formatDistanceToNow(easternDate, { addSuffix: true });

    if (showTime) return format(easternDate, "MMMM dd, yyyy 'at' hh:mm a");
    else {
      const regexTest = /([0-9]+) day ago ||([0-9]+) days ago /;
      if (regexTest.test(formatDistanceToNow(easternDate, { addSuffix: true }))) {
        return format(easternDate, 'MMMM dd, yyyy');
      }
      return formatDistanceToNow(easternDate, { addSuffix: true });
    }
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
    case 'Critical':
    case 'critical': // Allow lowercase
      return 'destructive';
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

export const createReplyHeader = (date: Date, name: string, email: string) => {
  const formattedDate = format(date, "EEE, dd MMM yyyy 'at' h:mm a", {
    locale: enUS,
  });
  return `On ${formattedDate} ${name} <<a href="mailto:${email}">${email}</a>> wrote:<br>`;
};


/**
 * Detecta el dominio base del hostname actual
 * Ejemplos:
 * - old.enque.cc → old.enque.cc
 * - sfx.enque.cc → old.enque.cc (subdomain workspace)
 */
export function getBaseDomain(): string {
  if (typeof window === 'undefined') {
    return 'old.enque.cc'; // Fallback for SSR
  }

  const hostname = window.location.hostname;

  // Si es exactamente old.enque.cc (dominio base)
  if (hostname === 'old.enque.cc') {
    return 'old.enque.cc';
  }

  // Si es Railway (*.up.railway.app)
  if (hostname.endsWith('.up.railway.app')) {
    return hostname; // Devuelve el hostname completo de Railway
  }

  // Por defecto, old.enque.cc
  return 'old.enque.cc';
}

/**
 * Obtiene el sufijo de dominio para subdominios (ej: .enque.cc o .up.railway.app)
 */
export function getDomainSuffix(): string {
  if (typeof window === 'undefined') {
    return '.enque.cc'; // Fallback for SSR
  }

  const hostname = window.location.hostname;

  // Si es Railway
  if (hostname.endsWith('.up.railway.app')) {
    return '.up.railway.app';
  }

  // Por defecto
  return '.enque.cc';
}
