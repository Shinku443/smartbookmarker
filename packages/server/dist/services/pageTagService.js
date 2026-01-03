"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pageTagService = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
exports.pageTagService = {
    addTag(pageId, tagId) {
        return prisma.pageTag.create({
            data: { pageId, tagId },
        });
    },
    removeTag(pageId, tagId) {
        return prisma.pageTag.delete({
            where: { pageId_tagId: { pageId, tagId } },
        });
    },
};
