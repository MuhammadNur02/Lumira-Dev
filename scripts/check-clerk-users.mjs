// Fetch all Clerk users and show their IDs
const resp = await fetch('https://api.clerk.com/v1/users?limit=10&order_by=-created_at', {
  headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` },
})
if (!resp.ok) {
  console.error('Clerk API error:', resp.status, await resp.text())
  process.exit(1)
}
const users = await resp.json()
if (users.length === 0) {
  console.log('No users in Clerk. Please sign up at http://localhost:3000/sign-up first.')
} else {
  console.log('Clerk users:')
  for (const u of users) {
    const email = u.email_addresses?.[0]?.email_address ?? '(no email)'
    const name = [u.first_name, u.last_name].filter(Boolean).join(' ') || '(no name)'
    console.log(`  ${u.id} | ${email} | ${name}`)
  }
}
