"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pageService = void 0;
const client_1 = require("@prisma/client");
const syncService_1 = require("./syncService");
const helpers_1 = require("../utils/helpers");
const prisma = new client_1.PrismaClient();
exports.pageService = {
    getAll(bookId) {
        return prisma.page.findMany({
            where: { bookId },
            orderBy: { order: "asc" },
            include: { tags: true },
        });
    },
    get(id) {
        return prisma.page.findUnique({
            where: { id },
            include: { tags: true },
        });
    },
    async create(data) {
        const page = await prisma.page.create({
            data: {
                ...data,
                order: Date.now(),
            },
        });
        await syncService_1.syncService.record("page", page.id);
        return (0, helpers_1.serializeBigInts)(page);
    },
    async update(id, data) {
        const page = await prisma.page.update({
            where: { id },
            data,
        });
        await syncService_1.syncService.record("page", page.id);
        return (0, helpers_1.serializeBigInts)(page);
    },
    async delete(id) {
        const page = await prisma.page.delete({ where: { id } });
        await syncService_1.syncService.record("page", page.id);
        return (0, helpers_1.serializeBigInts)(page);
    },
};
