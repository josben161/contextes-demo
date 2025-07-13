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
    const cmd = `npx ts-node ../../../../baseline/index.ts "${escapedQuery}"`;
    
    return new Promise((resolve) => {
      exec(cmd, {
        cwd: process.cwd(),
        env: {
          ...process.env,
          OPENAI_API_KEY: process.env.OPENAI_API_KEY,
          PINECONE_API_KEY: process.env.PINECONE_API_KEY,
          PINECONE_ENV: process.env.PINECONE_ENV,
        },
      }, (err, stdout, stderr) => {
        if (err) {
          console.error('baseline exec error', err, stderr);
          resolve(NextResponse.json({ error: 'baseline_failed' }, { status: 500 }));
        } else {
          resolve(NextResponse.json({ answer: stdout.trim() }));
        }
      });
    });
  } catch (error) {
    console.error('Error executing baseline script:', error);
    return NextResponse.json(
      { error: 'Failed to process query' }, 
      { status: 500 }
    );
  }
}
