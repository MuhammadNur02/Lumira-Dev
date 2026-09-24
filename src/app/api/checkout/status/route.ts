import { z } from 'zod'
import { checkoutStatus } from '@/server/checkout/status'

export async function GET(req: Request) {
  const cs = z.uuid().safeParse(new URL(req.url).searchParams.get('cs'))
  if (!cs.success)
    return Response.json({ status: 'unknown' }, { status: 400, headers: { 'Cache-Control': 'no-store' } })
  return Response.json(await checkoutStatus(cs.data), { headers: { 'Cache-Control': 'no-store' } })
}
