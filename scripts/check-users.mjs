const { default: postgres } = await import(
  new URL('./node_modules/postgres/src/index.js', 'file:///' + process.cwd().replace(/\\/g, '/') + '/').href
)

const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1, idle_timeout: 5 })
try {
  const rows = await sql`SELECT id, email, name, role FROM app.users LIMIT 10`
  if (rows.length === 0) {
    console.log('NO USERS FOUND in app.users')
  } else {
    for (const r of rows) {
      console.log(`  ${r.role.padEnd(6)} | ${r.email} | ${r.name ?? '(no name)'} | ${r.id}`)
    }
  }
} catch (err) {
  console.error('Query error:', err.message)
} finally {
  await sql.end()
}
