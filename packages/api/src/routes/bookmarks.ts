import { Elysia } from "elysia";
import { db } from "../db";

export const bookmarks = new Elysia({ prefix: "/bookmarks" })
  .get("/", async () => {
    return db.bookmark.findMany();
  })
  .post("/", async ({ body }) => {
    return db.bookmark.create({ data: body });
  })
  .delete("/:id", async ({ params }) => {
    return db.bookmark.delete({ where: { id: params.id } });
  });
