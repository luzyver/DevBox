export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request, { params }: { params: Promise<{ address: string }> }) {
  const { address } = await params
  const token = new URL(req.url).searchParams.get('token')

  const res = await fetch(
    `http://devbox-app:8080/api/inbox/${address}/stream?token=${token}`,
    { headers: { Accept: 'text/event-stream' } }
  )

  if (!res.ok || !res.body) {
    return new Response(JSON.stringify({ error: 'upstream error' }), { status: res.status })
  }

  return new Response(res.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
