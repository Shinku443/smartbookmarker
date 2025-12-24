import { Elysia } from "elysia";
import { db } from "../db";
import jwt from "jsonwebtoken";

export const auth = new Elysia({ prefix: "/auth" })
  .post("/register", async ({ body }) => {
    const { email, password } = body;

    const user = await db.user.create({
      data: { email, password }
    });

    return user;
  })
  .post("/login", async ({ body }) => {
    const { email, password } = body;

    const user = await db.user.findUnique({ where: { email } });
    if (!user || user.password !== password) return { error: "Invalid login" };

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!);

    return { token };
  });
