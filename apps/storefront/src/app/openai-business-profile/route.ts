export async function GET() {
  return new Response('openai-business-profile=1TAKROpU96MFaTlgjZjjm7TvH-OhhGWsJAZ9vh5mvoM', {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
