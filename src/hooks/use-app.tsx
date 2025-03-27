"use client";

import { IAgent } from "@/typescript/agent";
import { IWorkspace } from "@/typescript/workspace";
import { createContext, useContext, useState } from "react";

interface AppContextType {
	currentAgent?: IAgent;
	setCurrentAgent: (agent: IAgent) => void;
	currentWorkspace?: IWorkspace;
	setCurrentWorkspace: (workspace: IWorkspace) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({
	children,
	initialCurrentAgent,
	initialCurrentWorkspace,
}: {
	children: React.ReactNode;
	initialCurrentAgent?: IAgent;
	initialCurrentWorkspace?: IWorkspace;
}) => {
	const [currentAgent, setCurrentAgent] = useState<IAgent | undefined>(initialCurrentAgent);
	const [currentWorkspace, setCurrentWorkspace] = useState<IWorkspace | undefined>(initialCurrentWorkspace);

	return <AppContext.Provider value={{ currentAgent, setCurrentAgent, currentWorkspace, setCurrentWorkspace }}>{children}</AppContext.Provider>;
};

export const useApp = () => {
	const context = useContext(AppContext);
	if (!context) {
		throw new Error("useApp() must be used within an AppProvider");
	}
	return context;
};
