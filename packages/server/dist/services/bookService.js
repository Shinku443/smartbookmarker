"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bookService = void 0;
const client_1 = require("@prisma/client");
const syncService_1 = require("./syncService");
const helpers_1 = require("../utils/helpers");
const prisma = new client_1.PrismaClient();
exports.bookService = {
    async getAll() {
        const books = await prisma.book.findMany({
            orderBy: { order: "asc" },
        });
        return (0, helpers_1.serializeBigInts)(books);
    },
    async get(id) {
        const book = await prisma.book.findUnique({ where: { id } });
        return (0, helpers_1.serializeBigInts)(book);
    },
    async create(data) {
        const book = await prisma.book.create({
            data: {
                title: data.title,
                emoji: data.emoji,
                order: Date.now(), // BigInt in DB, JS number here
            },
        });
        await syncService_1.syncService.record("book", book.id);
        return (0, helpers_1.serializeBigInts)(book);
    },
    async update(id, data) {
        const book = await prisma.book.update({
            where: { id },
            data,
        });
        await syncService_1.syncService.record("book", book.id);
        return (0, helpers_1.serializeBigInts)(book);
    },
    async delete(id) {
        const book = await prisma.book.delete({ where: { id } });
        await syncService_1.syncService.record("book", book.id);
        return (0, helpers_1.serializeBigInts)(book);
    },
};
