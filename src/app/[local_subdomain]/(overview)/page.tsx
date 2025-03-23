import { AppProvider } from "@/hooks/use-app";
import OverviewClientPage from "./page-client";
import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";
import { GetAuth } from "@/actions/auth";

export default async function OverviewPage() {
	const currentUser = await GetAuth();

	return (
		<AppProvider initialCurrentUser={currentUser.data}>
			<div className="flex h-screen overflow-hidden">
				<Sidebar />
				<div className="flex-1 bg-[#F4F7FE] flex flex-col overflow-hidden">
					<div className="flex h-16 items-center justify-end border-b px-6 bg-white">
						<Topbar />
					</div>
					<main className="flex-1 overflow-hidden">
						<OverviewClientPage />
					</main>
				</div>
			</div>
		</AppProvider>
	);
}
