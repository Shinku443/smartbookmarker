"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = tagRoutes;
const tagService_1 = require("../services/tagService");
async function tagRoutes(app) {
    app.get("/tags", () => tagService_1.tagService.getAll());
    app.post("/tags", (req) => tagService_1.tagService.create(req.body));
    app.delete("/tags/:id", (req) => tagService_1.tagService.delete(req.params.id));
}
