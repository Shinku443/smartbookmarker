import { FastifyInstance } from 'fastify'

export default async function booksRoutes(app: FastifyInstance) {
  // TODO: Replace with real Emperor books endpoints
  app.get('/', async () => {
    return { message: 'Books route working' }
  })
}
