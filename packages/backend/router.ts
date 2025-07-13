import { APIGatewayProxyHandler } from 'aws-lambda';

// Simple intent classifier using regex
function classifyIntent(query: string): string {
  if (/summary|summarize|tl;dr/i.test(query)) return 'summarize';
  if (/search|find|lookup/i.test(query)) return 'search';
  if (/explain|why|how/i.test(query)) return 'explain';
  // Add more rules as needed
  return 'unknown';
}

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    const { query, packIds, userTier } = body;
    if (!query || !Array.isArray(packIds) || !userTier) {
      return { statusCode: 400, body: 'Missing required fields' };
    }
    // Step 1: Intent classification
    const intent = classifyIntent(query);
    // Scaffold for further steps
    return {
      statusCode: 200,
      body: JSON.stringify({ intent }),
    };
  } catch (err) {
    return { statusCode: 500, body: 'Internal server error' };
  }
}; 