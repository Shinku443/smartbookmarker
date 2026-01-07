"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = bookRoutes;
const bookService_1 = require("../services/bookService");
async function bookRoutes(app) {
    // GET /books
    app.get("/books", async () => {
        return bookService_1.bookService.getAll();
    });
    // POST /books
    app.post("/books", async (req) => {
        const body = req.body;
        return bookService_1.bookService.create({
            title: body.title,
            emoji: body.emoji ?? null,
        });
    });
    // PATCH /books/:id
    app.patch("/books/:id", async (req) => {
        const { id } = req.params;
        const body = req.body;
        return bookService_1.bookService.update(id, {
            title: body.title,
            emoji: body.emoji ?? null,
            order: body.order,
        });
    });
    // DELETE /books/:id
    app.delete("/books/:id", async (req) => {
        const { id } = req.params;
        return bookService_1.bookService.delete(id);
    });
}
