import { fetchAPI } from '@/lib/fetch-api';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://enque-backend-production.up.railway.app';

interface DashboardStats {
  user: {
    id: number;
    name: string;
    email: string;
    role: string;
  };
  stats: {
    ticketsAssignedCount: number;
    ticketsCompletedCount: number;
    teamsCount: number;
  };
  recentTickets: Array<{
    id: number;
    title: string;
    status: string;
    priority: string;
    created_at: string | null;
    user: {
      id: number;
      name: string;
      email: string;
    } | null;
  }>;
  teamsStats: Array<{
    id: number;
    name: string;
    description: string | null;
    ticketsOpen: number;
    ticketsWithUser: number;
    ticketsAssigned: number;
  }>;
}

export const getDashboardStats = async (): Promise<DashboardStats> => {
  try {
    const url = `${API_BASE_URL}/v1/dashboard/stats`;
    const response = await fetchAPI.GET<DashboardStats>(url);

    if (!response || !response.data) {
      throw new Error('Failed to fetch dashboard stats');
    }
    return response.data;
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    throw error;
  }
}; 