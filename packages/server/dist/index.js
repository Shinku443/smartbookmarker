"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
const prisma_1 = __importDefault(require("./plugins/prisma"));
const cors_1 = __importDefault(require("@fastify/cors"));
const books_1 = __importDefault(require("./routes/books"));
const pages_1 = __importDefault(require("./routes/pages"));
const tags_1 = __importDefault(require("./routes/tags"));
const sync_1 = __importDefault(require("./routes/sync"));
const app = (0, fastify_1.default)();
// Register plugins first
app.register(cors_1.default, {
    origin: true, // Allow all origins for testing
    credentials: true
});
app.register(prisma_1.default);
// Register routes after plugins
app.register(books_1.default);
app.register(pages_1.default);
app.register(tags_1.default);
app.register(sync_1.default);
app.listen({ port: 4000, host: "0.0.0.0" }).then(() => {
    console.log("API running on port 4000");
});
