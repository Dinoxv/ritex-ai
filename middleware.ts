import { NextRequest, NextResponse } from 'next/server';
import { BINANCE_ROUTE_SLUG, LEGACY_BINANCE_ROUTE_SLUG } from '@/lib/constants/routing';

const LEGACY_BINANCE_FALLBACK_ADDRESS = '0xb83de012dba672c76a7dbbbf3e459cb59d7d6e36';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const segments = pathname.split('/').filter(Boolean);

  if (segments.length === 0) {
    return NextResponse.next();
  }

  let firstSegment = segments[0].toLowerCase();
  try {
    firstSegment = decodeURIComponent(firstSegment).toLowerCase();
  } catch {
    firstSegment = segments[0].toLowerCase();
  }

  if (firstSegment === LEGACY_BINANCE_FALLBACK_ADDRESS || firstSegment === LEGACY_BINANCE_ROUTE_SLUG) {
    const redirectUrl = request.nextUrl.clone();
    const remaining = segments.slice(1).join('/');
    redirectUrl.pathname = remaining
      ? `/${BINANCE_ROUTE_SLUG}/${remaining}/`
      : `/${BINANCE_ROUTE_SLUG}/`;

    return NextResponse.redirect(redirectUrl, 301);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next|api|favicon.ico|icon.svg|sitemap.xml|robots.txt).*)'],
};
