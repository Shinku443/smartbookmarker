"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tagService = void 0;
const client_1 = require("@prisma/client");
const syncService_1 = require("./syncService");
const helpers_1 = require("../utils/helpers");
const prisma = new client_1.PrismaClient();
exports.tagService = {
    getAll() {
        return prisma.tag.findMany();
    },
    async create(data) {
        const tag = await prisma.tag.create({ data });
        await syncService_1.syncService.record("tag", tag.id);
        return (0, helpers_1.serializeBigInts)(tag);
    },
    async delete(id) {
        const tag = await prisma.tag.delete({ where: { id } });
        await syncService_1.syncService.record("tag", tag.id);
        return (0, helpers_1.serializeBigInts)(tag);
    },
};
