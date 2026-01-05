"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.orderingService = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
exports.orderingService = {
    reorderPages(bookId, orderedIds) {
        return prisma.$transaction(orderedIds.map((id, index) => prisma.page.update({
            where: { id },
            data: { order: index },
        })));
    },
    reorderBooks(orderedIds) {
        return prisma.$transaction(orderedIds.map((id, index) => prisma.book.update({
            where: { id },
            data: { order: index },
        })));
    },
};
