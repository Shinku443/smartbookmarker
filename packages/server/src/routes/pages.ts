import { FastifyInstance } from 'fastify'

export default async function pagesRoutes(app: FastifyInstance) {
  // TODO: Replace with real Emperor pages endpoints
  app.get('/', async () => {
    return { message: 'Pages route working' }
  })
}
