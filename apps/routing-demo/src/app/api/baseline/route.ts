import { NextResponse } from 'next/server';
import { baselineAnswer } from '@/lib/baseline';

export async function POST(req: Request) {
  const { query } = await req.json();
  try {
    const answer = await baselineAnswer(query);
    return NextResponse.json({ answer });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'baseline_failed' }, { status: 500 });
  }
}
