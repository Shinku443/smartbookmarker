import { FastifyInstance } from "fastify";
import { bookService } from "../services/bookService";

export default async function bookRoutes(app: FastifyInstance) {
  // GET /books
  app.get("/books", async () => {
    return bookService.getAll();
  });

  // POST /books
  app.post("/books", async (req) => {
    const body = req.body as {
      title: string;
      emoji?: string | null;
    };

    return bookService.create({
      title: body.title,
      emoji: body.emoji ?? null,
    });
  });

  // PATCH /books/:id
  app.patch("/books/:id", async (req) => {
    const { id } = req.params as { id: string };
    const body = req.body as Partial<{
      title: string;
      emoji: string | null;
      order: number;
    }>;

    return bookService.update(id, {
      title: body.title,
      emoji: body.emoji ?? null,
      order: body.order,
    });
  });

  // DELETE /books/:id
  app.delete("/books/:id", async (req) => {
    const { id } = req.params as { id: string };
    return bookService.delete(id);
  });
}