import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url')
  if (!url) {
    return new NextResponse('Missing URL', { status: 400 })
  }

  if (!url.startsWith('https://data-storage.doubletick.io/') && !url.startsWith('https://api.doubletick.io/')) {
    return NextResponse.redirect(url)
  }

  const apiKey = process.env.DOUBLETICK_API_KEY || "key_HHesvuW6tVbYxOkgfcD3KrROqjTfq8bK6RXQ6F1HZWqCAXVSIHsbOeTDdSd6VDnS9uzQDCOsBgoXxjFinuf2BXIyQfkjJrSwCUvwmXx6CAOPRW8J9Y00TVQQF6HIaRBa3OczdbOlrg4zTo1vJnC9KT5NB0I29n0v7NNwsiBBxuZnoRUjirC0GNMp7UASX89zwlJBMk17lrXz4orVhJogoUgOlXDkFtxnahe3P3ooVuDX3oEI0KWfs7nS64Mt"
  if (!apiKey) {
    console.error('Missing DOUBLETICK_API_KEY in environment variables')
    return new NextResponse('Server configuration error', { status: 500 })
  }

  try {
    const res = await fetch(url, {
      headers: {
        'Authorization': apiKey.startsWith('Bearer ') ? apiKey.replace('Bearer ', '') : apiKey
      }
    })

    if (!res.ok) {
      console.error(`DoubleTick API returned ${res.status} for ${url}`)
      return new NextResponse('Failed to fetch media from provider', { status: res.status })
    }

    const contentType = res.headers.get('content-type')
    const buffer = await res.arrayBuffer()

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType || 'image/jpeg',
        'Cache-Control': 'public, max-age=86400'
      }
    })
  } catch (err) {
    console.error('Error fetching media:', err)
    return new NextResponse('Internal proxy error', { status: 500 })
  }
}
