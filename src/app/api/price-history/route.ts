import { NextRequest, NextResponse } from 'next/server';

// Dette er et client-side API endpoint som bruker IndexedDB
// Siden dette kjører i Next.js API route (server-side), kan vi ikke direkte aksessere IndexedDB
// Dette endepunktet er egentlig ment for eksterne kall, men siden alt data er i IndexedDB,
// må frontend heller hente data direkte fra IndexedDB

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

// GET: Hent prishistorikk for en belønning
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const rewardId = searchParams.get('rewardId');

    if (!rewardId) {
      return NextResponse.json(
        { error: 'Missing required parameter: rewardId' },
        { status: 400, headers: corsHeaders() }
      );
    }

    // Siden dette er et server-side endpoint og data er i IndexedDB (client-side),
    // returnerer vi en beskjed om at dette må hentes fra client-side
    return NextResponse.json(
      { 
        error: 'Price history must be fetched from client-side IndexedDB',
        message: 'Use the getPriceHistory function from rewardService.ts instead'
      },
      { status: 501, headers: corsHeaders() }
    );

  } catch (error) {
    console.error('Error in price-history API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders() }
    );
  }
}
