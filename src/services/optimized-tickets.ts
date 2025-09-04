/**
 * 🚀 OPTIMIZED TICKET SERVICES
 * Servicios optimizados para reducir el consumo de ancho de banda
 * y mejorar el rendimiento de la aplicación
 */

import { apiClient } from '@/lib/api';

export interface TicketCount {
  count: number;
  agent_id?: number;
  filters?: {
    status?: string;
    team_id?: number;
    assignee_id?: number;
  };
  query_time: number;
}

/**
 * 🚀 OPTIMIZADO: Obtener conteo de tickets asignados sin descargar data
 * Reemplaza la descarga masiva de 10,000 tickets en el sidebar
 */
export async function getAssigneeTicketsCount(
  agentId: number,
  status?: string
): Promise<number> {
  try {
    const params = new URLSearchParams();
    
    if (status) {
      params.append('status', status);
    }
    
    const url = `/tasks-optimized/assignee/${agentId}/count${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await apiClient.get<TicketCount>(url);
    
    console.log(`✅ Ticket count for agent ${agentId}: ${response.data.count} (${response.data.query_time}ms)`);
    return response.data.count;
  } catch (error) {
    console.error('❌ Error getting assignee tickets count:', error);
    return 0;
  }
}

/**
 * 🚀 OPTIMIZADO: Obtener conteo general de tickets con filtros
 */
export async function getTicketsCount(filters?: {
  status?: string;
  team_id?: number;
  assignee_id?: number;
}): Promise<number> {
  try {
    const params = new URLSearchParams();
    
    if (filters?.status) params.append('status', filters.status);
    if (filters?.team_id) params.append('team_id', filters.team_id.toString());
    if (filters?.assignee_id) params.append('assignee_id', filters.assignee_id.toString());
    
    const url = `/tasks-optimized/count${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await apiClient.get<TicketCount>(url);
    
    console.log(`✅ General ticket count: ${response.data.count} (${response.data.query_time}ms)`);
    return response.data.count;
  } catch (error) {
    console.error('❌ Error getting tickets count:', error);
    return 0;
  }
}

/**
 * 🚀 OPTIMIZADO: Hook para invalidar cachés cuando se crean/actualizan tickets
 */
export const CACHE_KEYS = {
  ASSIGNEE_COUNT: (agentId: number) => ['ticketsCount', 'assignee', agentId],
  GENERAL_COUNT: (filters?: {
    status?: string;
    team_id?: number;
    assignee_id?: number;
  }) => ['ticketsCount', 'general', filters],
  TEAM_COUNT: (teamId: number) => ['ticketsCount', 'team', teamId],
} as const;

/**
 * 🚀 OPTIMIZADO: Configuración de TTL para cachés
 */
export const CACHE_CONFIG = {
  // Conteos se cachean por 5 minutos (en lugar de descargar constantemente)
  COUNT_TTL: 1000 * 60 * 5,
  // HTML content se cachea por 3 minutos (ya está en el backend también)
  HTML_CONTENT_TTL: 1000 * 60 * 3,
  // Listas de tickets por 2 minutos
  TICKETS_LIST_TTL: 1000 * 60 * 2,
} as const;
