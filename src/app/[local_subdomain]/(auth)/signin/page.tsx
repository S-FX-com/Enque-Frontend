import ClientPage from "./page-client";
import { AppProvider } from "@/hooks/use-app";

export default async function SignInPage() {
	return (
		<AppProvider>
			<ClientPage />
		</AppProvider>
	);
}
