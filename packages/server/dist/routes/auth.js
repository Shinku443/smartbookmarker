"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = authRoutes;
async function authRoutes(app) {
    // TODO: Replace with real auth (hashed passwords, proper tokens)
    app.post('/login', async () => {
        return { token: 'fake-token' };
    });
}
