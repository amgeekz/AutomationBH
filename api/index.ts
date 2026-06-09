// @ts-ignore
import compiledServer from "../dist/server.js";

// Support both direct export and default wrapper configurations
const app = compiledServer.default || compiledServer;

export default app;

