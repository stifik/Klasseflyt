import { kv } from '@vercel/kv';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge'; // Use edge runtime for better performance

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

    // Store in KV
    await kv.set('price_list', {
      rewards: body.rewards,
      lastUpdated: new Date().toISOString(),
    });

    return NextResponse.json({ 
      message: 'Prices updated successfully',
      count: body.rewards.length 
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
    const priceData = await kv.get<{ rewards: any[]; lastUpdated: string }>('price_list');
    
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
