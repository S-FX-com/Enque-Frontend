import { TasksList } from "../tickets/tasks-list";
import { redirect } from "next/navigation";

export default async function MyTicketsClientPage({ searchParams }: { searchParams?: { [key: string]: string | string[] | undefined } }) {
	// Obtener la sesión del usuario actual
	const session = await getServerSession();

	if (!session?.user?.id) {
		redirect("/login");
	}

	// Crear un objeto de filtros manualmente en lugar de usar spread operator
	const filters: Record<string, string | string[]> = {
		agent: session.user.id.toString(),
	};

	// Añadir manualmente los parámetros que necesitamos
	if (searchParams?.subject) filters.subject = searchParams.subject;
	if (searchParams?.status) filters.status = searchParams.status;
	if (searchParams?.priority) filters.priority = searchParams.priority;
	if (searchParams?.includeDeleted) filters.includeDeleted = searchParams.includeDeleted;

	// Obtener los tickets asignados al usuario actual
	const myTickets = await getTasks(filters);

	return (
		<div className="flex flex-1 h-full overflow-hidden">
			<div className="flex-1 px-8 flex flex-col overflow-hidden py-6">
				<div className="mb-6">
					<h1 className="text-3xl font-bold tracking-tight text-[#2B3674]">My Tickets</h1>
				</div>
				<div className="bg-white rounded-xl shadow-sm flex-1 overflow-hidden">
					<TasksList tickets={myTickets} />
				</div>
			</div>
			{/* No sidebar with filters for My Tickets */}
		</div>
	);
}
