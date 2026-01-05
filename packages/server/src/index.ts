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

app.listen({ port: 4000, host: "0.0.0.0" }).then(() => {
  console.log("API running on port 4000");
});
