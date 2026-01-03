import { FastifyInstance } from "fastify";
import { tagService } from "../services/tagService";

export default async function tagRoutes(app: FastifyInstance) {
  app.get("/tags", () => tagService.getAll());
  app.post("/tags", (req) => tagService.create(req.body as any));
  app.delete("/tags/:id", (req) => tagService.delete((req.params as any).id));
}
