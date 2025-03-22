import { AppProvider } from "@/hooks/use-app";
import { Sidebar } from "@/components/sidebar";
import { UserNav } from "@/components/usernav";
import { GetAuth } from "@/actions/auth.action";
import TasksClientPage from "./page-client";

export default async function TasksPage() {
	const currentUser = await GetAuth();

	return (
		<AppProvider initialCurrentUser={currentUser.data}>
			<div className="flex h-screen overflow-hidden">
				<Sidebar />
				<div className="flex-1 bg-[#F4F7FE] flex flex-col overflow-hidden">
					<div className="flex h-16 items-center justify-end border-b px-6 bg-white">
						<UserNav />
					</div>
					<main className="flex-1 overflow-hidden">
						<TasksClientPage />
					</main>
				</div>
			</div>
		</AppProvider>
	);
}
