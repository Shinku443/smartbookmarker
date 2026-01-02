import { FastifyInstance } from 'fastify'

export default async function tagsRoutes(app: FastifyInstance) {
  // TODO: Replace with real Emperor tags endpoints
  app.get('/', async () => {
    return { message: 'Tags route working' }
  })
}
