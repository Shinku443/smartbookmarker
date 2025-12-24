import { Elysia } from "elysia";
import { bookmarks } from "./routes/bookmarks";
import { auth } from "./routes/auth";

const app = new Elysia()
  .use(auth)
  .use(bookmarks)
  .listen(4000);

console.log("API running on http://localhost:4000");
