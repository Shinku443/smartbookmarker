import { FastifyInstance } from "fastify";
import { pageService } from "../services/pageService";

export default async function pageRoutes(app: FastifyInstance) {
  app.get("/pages/:bookId", (req) => pageService.getAll((req.params as any).bookId));
  app.post("/pages", (req) => pageService.create(req.body as any));
  app.patch("/pages/:id", (req) => pageService.update((req.params as any).id, req.body as any));
  app.delete("/pages/:id", (req) => pageService.delete((req.params as any).id));
}
