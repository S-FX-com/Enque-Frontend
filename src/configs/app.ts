const NODE_ENV = process.env.NODE_ENV || "development";
const PORT = process.env.PORT || 3000;
const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "obiedesk";
const APP_HOST = process.env.NEXT_PUBLIC_APP_HOST || "localhost";
const APP_PROTOCOL = process.env.NEXT_PUBLIC_APP_PROTOCOL || "http";

/** Configuración a nivel de aplicación */
export const AppConfigs = {
	name: APP_NAME,
	host: NODE_ENV === "development" ? `${APP_HOST}:${PORT}` : APP_HOST,
	hostWithPort: `${APP_HOST}:${PORT}`,
	hostWithoutPort: APP_HOST,
	protocol: APP_PROTOCOL,
	cookies: {
		accessToken: {
			name: "accessToken",
		},
	},
};
