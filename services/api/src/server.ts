import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { protocolsRoutes } from "./routes/protocols";
import { chainsRoutes } from "./routes/chains";
import { walletsRoutes } from "./routes/wallets";
import { perpsRoutes } from "./routes/perps";
import { predictionsRoutes } from "./routes/predictions";
import { positionsRoutes } from "./routes/positions";

const app = Fastify({ logger: true });

async function main() {
  await app.register(cors, { origin: true });
  await app.register(rateLimit, { max: 120, timeWindow: "1 minute" });

  app.get("/health", async () => ({ status: "ok", time: new Date().toISOString() }));

  await app.register(protocolsRoutes, { prefix: "/api/protocols" });
  await app.register(chainsRoutes, { prefix: "/api/chains" });
  await app.register(walletsRoutes, { prefix: "/api/wallets" });
  await app.register(perpsRoutes, { prefix: "/api/perps" });
  await app.register(predictionsRoutes, { prefix: "/api/predictions" });
  await app.register(positionsRoutes, { prefix: "/api/positions" });

  const port = Number(process.env.PORT ?? 4000);
  await app.listen({ port, host: "0.0.0.0" });
}

main().catch((err) => {
  app.log.error(err);
  process.exit(1);
});
