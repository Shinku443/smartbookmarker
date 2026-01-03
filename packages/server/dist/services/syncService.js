"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncService = void 0;
const client_1 = require("@prisma/client");
const helpers_1 = require("../utils/helpers");
const prisma = new client_1.PrismaClient();
exports.syncService = {
    async record(entityType, entityId) {
        const existing = await prisma.syncMetadata.findUnique({
            where: { entityId },
        });
        let row;
        if (existing) {
            row = await prisma.syncMetadata.update({
                where: { entityId },
                data: { version: existing.version + 1 },
            });
        }
        else {
            row = await prisma.syncMetadata.create({
                data: {
                    entityType,
                    entityId,
                },
            });
        }
        return (0, helpers_1.serializeBigInts)(row);
    },
    async getSince(since) {
        const rows = await prisma.syncMetadata.findMany({
            where: since ? { updatedAt: { gt: since } } : {},
            orderBy: { updatedAt: "asc" },
        });
        return (0, helpers_1.serializeBigInts)(rows);
    },
};
