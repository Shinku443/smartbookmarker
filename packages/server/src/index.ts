import Fastify from "fastify";
import prismaPlugin from "./plugins/prisma";
import cors from "@fastify/cors";

import bookRoutes from "./routes/books";
import pageRoutes from "./routes/pages";
import tagRoutes from "./routes/tags";
import syncRoutes from "./routes/sync";

const app = Fastify();

// Register plugins first
app.register(cors, {
  origin: true, // Allow all origins for testing
  credentials: true
});

app.register(prismaPlugin);

// Register routes after plugins
app.register(bookRoutes);
app.register(pageRoutes);
app.register(tagRoutes);
app.register(syncRoutes);

// Health check and utility routes
app.get("/health", async () => {
  console.log('[API] GET /health - health check');
  return {
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: "1.0.0"
  };
});

// Test route to verify server is working
app.get("/test", async () => {
  return { message: "Server is working!" };
});

app.listen({ port: 4000, host: "0.0.0.0" }).then(() => {
  console.log("API running on port 4000");
});
