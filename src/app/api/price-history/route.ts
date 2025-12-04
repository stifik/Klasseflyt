import { NextRequest, NextResponse } from 'next/server';

// CORS headers for cross-origin requests
function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

// Handle preflight requests
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders() });
}

// Dynamically import and check KV at runtime (not module level)
async function getKv() {
  // Check at runtime, not module level
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    const { kv } = await import('@vercel/kv');
    return kv;
  }
  return null;
}

// GET: Hent prishistorikk for en belønning
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const borsId = searchParams.get('borsId');
    const rewardId = searchParams.get('rewardId');

    console.log(`📥 price-history request: borsId=${borsId}, rewardId=${rewardId}`);

    if (!borsId) {
      return NextResponse.json(
        { error: 'Missing required parameter: borsId' },
        { status: 400, headers: corsHeaders() }
      );
    }

    if (!rewardId) {
      return NextResponse.json(
        { error: 'Missing required parameter: rewardId' },
        { status: 400, headers: corsHeaders() }
      );
    }

    const historyKey = `price_history_${borsId}_${rewardId}`;
    console.log(`🔑 Looking up key: ${historyKey}`);
    
    const kvClient = await getKv();

    if (!kvClient) {
      console.log('⚠️ KV not available');
      return NextResponse.json({
        rewardId: parseInt(rewardId),
        rewardName: '',
        history: []
      }, { headers: corsHeaders() });
    }

    const historyData = await kvClient.get<{ 
      rewardId: number; 
      rewardName: string; 
      history: { timestamp: string; price: number }[] 
    }>(historyKey);

    console.log(`📊 Found data:`, historyData ? `${historyData.history?.length || 0} entries` : 'null');

    if (!historyData) {
      return NextResponse.json({
        rewardId: parseInt(rewardId),
        rewardName: '',
        history: []
      }, { headers: corsHeaders() });
    }

    return NextResponse.json(historyData, { headers: corsHeaders() });

  } catch (error) {
    console.error('Error in price-history API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders() }
    );
  }
}
