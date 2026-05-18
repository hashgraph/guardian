const BASE_URL = Cypress.config("baseUrl");
const PORT = Cypress.env("portWeb") || 4200;

function withoutTrailingSlash(url) {
	if (!url) return url;
	return url.endsWith("/") ? url.slice(0, -1) : url;
}

const URL = {
	// Web
	Root: BASE_URL ? withoutTrailingSlash(BASE_URL) : "http://localhost:" + PORT + "",

	//Tabs
	Policies: "/policy-viewer",
	Tokens: "/tokens",
	Contracts: "/contracts",
	Modules: "/modules",
	Profile: "/user-profile",
	UserTokens: "/user-profile?tab=tokens",
	Schemas: "/schemas",
	Artifacts: "/artifacts",
	Status: "/admin/status",
	Settings: "/admin/settings",
	Logs: "/admin/logs",
};

export default URL;
