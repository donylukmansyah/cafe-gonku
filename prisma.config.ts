// Prisma configuration for CLI commands (migrations, db push, etc.)
import 'dotenv/config'
import { defineConfig, env } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    // Use DIRECT_URL for CLI commands (direct connection, no pooler)
    url: env('DIRECT_URL'),
  },
})
