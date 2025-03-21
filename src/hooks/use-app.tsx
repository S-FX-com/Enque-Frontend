"use client";

import { IUser } from "@/typescript/user";
import { createContext, useContext, useState } from "react";

interface AppContextType {
	currentUser?: IUser;
	setCurrentUser: (user: IUser) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children, initialCurrentUser }: { children: React.ReactNode; initialCurrentUser?: IUser }) => {
	const [currentUser, setCurrentUser] = useState<IUser | undefined>(initialCurrentUser);

	return <AppContext.Provider value={{ currentUser, setCurrentUser }}>{children}</AppContext.Provider>;
};

export const useApp = () => {
	const context = useContext(AppContext);
	if (!context) {
		throw new Error("useApp() must be used within an AppProvider");
	}
	return context;
};
