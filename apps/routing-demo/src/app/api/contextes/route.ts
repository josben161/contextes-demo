import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json();
    console.log('Received query:', query);
    
    if (!query || typeof query !== 'string') {
      console.warn('Missing or invalid query:', query);
      return NextResponse.json({ error: 'Missing or invalid query' }, { status: 400 });
    }

    const routerUrl = process.env.NEXT_PUBLIC_ROUTER_URL;
    const buyerJwt = process.env.NEXT_PUBLIC_BUYER_JWT;
    console.log('Router URL:', routerUrl);
    console.log('Buyer JWT present:', !!buyerJwt);
    
    if (!routerUrl || !buyerJwt) {
      console.error('Missing configuration:', { routerUrl, buyerJwt });
      return NextResponse.json({ error: 'Missing configuration' }, { status: 500 });
    }

    const fetchBody = {
      query,
      packIds: ['energy-pro'],
      userTier: 'basic',
    };
    console.log('Sending fetch to routerUrl with body:', fetchBody);

    const response = await fetch(routerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${buyerJwt}`,
      },
      body: JSON.stringify(fetchBody),
    });

    const upstreamData = await response.json();
    console.log('Upstream response status:', response.status);
    console.log('Upstream response data:', upstreamData);

    if (response.status === 403) {
      console.warn('Upstream returned 403:', upstreamData);
      return NextResponse.json(upstreamData, { status: 403 });
    }

    if (!response.ok) {
      console.error('Upstream service error:', upstreamData);
      return NextResponse.json({ error: 'Upstream service error' }, { status: 500 });
    }

    return NextResponse.json({ answer: upstreamData.answer }, { status: 200 });
  } catch (error) {
    console.error('Error calling router service:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
