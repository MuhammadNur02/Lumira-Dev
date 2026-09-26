const CLERK_USER_ID = 'user_3JmQHrK0QrhOwy7wTKxVQELkRct'
const headers = { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` }

// Check user's public metadata
const userResp = await fetch(`https://api.clerk.com/v1/users/${CLERK_USER_ID}`, { headers })
const user = await userResp.json()
console.log('User public_metadata:', JSON.stringify(user.public_metadata))
console.log('User two_factor_enabled:', user.two_factor_enabled)

// Check session token template (this determines what goes into sessionClaims)
const templateResp = await fetch('https://api.clerk.com/v1/jwt_templates', { headers })
if (templateResp.ok) {
  const templates = await templateResp.json()
  console.log('\nJWT Templates count:', templates.total_count ?? templates.length)
  if (Array.isArray(templates)) {
    for (const t of templates) console.log('  Template:', t.name, '→', JSON.stringify(t.claims))
  } else if (templates.data) {
    for (const t of templates.data) console.log('  Template:', t.name, '→', JSON.stringify(t.claims))
  }
} else {
  console.log('\nJWT Templates API response:', templateResp.status)
}

// Check active sessions for this user
const sessResp = await fetch(`https://api.clerk.com/v1/sessions?user_id=${CLERK_USER_ID}&status=active&limit=5`, {
  headers,
})
if (sessResp.ok) {
  const sessions = await sessResp.json()
  const list = Array.isArray(sessions) ? sessions : (sessions.data ?? [])
  console.log('\nActive sessions:', list.length)
  for (const s of list) {
    console.log(`  ${s.id} | status: ${s.status} | last_active: ${s.last_active_at}`)
  }
} else {
  console.log('\nSessions API error:', sessResp.status)
}
