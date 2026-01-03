import Fastify from "fastify";
import prismaPlugin from "./plugins/prisma";
import cors from "@fastify/cors";

import bookRoutes from "./routes/books";
import pageRoutes from "./routes/pages";
import tagRoutes from "./routes/tags";
import syncRoutes from "./routes/sync";

const app = Fastify();

app.register(prismaPlugin);
app.register(bookRoutes);
app.register(pageRoutes);
app.register(tagRoutes);
app.register(syncRoutes);

app.register(cors, { origin: "http://localhost:5173", credentials: true, }); // // or true for all origins credentials

app.listen({ port: 4000, host: "0.0.0.0" }).then(() => {
  console.log("API running on port 4000");
});
