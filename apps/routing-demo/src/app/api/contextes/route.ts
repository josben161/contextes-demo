import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json();
    
    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid query' }, { status: 400 });
    }

    const routerUrl = process.env.NEXT_PUBLIC_ROUTER_URL;
    const buyerJwt = process.env.NEXT_PUBLIC_BUYER_JWT;
    
    if (!routerUrl || !buyerJwt) {
      return NextResponse.json({ error: 'Missing configuration' }, { status: 500 });
    }

    const response = await fetch(routerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${buyerJwt}`,
      },
      body: JSON.stringify({
        query,
        packIds: ['energy-pro'],
        userTier: 'basic',
      }),
    });

    const upstreamData = await response.json();

    if (response.status === 403) {
      return NextResponse.json(upstreamData, { status: 403 });
    }

    if (!response.ok) {
      return NextResponse.json({ error: 'Upstream service error' }, { status: 500 });
    }

    return NextResponse.json({ answer: upstreamData.answer }, { status: 200 });
  } catch (error) {
    console.error('Error calling router service:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
