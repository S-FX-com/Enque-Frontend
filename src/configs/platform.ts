import { AppConfigs } from "./app";

/** Platform-level configuration */
export const PlatformConfigs = {
	name: "ObieDesk",
	url: (subdomain?: string) => {
		const protocol = AppConfigs.protocol;
		const host = AppConfigs.host;
		return subdomain ? `${protocol}://${subdomain}.${host}` : `${protocol}://${host}`;
	},
};
