// import Fastify from 'fastify'
// import prismaPlugin  from './plugins/prisma'
// import booksRoutes from './routes/books'
// import pagesRoutes from './routes/pages'
// import tagsRoutes from './routes/tags'
// import syncRoutes from './routes/sync'
// import authRoutes from './routes/auth'

// // Build the Fastify instance so tests and tooling can reuse it
// export async function buildServer() {
//   const app = Fastify({
//     logger: true,
//   })

//   // Plugins
//   app.register(prismaPlugin)

//   // Routes
//   app.register(authRoutes, { prefix: '/auth' })
//   app.register(booksRoutes, { prefix: '/books' })
//   app.register(pagesRoutes, { prefix: '/pages' })
//   app.register(tagsRoutes, { prefix: '/tags' })
//   app.register(syncRoutes, { prefix: '/sync' })

//   return app
// }

// // If run directly: start the HTTP server
// if (require.main === module) {
//   ;(async () => {
//     const app = await buildServer()
//     try {
//       await app.listen({ port: 4000, host: '0.0.0.0' })
//       app.log.info('Emperor API running on http://localhost:4000')
//     } catch (err) {
//       app.log.error(err)
//       process.exit(1)
//     }
//   })()
// }
import Fastify from "fastify";
import prismaPlugin from "./plugins/prisma";

const app = Fastify();

app.register(prismaPlugin);

app.get("/", async () => ({ status: "ok" }));

app.listen({ port: 4000, host: "0.0.0.0" }).then(() => {
  console.log("API running on port 4000");
});