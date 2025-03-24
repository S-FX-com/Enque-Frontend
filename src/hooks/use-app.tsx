"use client";

import { IAgent } from "@/typescript/agent";
import { createContext, useContext, useState } from "react";

interface AppContextType {
	currentAgent?: IAgent;
	setCurrentAgent: (user: IAgent) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children, initialCurrentUser }: { children: React.ReactNode; initialCurrentUser?: IAgent }) => {
	const [currentAgent, setCurrentAgent] = useState<IAgent | undefined>(initialCurrentUser);

	return <AppContext.Provider value={{ currentAgent, setCurrentAgent }}>{children}</AppContext.Provider>;
};

export const useApp = () => {
	const context = useContext(AppContext);
	if (!context) {
		throw new Error("useApp() must be used within an AppProvider");
	}
	return context;
};
