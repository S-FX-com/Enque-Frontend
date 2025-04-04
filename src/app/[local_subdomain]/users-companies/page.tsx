import { AppProvider } from "@/hooks/use-app";
import ClientPage from "./page-client";
import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";
import { GetAuth } from "@/actions/auth";

export default async function UsersCompaniesPage() {
	const currentAuth = await GetAuth();
	if (!currentAuth.success || !currentAuth.data) return;

	return (
		<AppProvider initialCurrentAgent={currentAuth.data}>
			<div className="flex h-screen overflow-hidden">
				<Sidebar />
				<div className="flex-1 bg-[#F4F7FE] flex flex-col overflow-hidden px-6">
					<Topbar
						title="Users & Companies"
						breadcrumbs={[
							{ label: "S-FX.COM", href: "/" },
							{ label: "Users & Companies", href: "/users-companies" },
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
