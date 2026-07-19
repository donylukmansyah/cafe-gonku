import 'dotenv/config'
import { Client } from 'pg'

// One-off, idempotent migration helper for databases created before the role rename.
// Keep this script until all deployed databases are confirmed to use OWNER instead of legacy ADMIN.
const OWNER_EMAIL = 'owner@cafegonku.com'
const LEGACY_ADMIN_EMAIL = 'admin@cafegonku.com'

async function main() {
  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL

  if (!connectionString) {
    throw new Error('DIRECT_URL or DATABASE_URL is required')
  }

  const client = new Client({ connectionString })
  await client.connect()

  try {
    await client.query(`ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'OWNER'`)

    await client.query('BEGIN')

    const legacyOwner = await client.query<{ id: string }>(
      `SELECT id FROM users WHERE email = $1 FOR UPDATE`,
      [LEGACY_ADMIN_EMAIL],
    )

    const owner = await client.query<{ id: string }>(
      `SELECT id FROM users WHERE email = $1 FOR UPDATE`,
      [OWNER_EMAIL],
    )

    if (legacyOwner.rowCount && owner.rowCount) {
      await client.query(`DELETE FROM sessions WHERE "userId" = $1`, [legacyOwner.rows[0].id])
      await client.query(`DELETE FROM accounts WHERE "userId" = $1`, [legacyOwner.rows[0].id])
      await client.query(`DELETE FROM users WHERE id = $1`, [legacyOwner.rows[0].id])
    } else if (legacyOwner.rowCount) {
      const legacyOwnerId = legacyOwner.rows[0].id

      await client.query(
        `UPDATE users SET email = $1, name = 'Owner Cafe Gonku', role = 'OWNER', "updatedAt" = NOW() WHERE id = $2`,
        [OWNER_EMAIL, legacyOwnerId],
      )

      await client.query(
        `UPDATE accounts SET "accountId" = $1, "updatedAt" = NOW() WHERE "userId" = $2 AND "providerId" = 'credential'`,
        [OWNER_EMAIL, legacyOwnerId],
      )
    }

    await client.query(`UPDATE users SET role = 'OWNER' WHERE role::text = 'ADMIN'`)

    await client.query(`DELETE FROM sessions`)

    await client.query('COMMIT')

    console.log('Migrated legacy ADMIN users to OWNER and cleared sessions.')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    await client.end()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
