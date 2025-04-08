import { AppProvider } from "@/hooks/use-app";
import ClientPage from "./page-client";
import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";
import { GetAuth } from "@/actions/auth";
import { GetWorkspace } from "@/actions/workspace";
import { CreateTicketModal } from "@/components/modals/create-ticket-modal";

export default async function MyTicketsPage() {
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
						title="My Tickets"
						breadcrumbs={[
							{ label: "S-FX.COM", href: "/" },
							{ label: "My Tickets", href: "/my-tickets" },
						]}
						extra={<CreateTicketModal TriggerSize="sm" />}
					/>
					<main className="flex-1 overflow-hidden">
						<ClientPage />
					</main>
				</div>
			</div>
		</AppProvider>
	);
}
