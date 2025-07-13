import { APIGatewayProxyHandler } from 'aws-lambda';
import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';

const dynamo = new DynamoDBClient({});
const TRACE_TABLE = process.env.TRACE_TABLE || 'TraceTable';

export const handler: APIGatewayProxyHandler = async (event) => {
  const traceId = event.pathParameters?.traceId;
  if (!traceId) {
    return { statusCode: 400, body: 'Missing traceId' };
  }
  try {
    const result = await dynamo.send(new GetItemCommand({
      TableName: TRACE_TABLE,
      Key: { traceId: { S: traceId } },
    }));
    if (!result.Item) {
      return { statusCode: 404, body: 'Not found' };
    }
    // Convert DynamoDB item to plain JS object
    const item = Object.fromEntries(
      Object.entries(result.Item).map(([k, v]) => [k, v.S ?? v.N ?? v.B ?? v])
    );
    return {
      statusCode: 200,
      body: JSON.stringify(item),
    };
  } catch (err) {
    return { statusCode: 500, body: 'Internal server error' };
  }
}; 