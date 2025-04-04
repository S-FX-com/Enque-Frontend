"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Sidebar } from "./sidebar";

// Sample data for charts
const hourlyData = Array.from({ length: 24 }, (_, i) => {
	return {
		hour: i.toString().padStart(2, "0"),
		tickets: Math.floor(Math.random() * 20) + 1,
	};
});

const dailyData = [
	{ day: "Mon", tickets: 18 },
	{ day: "Tues", tickets: 48 },
	{ day: "Wed", tickets: 45 },
	{ day: "Thurs", tickets: 23 },
	{ day: "Fri", tickets: 22 },
	{ day: "Sat", tickets: 4 },
	{ day: "Sun", tickets: 6 },
];

const statusData = [
	{ status: "Open", tickets: 35 },
	{ status: "Pending", tickets: 173 },
];

const priorityData = [
	{ priority: "P1", tickets: 5 },
	{ priority: "P2", tickets: 8 },
	{ priority: "P3", tickets: 3 },
];

export default function PageClient() {
	return (
		<div className="flex gap-4">
			<Sidebar />
			<div className="flex-1">
				<div className="flex justify-between items-center mb-6">
					<h1 className="text-2xl font-bold">Reporting Dashboard</h1>
					<Button variant="outline" size="sm" className="flex items-center gap-2">
						<Calendar className="h-4 w-4" />
						Last 7 days
					</Button>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
					<MetricCard title="Created Tickets" value="173" />
					<MetricCard title="Resolved Tickets" value="163" />
					<MetricCard title="Unresolved Tickets" value="10" />
					<MetricCard title="Average Response Time" value="3h 57m" />
					<MetricCard title="Avg. First Response Time" value="3h 21m" />
				</div>

				{/* Charts - First Row */}
				<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
					<Card>
						<CardContent className="p-6">
							<h3 className="text-lg font-medium mb-4">Tickets created by hour</h3>
							<div className="h-[300px]">
								<ResponsiveContainer width="100%" height="100%">
									<BarChart data={hourlyData} margin={{ top: 5, right: 20, bottom: 20, left: 0 }}>
										<CartesianGrid strokeDasharray="3 3" vertical={false} />
										<XAxis dataKey="hour" tick={{ fontSize: 12 }} interval={2} />
										<YAxis tick={{ fontSize: 12 }} />
										<Tooltip />
										<Bar dataKey="tickets" fill="#a5d8dd" radius={[4, 4, 0, 0]} />
									</BarChart>
								</ResponsiveContainer>
							</div>
						</CardContent>
					</Card>

					<Card>
						<CardContent className="p-6">
							<h3 className="text-lg font-medium mb-4">Tickets created by day</h3>
							<div className="h-[300px]">
								<ResponsiveContainer width="100%" height="100%">
									<BarChart data={dailyData} margin={{ top: 5, right: 20, bottom: 20, left: 0 }}>
										<CartesianGrid strokeDasharray="3 3" vertical={false} />
										<XAxis dataKey="day" tick={{ fontSize: 12 }} />
										<YAxis tick={{ fontSize: 12 }} />
										<Tooltip />
										<Bar dataKey="tickets" fill="#a5d8dd" radius={[4, 4, 0, 0]} />
									</BarChart>
								</ResponsiveContainer>
							</div>
						</CardContent>
					</Card>
				</div>

				{/* Charts - Second Row */}
				<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
					<Card>
						<CardContent className="p-6">
							<h3 className="text-lg font-medium mb-4">Created tickets by status</h3>
							<div className="h-[200px]">
								<ResponsiveContainer width="100%" height="100%">
									<BarChart data={statusData} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 50 }}>
										<CartesianGrid strokeDasharray="3 3" horizontal={false} />
										<XAxis type="number" tick={{ fontSize: 12 }} />
										<YAxis dataKey="status" type="category" tick={{ fontSize: 12 }} />
										<Tooltip />
										<Bar dataKey="tickets" fill="#a5d8dd" radius={[0, 4, 4, 0]} />
									</BarChart>
								</ResponsiveContainer>
							</div>
						</CardContent>
					</Card>

					<Card>
						<CardContent className="p-6">
							<h3 className="text-lg font-medium mb-4">Created tickets by priority</h3>
							<div className="h-[200px]">
								<ResponsiveContainer width="100%" height="100%">
									<BarChart data={priorityData} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 50 }}>
										<CartesianGrid strokeDasharray="3 3" horizontal={false} />
										<XAxis type="number" tick={{ fontSize: 12 }} />
										<YAxis dataKey="priority" type="category" tick={{ fontSize: 12 }} />
										<Tooltip />
										<Bar dataKey="tickets" fill="#a5d8dd" radius={[0, 4, 4, 0]} />
									</BarChart>
								</ResponsiveContainer>
							</div>
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}

// Metric Card Component
function MetricCard({ title, value }: { title: string; value: string }) {
	return (
		<Card>
			<CardContent className="p-6 flex flex-col items-center justify-center text-center">
				<h3 className="text-sm font-medium text-muted-foreground mb-2">{title}</h3>
				<p className="text-3xl font-bold">{value}</p>
			</CardContent>
		</Card>
	);
}
