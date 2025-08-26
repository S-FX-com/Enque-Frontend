import { fetchAPI } from '@/lib/fetch-api'; // Removed unused BaseResponse
// Import the report schemas defined in the backend (adjust path if needed)
// Assuming the schemas are directly usable or we create frontend-specific types
// Define types matching the backend schemas in schemas/report.py
// It might be better to move these to frontend/src/typescript/report.ts later

// Assuming TaskStatus and TaskPriority enums/types are available or defined here/imported
// For simplicity, using string literals for now. Import actual types if available.
type TaskStatus = 'Unread' | 'Open' | 'Closed';
type TaskPriority = 'Low' | 'Medium' | 'High' | 'Critical';

export interface ReportSummary {
  created_tickets: number;
  resolved_tickets: number;
  unresolved_tickets: number;
  average_response_time: string | null; // Keep as string placeholder
  avg_first_response_time: string | null; // Keep as string placeholder
  status_counts: { [key in TaskStatus]?: number }; // Use mapped type
  priority_counts: { [key in TaskPriority]?: number }; // Use mapped type
}

export interface TimeSeriesDataPoint {
  time_unit: string;
  count: number;
}

export interface CategoryDataPoint {
  category_name: string;
  count: number;
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'https://enque-backend-production.up.railway.app';

/**
 * Fetches the summary report data.
 * @param params - Optional query parameters like start_date, end_date.
 * @returns A promise that resolves to the report summary data or null on failure.
 */
export async function getReportSummary(params?: {
  start_date?: string;
  end_date?: string;
  team_id?: number;
}): Promise<ReportSummary | null> {
  try {
    const url = new URL(`${API_BASE_URL}/v1/reports/summary`);
    if (params?.start_date) url.searchParams.append('start_date', params.start_date);
    if (params?.end_date) url.searchParams.append('end_date', params.end_date);
    if (params?.team_id) url.searchParams.append('team_id', params.team_id.toString());

    const response = await fetchAPI.GET<ReportSummary>(url.toString());

    if (response.success && response.data) {
      return response.data;
    } else {
      console.error('Error fetching report summary:', response?.message || 'Unknown API error');
      return null;
    }
  } catch (error) {
    console.error('Error fetching report summary (catch block):', error);
    return null;
  }
}

/**
 * Fetches the count of tickets created per hour.
 * @param params - Optional query parameters like start_date, end_date.
 * @returns A promise that resolves to an array of TimeSeriesDataPoint or null on failure.
 */
export async function getCreatedByHourReport(params?: {
  start_date?: string;
  end_date?: string;
  team_id?: number;
}): Promise<TimeSeriesDataPoint[] | null> {
  try {
    const url = new URL(`${API_BASE_URL}/v1/reports/created_by_hour`);
    if (params?.start_date) url.searchParams.append('start_date', params.start_date);
    if (params?.end_date) url.searchParams.append('end_date', params.end_date);
    if (params?.team_id) url.searchParams.append('team_id', params.team_id.toString());

    const response = await fetchAPI.GET<TimeSeriesDataPoint[]>(url.toString());

    if (response.success && response.data) {
      return response.data;
    } else {
      console.error(
        'Error fetching created_by_hour report:',
        response?.message || 'Unknown API error'
      );
      return null;
    }
  } catch (error) {
    console.error('Error fetching created_by_hour report (catch block):', error);
    return null;
  }
}

/**
 * Fetches the count of tickets created per day of the week.
 * @param params - Optional query parameters like start_date, end_date.
 * @returns A promise that resolves to an array of TimeSeriesDataPoint or null on failure.
 */
export async function getCreatedByDayReport(params?: {
  start_date?: string;
  end_date?: string;
  team_id?: number;
}): Promise<TimeSeriesDataPoint[] | null> {
  try {
    const url = new URL(`${API_BASE_URL}/v1/reports/created_by_day`);
    if (params?.start_date) url.searchParams.append('start_date', params.start_date);
    if (params?.end_date) url.searchParams.append('end_date', params.end_date);
    if (params?.team_id) url.searchParams.append('team_id', params.team_id.toString());

    const response = await fetchAPI.GET<TimeSeriesDataPoint[]>(url.toString());

    if (response.success && response.data) {
      return response.data;
    } else {
      console.error(
        'Error fetching created_by_day report:',
        response?.message || 'Unknown API error'
      );
      return null;
    }
  } catch (error) {
    console.error('Error fetching created_by_day report (catch block):', error);
    return null;
  }
}

// Add more report service functions if needed
