import { NextRequest, NextResponse } from 'next/server';

// CORS headers for cross-origin requests from display app
function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

// Handle preflight requests
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders() });
}

// In-memory storage for local development (fallback when KV is not available)
let localPriceCache: { rewards: any[]; lastUpdated: string } | null = null;

// Check if we're in production with KV available
const isKvAvailable = process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN;

// Dynamically import KV only if available
async function getKv() {
  if (isKvAvailable) {
    const { kv } = await import('@vercel/kv');
    return kv;
  }
  return null;
}

// POST: Update price list (secured with API key)
export async function POST(req: NextRequest) {
  try {
    // Check authorization header
    const authHeader = req.headers.get('authorization');
    const apiKey = process.env.API_SECRET_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { message: 'Server configuration error' },
        { status: 500, headers: corsHeaders() }
      );
    }

    if (authHeader !== `Bearer ${apiKey}`) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401, headers: corsHeaders() }
      );
    }

    // Parse request body
    const body = await req.json();

    if (!body.borsId || typeof body.borsId !== 'string') {
      return NextResponse.json(
        { message: 'BorsID is required and must be a string' },
        { status: 400, headers: corsHeaders() }
      );
    }

    if (!body.rewards || !Array.isArray(body.rewards)) {
      return NextResponse.json(
        { message: 'Invalid request body. Expected { borsId: string, rewards: Reward[] }' },
        { status: 400, headers: corsHeaders() }
      );
    }

    // Store in KV or local cache with unique key per borsId
    const priceData = {
      rewards: body.rewards,
      lastUpdated: new Date().toISOString(),
    };

    const kvKey = `price_list_${body.borsId}`;
    const kvClient = await getKv();
    if (kvClient) {
      await kvClient.set(kvKey, priceData);
      console.log(`✅ Prices stored in KV for borsId: ${body.borsId}`);
    } else {
      // Use local cache for development
      localPriceCache = priceData;
      console.log(`📦 Prices stored in local cache for borsId: ${body.borsId} (dev mode)`);
    }

    return NextResponse.json({
      message: 'Prices updated successfully',
      borsId: body.borsId,
      count: body.rewards.length,
      mode: kvClient ? 'kv' : 'local'
    }, { headers: corsHeaders() });
  } catch (error) {
    console.error('Error updating prices:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500, headers: corsHeaders() }
    );
  }
}

// GET: Retrieve price list (public endpoint)
export async function GET(req: NextRequest) {
  try {
    // Extract borsId from query parameters
    const searchParams = req.nextUrl.searchParams;
    const borsId = searchParams.get('borsId');

    if (!borsId) {
      return NextResponse.json(
        { message: 'BorsID query parameter is required' },
        { status: 400, headers: corsHeaders() }
      );
    }

    let priceData: { rewards: any[]; lastUpdated: string } | null = null;

    const kvKey = `price_list_${borsId}`;
    const kvClient = await getKv();
    if (kvClient) {
      priceData = await kvClient.get<{ rewards: any[]; lastUpdated: string }>(kvKey);
      console.log(`📥 Fetching prices from KV for borsId: ${borsId}`);
    } else {
      // Use local cache for development
      priceData = localPriceCache;
      console.log(`📥 Fetching prices from local cache for borsId: ${borsId} (dev mode)`);
    }

    if (!priceData) {
      return NextResponse.json({
        rewards: [],
        lastUpdated: null,
        message: 'No price data available yet for this borsId'
      }, { headers: corsHeaders() });
    }

    return NextResponse.json(priceData, { headers: corsHeaders() });
  } catch (error) {
    console.error('Error fetching prices:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500, headers: corsHeaders() }
    );
  }
}
