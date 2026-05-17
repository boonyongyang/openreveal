import { buildServer } from "./server.js";
import { config } from "./config.js";

const app = await buildServer();

try {
  await app.listen({ port: config.port, host: "0.0.0.0" });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
