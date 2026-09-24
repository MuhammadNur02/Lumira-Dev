import { draftMode } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
  ;(await draftMode()).disable()
  return NextResponse.redirect(new URL('/', req.url))
}
