import Fastify from "fastify";
import prismaPlugin from "./plugins/prisma";

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

app.listen({ port: 4000, host: "0.0.0.0" }).then(() => {
  console.log("API running on port 4000");
});
