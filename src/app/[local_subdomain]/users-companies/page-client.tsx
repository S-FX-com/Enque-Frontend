"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";

export default function ClientPage() {
	const companies = [
		{ name: "CareContrix", logo: "/placeholder.svg?height=32&width=32", color: "bg-purple-100" },
		{ name: "CMT Association", logo: "/placeholder.svg?height=32&width=32", color: "bg-gray-100" },
		{ name: "HG Farms", logo: "/placeholder.svg?height=32&width=32", color: "bg-green-100" },
		{ name: "IES", logo: "/placeholder.svg?height=32&width=32", color: "bg-yellow-100" },
		{ name: "Monarch Housing", logo: "/placeholder.svg?height=32&width=32", color: "bg-gray-800" },
		{ name: "NHLGA", logo: "/placeholder.svg?height=32&width=32", color: "bg-gray-200" },
		{ name: "DRTC", logo: "/placeholder.svg?height=32&width=32", color: "bg-teal-100" },
		{ name: "Sage Pub", logo: "/placeholder.svg?height=32&width=32", color: "bg-gray-200" },
		{ name: "Urgent Care Now", logo: "/placeholder.svg?height=32&width=32", color: "bg-red-100" },
		{ name: "Window Treats", logo: "/placeholder.svg?height=32&width=32", color: "bg-amber-100" },
	];

	return (
		<div className="">
			<div className="flex gap-2 mb-6">
				<Button variant="default" size="sm">
					Unassigned Users
				</Button>
				<Button variant="default" size="sm">
					Add a Company
				</Button>
				<Button variant="default" size="sm">
					Add a User
				</Button>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-4 gap-6">
				<div className="bg-white dark:bg-black rounded-xl p-4 ">
					<h2 className="text-xl font-semibold mb-4">Active Companies</h2>
					<div className="space-y-4">
						{companies.map((company, index) => (
							<div key={index} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-md cursor-pointer">
								<div className={`w-8 h-8 rounded-full flex items-center justify-center ${company.color}`}>
									<Image src={company.logo || "/placeholder.svg"} alt={company.name} width={24} height={24} />
								</div>
								<span className="text-sm">{company.name}</span>
							</div>
						))}
					</div>
				</div>

				<div className="md:col-span-3 bg-white rounded-xl p-8 flex flex-col items-center justify-center min-h-[400px]">
					<div>
						<p className="mb-4">Select a company on the left</p>
					</div>
					<span className="mb-4">- or -</span>
					<div className="flex gap-2">
						<Button variant="default" size="sm">
							Add a Company
						</Button>
						<Button variant="default" size="sm">
							Add a User
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}
