"use client";

import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";

export default function ClientPage() {
	const tickets = [
		{ date: "Feb 20", subject: "Lorem ipsum dolor sit amet, consectetur adipiscing", progress: 40 },
		{ date: "Feb 20", subject: "Lorem ipsum dolor sit amet, consectetur adipiscing", progress: 25 },
		{ date: "Feb 20", subject: "Lorem ipsum dolor sit amet, consectetur adipiscing", progress: 70 },
		{ date: "Feb 20", subject: "Lorem ipsum dolor sit amet, consectetur adipiscing", progress: 50 },
		{ date: "Feb 20", subject: "Lorem ipsum dolor sit amet, consectetur adipiscing", progress: 70 },
	];

	const teams = [
		{ name: "Lorem Ipsum", ticketsOpen: 0, ticketsWithYou: 0, ticketsAssigned: 0 },
		{ name: "Lorem Ipsum", ticketsOpen: 0, ticketsWithYou: 0, ticketsAssigned: 0 },
		{ name: "Lorem Ipsum", ticketsOpen: 0, ticketsWithYou: 0, ticketsAssigned: 0 },
	];

	return (
		<div className="">
			<div className="bg-white dark:bg-black rounded-xl p-8 mb-6">
				<div className="flex flex-col items-center mb-8">
					<div className="relative mb-2">
						<Image src="/placeholder.svg?height=80&width=80" alt="Profile picture" width={80} height={80} className="rounded-full" />
						<div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
					</div>
					<h2 className="text-xl font-semibold">Shane Skwarek</h2>
					<p className="text-sm text-muted-foreground">Chief Technologist</p>
				</div>

				<div className="grid grid-cols-3 gap-4 text-center">
					<div>
						<p className="text-3xl font-bold">0</p>
						<p className="text-xs">Tickets Assigned</p>
					</div>
					<div>
						<p className="text-3xl font-bold">0</p>
						<p className="text-xs">Tickets Completed</p>
					</div>
					<div>
						<p className="text-3xl font-bold">0</p>
						<p className="text-xs">Teams</p>
					</div>
				</div>
			</div>

			<div className="grid md:grid-cols-2 gap-6">
				<Card>
					<CardContent className="p-0">
						<div className="p-4 border-b">
							<h3 className="text-lg font-medium">My Tickets</h3>
						</div>
						<div className="divide-y">
							<div className="grid grid-cols-12 px-4 py-2 text-sm font-medium text-gray-500">
								<div className="col-span-2">Date</div>
								<div className="col-span-7">Subject</div>
								<div className="col-span-3">Progress</div>
							</div>
							{tickets.map((ticket, index) => (
								<div key={index} className="grid grid-cols-12 px-4 py-3 items-center">
									<div className="col-span-2 text-sm text-gray-500">{ticket.date}</div>
									<div className="col-span-7 text-sm truncate">{ticket.subject}</div>
									<div className="col-span-3">
										<div className="w-full bg-gray-200 rounded-full h-2">
											<div className="bg-blue-500 h-2 rounded-full" style={{ width: `${ticket.progress}%` }}></div>
										</div>
									</div>
								</div>
							))}
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardContent className="p-0">
						<div className="p-4 border-b">
							<h3 className="text-lg font-medium">My Teams</h3>
						</div>
						<div className="divide-y">
							{teams.map((team, index) => (
								<div key={index} className="p-4">
									<h4 className="font-medium mb-2">{team.name}</h4>
									<div className="grid grid-cols-3 gap-2 text-sm">
										<div className="flex items-center gap-1">
											<span className="text-gray-800 font-medium">{team.ticketsOpen}</span>
											<span className="text-gray-500">Tickets Open</span>
										</div>
										<div className="flex items-center gap-1">
											<span className="text-gray-800 font-medium">{team.ticketsWithYou}</span>
											<span className="text-gray-500">Tickets With You</span>
										</div>
										<div className="flex items-center gap-1">
											<span className="text-gray-800 font-medium">{team.ticketsAssigned}</span>
											<span className="text-gray-500">Tickets Assigned</span>
										</div>
									</div>
								</div>
							))}
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
