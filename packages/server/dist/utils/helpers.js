"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.serializeBigInts = serializeBigInts;
function serializeBigInts(obj) {
    return JSON.parse(JSON.stringify(obj, (_, value) => (typeof value === "bigint" ? Number(value) : value)));
}
