import { NextRequest, NextResponse } from 'next/server';

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
        { status: 500 }
      );
    }

    if (authHeader !== `Bearer ${apiKey}`) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await req.json();
    
    if (!body.rewards || !Array.isArray(body.rewards)) {
      return NextResponse.json(
        { message: 'Invalid request body. Expected { rewards: Reward[] }' },
        { status: 400 }
      );
    }

    // Store in KV or local cache
    const priceData = {
      rewards: body.rewards,
      lastUpdated: new Date().toISOString(),
    };

    const kvClient = await getKv();
    if (kvClient) {
      await kvClient.set('price_list', priceData);
    } else {
      // Use local cache for development
      localPriceCache = priceData;
      console.log('💾 Prices stored in local cache (dev mode)');
    }

    return NextResponse.json({ 
      message: 'Prices updated successfully',
      count: body.rewards.length,
      mode: kvClient ? 'kv' : 'local'
    });
  } catch (error) {
    console.error('Error updating prices:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET: Retrieve price list (public endpoint)
export async function GET() {
  try {
    let priceData: { rewards: any[]; lastUpdated: string } | null = null;

    const kvClient = await getKv();
    if (kvClient) {
      priceData = await kvClient.get<{ rewards: any[]; lastUpdated: string }>('price_list');
    } else {
      // Use local cache for development
      priceData = localPriceCache;
      console.log('📊 Fetching prices from local cache (dev mode)');
    }
    
    if (!priceData) {
      return NextResponse.json({
        rewards: [],
        lastUpdated: null,
        message: 'No price data available yet'
      });
    }

    return NextResponse.json(priceData);
  } catch (error) {
    console.error('Error fetching prices:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
