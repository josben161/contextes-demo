import { NextResponse } from 'next/server';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

// POST /api/baseline
export async function POST(req: Request): Promise<Response> {
  const { query } = await req.json();

  try {
    // Run the baseline script with npx ts-node
    const cmd = `npx ts-node ../../../../baseline/index.ts "${query.replaceAll(
      '"',
      '\\"'
    )}"`;
    const { stdout } = await execAsync(cmd, { maxBuffer: 1024 * 1024 });

    return NextResponse.json({ answer: stdout.trim() }, { status: 200 });
  } catch (err: any) {
    console.error('baseline exec error:', err);
    return NextResponse.json(
      { error: 'baseline_failed' },
      { status: 500 }
    );
  }
}
