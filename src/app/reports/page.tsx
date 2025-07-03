'use client';

import React, { useState, useMemo } from 'react'; // Import useMemo
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

export default function ReportsPage() {
  const [timeRange, setTimeRange] = useState('last7days');

  const { startDate, endDate } = useMemo(() => {
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
  }, [timeRange]);

  const { data: summaryData, isLoading: isLoadingSummary } = useQuery({
    queryKey: ['reportSummary', startDate, endDate],
    queryFn: () => getReportSummary({ start_date: startDate, end_date: endDate }),
    staleTime: 5 * 60 * 1000,
  });

  const { data: createdByHourData, isLoading: isLoadingCreatedByHour } = useQuery({
    queryKey: ['reportCreatedByHour', startDate, endDate],
    queryFn: () => getCreatedByHourReport({ start_date: startDate, end_date: endDate }),
    staleTime: 5 * 60 * 1000,
  });

  const { data: createdByDayData, isLoading: isLoadingCreatedByDay } = useQuery({
    queryKey: ['reportCreatedByDay', startDate, endDate],
    queryFn: () => getCreatedByDayReport({ start_date: startDate, end_date: endDate }),
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
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select time range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="last24hours">Last 24 hours</SelectItem>
            <SelectItem value="last7days">Last 7 days</SelectItem>
            <SelectItem value="last30days">Last 30 days</SelectItem>
            <SelectItem value="last90days">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
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
