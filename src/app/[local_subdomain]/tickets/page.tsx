import { AppProvider } from "@/hooks/use-app";
import ClientPage from "./page-client";
import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";
import { GetAuth } from "@/actions/auth";
import { GetWorkspace } from "@/actions/workspace";

export default async function TicketsPage() {
	const currentAuth = await GetAuth();
	if (!currentAuth.success || !currentAuth.data) return;

	const currentWorkspace = await GetWorkspace();
	if (!currentWorkspace.success || !currentWorkspace.data) return;

	return (
		<AppProvider initialCurrentAgent={currentAuth.data} initialCurrentWorkspace={currentWorkspace.data}>
			<div className="flex h-screen overflow-hidden">
				<Sidebar />
				<div className="flex-1 flex flex-col overflow-hidden px-6">
					<Topbar
						title="Tickets"
						breadcrumbs={[
							{ label: "S-FX.COM", href: "/" },
							{ label: "Tickets", href: "/tickets" },
						]}
					/>
					<main className="flex-1 overflow-hidden">
						<ClientPage />
					</main>
				</div>
			</div>
		</AppProvider>
	);
}
