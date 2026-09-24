export {}

declare global {
  /** Clerk session token customization: `{ "metadata": "{{user.public_metadata}}" }` (Task.md P1.09). */
  interface CustomJwtSessionClaims {
    metadata?: { role?: 'admin' | 'buyer' }
  }
}
