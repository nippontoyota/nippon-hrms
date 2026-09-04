import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const publicRoute = pathname.startsWith('/login') || pathname.startsWith('/_next') || pathname === '/favicon.ico'
  if (publicRoute || request.cookies.has('maintenance_session')) return NextResponse.next()
  const url = request.nextUrl.clone()
  url.pathname = '/login'
  return NextResponse.redirect(url)
}
