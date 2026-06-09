// @ts-ignore
import compiledServer from "../dist/server.js";

// Support both direct export and default wrapper configurations
const app = (compiledServer as any).default || compiledServer;

export default app;
