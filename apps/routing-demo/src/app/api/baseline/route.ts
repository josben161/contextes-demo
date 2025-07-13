import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json();
    
    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid query' }, { status: 400 });
    }

    // Escape quotes in the query to prevent shell injection
    const escapedQuery = query.replace(/"/g, '\\"');
    
    // Execute the baseline CLI script
    const { stdout, stderr } = await execAsync(
      `pnpm ts-node ../../../../baseline/index.ts "${escapedQuery}"`,
      {
        cwd: process.cwd(),
        env: {
          ...process.env,
          OPENAI_API_KEY: process.env.OPENAI_API_KEY,
          PINECONE_API_KEY: process.env.PINECONE_API_KEY,
          PINECONE_ENV: process.env.PINECONE_ENV,
        },
      }
    );

    if (stderr) {
      console.error('Baseline script stderr:', stderr);
    }

    return NextResponse.json({ answer: stdout.trim() }, { status: 200 });
  } catch (error) {
    console.error('Error executing baseline script:', error);
    return NextResponse.json(
      { error: 'Failed to process query' }, 
      { status: 500 }
    );
  }
}
