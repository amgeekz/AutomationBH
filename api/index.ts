// @ts-ignore
import compiledServer from "../dist/server.cjs";

// Mendukung direct-export maupun default-wrapper untuk kompatibilitas penuh
const app = compiledServer.default || compiledServer;

export default app;
