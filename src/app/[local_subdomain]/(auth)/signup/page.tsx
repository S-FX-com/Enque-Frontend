import { GetWorkspace } from "@/actions/workspace";
import ClientPage from "./page-client";
import { AppProvider } from "@/hooks/use-app";

export default async function SignUpPage() {
	const currentWorkspace = await GetWorkspace();
	if (!currentWorkspace.success || !currentWorkspace.data) return;

	return (
		<AppProvider initialCurrentWorkspace={currentWorkspace.data}>
			<ClientPage />
		</AppProvider>
	);
}
