import { FastifyInstance } from "fastify";
import { bookService } from "../services/bookService";

export default async function bookRoutes(app: FastifyInstance) {
  app.get("/books", () => bookService.getAll());
  app.post("/books", (req) => bookService.create(req.body as any));
  app.patch("/books/:id", (req) => bookService.update((req.params as any).id, req.body as any));
  app.delete("/books/:id", (req) => bookService.delete((req.params as any).id));
}
