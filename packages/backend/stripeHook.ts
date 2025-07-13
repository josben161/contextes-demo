import { APIGatewayProxyHandler } from 'aws-lambda';
import { DynamoDBClient, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import Stripe from 'stripe';

const dynamo = new DynamoDBClient({});
const PACKS_TABLE = process.env.PACKS_TABLE || 'PacksTable';
const STRIPE_SECRET = process.env.STRIPE_SECRET!;
const stripe = new Stripe(STRIPE_SECRET, { apiVersion: '2025-06-30.basil' });

export const handler: APIGatewayProxyHandler = async (event) => {
  const sig = event.headers['stripe-signature'] || event.headers['Stripe-Signature'];
  if (!sig) {
    return { statusCode: 400, body: 'Missing Stripe signature' };
  }
  try {
    const body = event.isBase64Encoded ? Buffer.from(event.body!, 'base64').toString('utf8') : event.body!;
    const stripeEvent = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
    if (stripeEvent.type === 'checkout.session.completed') {
      const session = stripeEvent.data.object as Stripe.Checkout.Session;
      const buyerTenant = session.metadata?.buyerTenant;
      const packId = session.metadata?.packId;
      if (!buyerTenant || !packId) {
        return { statusCode: 400, body: 'Missing metadata' };
      }
      // Upsert PacksTable: set licenceGranted=true for this tenant and packId
      await dynamo.send(new UpdateItemCommand({
        TableName: PACKS_TABLE,
        Key: { packId: { S: packId } },
        UpdateExpression: 'SET licenceGranted = :val, buyerTenant = :tenant',
        ExpressionAttributeValues: {
          ':val': { BOOL: true },
          ':tenant': { S: buyerTenant },
        },
      }));
    }
    return { statusCode: 200, body: 'ok' };
  } catch (err) {
    return { statusCode: 400, body: 'Webhook error' };
  }
}; 