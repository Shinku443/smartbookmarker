import { FastifyInstance } from 'fastify'

export default async function syncRoutes(app: FastifyInstance) {
  // TODO: Replace with real Emperor sync endpoints
  app.get('/status', async () => {
    return { status: 'ok' }
  })
}
