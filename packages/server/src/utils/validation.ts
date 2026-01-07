export function validate<T>(schema: any, data: unknown): T {
  // Placeholder for Zod or Fastify schema-based validation.
  // For now, this just returns the data as-is.
  return data as T
}
