'use client';

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  getReportSummary,
  getCreatedByHourReport,
  getCreatedByDayReport,
} from '@/services/reports';
import type { TimeSeriesDataPoint } from '@/services/reports';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getTeams, getAgentTeams } from '@/services/team';
import { useAuth } from '@/hooks/use-auth';
import type { Team } from '@/typescript/team';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';

type ChartDataPoint = {
  name: string;
  count: number;
};

const renderBarChart = (
  title: string,
  data: ChartDataPoint[] | null | undefined,
  dataKey: string,
  nameKey: string,
  isLoading: boolean
) => (
  <Card>
    <CardHeader>
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
    </CardHeader>
    <CardContent className="h-[300px] p-2">
      {isLoading ? (
        <div className="flex items-center justify-center h-full">
          <Skeleton className="h-full w-full" />
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data ?? []} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey={nameKey} fontSize={12} tickLine={false} axisLine={false} />
            <YAxis fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip cursor={{ fill: 'transparent' }} />
            <Bar dataKey={dataKey} fill="#99E6D8" radius={[4, 4, 0, 0]} barSize={50} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </CardContent>
  </Card>
);

export function ReportsClientContent() {
  const { user } = useAuth();
  const [timeRange, setTimeRange] = useState('last7days');
  const [selectedTeamId, setSelectedTeamId] = useState<string>('all');
  const [customDateRange, setCustomDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: undefined,
    to: undefined,
  });
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  // Load teams for the current user
  const { data: teamsData = [] } = useQuery<Team[]>({
    queryKey: user?.role === 'admin' ? ['teams'] : ['agentTeams', user?.id],
    queryFn: async () => {
      if (!user) return [];
      if (user.role === 'admin') {
        return getTeams();
      } else if (user.id) {
        return getAgentTeams(user.id);
      }
      return [];
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
  });

  const { startDate, endDate } = useMemo(() => {
    // If custom range is selected and both dates are set, use them
    if (timeRange === 'custom' && customDateRange.from && customDateRange.to) {
      const start = new Date(customDateRange.from);
      const end = new Date(customDateRange.to);
      // Set start time to beginning of day and end time to end of day
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      return { startDate: start.toISOString(), endDate: end.toISOString() };
    }

    // Default behavior for preset ranges
    const end = new Date();
    const start = new Date();
    switch (timeRange) {
      case 'last24hours':
        start.setDate(end.getDate() - 1);
        break;
      case 'last30days':
        start.setDate(end.getDate() - 30);
        break;
      case 'last90days':
        start.setDate(end.getDate() - 90);
        break;
      case 'last7days':
      default:
        start.setDate(end.getDate() - 7);
        break;
    }
    return { startDate: start.toISOString(), endDate: end.toISOString() };
  }, [timeRange, customDateRange]);

  // Build report parameters
  const reportParams = useMemo(() => {
    const params: { start_date: string; end_date: string; team_id?: number } = {
      start_date: startDate,
      end_date: endDate,
    };
    if (selectedTeamId !== 'all') {
      params.team_id = parseInt(selectedTeamId);
    }
    return params;
  }, [startDate, endDate, selectedTeamId]);

  // Handle time range change
  const handleTimeRangeChange = (value: string) => {
    setTimeRange(value);
    if (value !== 'custom') {
      // Reset custom date range when switching to preset ranges
      setCustomDateRange({ from: undefined, to: undefined });
    }
  };

  // Handle custom date range selection
  const handleDateRangeSelect = (range: { from?: Date; to?: Date } | undefined) => {
    if (range) {
      setCustomDateRange({ from: range.from, to: range.to });
      if (range.from && range.to) {
        setIsDatePickerOpen(false);
      }
    }
  };

  const { data: summaryData, isLoading: isLoadingSummary } = useQuery({
    queryKey: ['reportSummary', reportParams],
    queryFn: () => getReportSummary(reportParams),
    staleTime: 5 * 60 * 1000,
  });

  const { data: createdByHourData, isLoading: isLoadingCreatedByHour } = useQuery({
    queryKey: ['reportCreatedByHour', reportParams],
    queryFn: () => getCreatedByHourReport(reportParams),
    staleTime: 5 * 60 * 1000,
  });

  const { data: createdByDayData, isLoading: isLoadingCreatedByDay } = useQuery({
    queryKey: ['reportCreatedByDay', reportParams],
    queryFn: () => getCreatedByDayReport(reportParams),
    staleTime: 5 * 60 * 1000,
  });

  const statusChartData: ChartDataPoint[] = useMemo(
    () =>
      summaryData?.status_counts
        ? Object.entries(summaryData.status_counts).map(([status, count]) => ({
            name: status,
            count: count ?? 0,
          }))
        : [],
    [summaryData]
  );

  const priorityChartData: ChartDataPoint[] = useMemo(
    () =>
      summaryData?.priority_counts
        ? Object.entries(summaryData.priority_counts).map(([priority, count]) => ({
            name: priority,
            count: count ?? 0,
          }))
        : [],
    [summaryData]
  );

  const hourChartData: ChartDataPoint[] = useMemo(
    () =>
      createdByHourData
        ? createdByHourData.map(item => ({ name: item.time_unit, count: item.count }))
        : [],
    [createdByHourData]
  );

  const dayChartData: ChartDataPoint[] = useMemo(
    () =>
      createdByDayData
        ? createdByDayData.map((item: TimeSeriesDataPoint) => ({
            name: item.time_unit,
            count: item.count,
          }))
        : [],
    [createdByDayData]
  );

  const renderSummaryCard = (
    title: string,
    value: string | number | null | undefined,
    isLoading: boolean
  ) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-1/2" />
        ) : (
          <div className="text-2xl font-bold">{value ?? 'N/A'}</div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Reporting Dashboard</h1>
        <div className="flex items-center gap-4">
          <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select team" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Teams</SelectItem>
              {teamsData.map(team => (
                <SelectItem key={team.id} value={team.id.toString()}>
                  {team.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <Select value={timeRange} onValueChange={handleTimeRangeChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select time range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="last24hours">Last 24 hours</SelectItem>
                <SelectItem value="last7days">Last 7 days</SelectItem>
                <SelectItem value="last30days">Last 30 days</SelectItem>
                <SelectItem value="last90days">Last 90 days</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>

            {timeRange === 'custom' && (
              <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-[280px] justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {customDateRange.from ? (
                      customDateRange.to ? (
                        <>
                          {format(customDateRange.from, 'LLL dd, y')} -{' '}
                          {format(customDateRange.to, 'LLL dd, y')}
                        </>
                      ) : (
                        format(customDateRange.from, 'LLL dd, y')
                      )
                    ) : (
                      <span>Pick a date range</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={customDateRange.from}
                    selected={customDateRange}
                    onSelect={handleDateRangeSelect}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
        {renderSummaryCard('Created Tickets', summaryData?.created_tickets, isLoadingSummary)}
        {renderSummaryCard('Closed Tickets', summaryData?.resolved_tickets, isLoadingSummary)}
        {renderSummaryCard('Open Tickets', summaryData?.unresolved_tickets, isLoadingSummary)}
        {renderSummaryCard(
          'Average Response Time',
          summaryData?.average_response_time,
          isLoadingSummary
        )}
        {renderSummaryCard(
          'Avg. First Response Time',
          summaryData?.avg_first_response_time,
          isLoadingSummary
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {renderBarChart(
          'Tickets created by hour',
          hourChartData,
          'count',
          'name',
          isLoadingCreatedByHour
        )}
        {renderBarChart(
          'Tickets created by day',
          dayChartData,
          'count',
          'name',
          isLoadingCreatedByDay
        )}

        {renderBarChart(
          'Created tickets by status',
          statusChartData,
          'count',
          'name',
          isLoadingSummary
        )}
        {renderBarChart(
          'Created tickets by priority',
          priorityChartData,
          'count',
          'name',
          isLoadingSummary
        )}
      </div>
    </div>
  );
}
