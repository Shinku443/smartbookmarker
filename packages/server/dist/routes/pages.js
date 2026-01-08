"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = pageRoutes;
const pageService_1 = require("../services/pageService");
async function pageRoutes(app) {
    app.get("/pages/:bookId", (req) => pageService_1.pageService.getAll(req.params.bookId));
    app.post("/pages", (req) => pageService_1.pageService.create(req.body));
    app.patch("/pages/:id", (req) => pageService_1.pageService.update(req.params.id, req.body));
    app.delete("/pages/:id", (req) => pageService_1.pageService.delete(req.params.id));
}
