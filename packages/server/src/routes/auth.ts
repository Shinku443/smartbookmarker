import { FastifyInstance } from 'fastify'

export default async function authRoutes(app: FastifyInstance) {
  // TODO: Replace with real auth (hashed passwords, proper tokens)
  app.post('/login', async () => {
    return { token: 'fake-token' }
  })
}
