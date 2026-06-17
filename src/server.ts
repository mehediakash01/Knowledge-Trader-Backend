import "dotenv/config";
import { createServer } from "node:http";
import app from "./app";
import config from "./config";
import { initSocket } from "./socket";
import { prisma } from "../lib/prisma";

async function main() {
  await prisma.$connect();
  const server = createServer(app);

  initSocket(server);

  server.listen(config.port, '0.0.0.0', () => {
    console.log(`Knowledge Trader server is running on port ${config.port}`);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
