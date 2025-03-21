import { AppConfigs } from "./app";

/** Configuración a nivel de plataforma */
export const PlatformConfigs = {
	name: "ObieDesk",
	url: (subdomain?: string) => {
		const protocol = AppConfigs.protocol;
		const host = AppConfigs.host;
		return subdomain ? `${protocol}://${subdomain}.${host}` : `${protocol}://${host}`;
	},
};
