import { NextRequest, NextResponse } from 'next/server';

// CORS headers for cross-origin requests
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

type AgentStatus = {
  status: 'pending' | 'analyzing' | 'passed' | 'failed';
  agentName?: string;
  mission?: string;
  timestamp: string;
};

// In-memory storage for local development (fallback when KV is not available)
let localAgentCache: Record<string, AgentStatus> = {};

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

// POST: Update agent status (secured with API key)
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

    if (!body.status || !['pending', 'analyzing', 'passed', 'failed'].includes(body.status)) {
      return NextResponse.json(
        { message: 'Status is required and must be one of: pending, analyzing, passed, failed' },
        { status: 400, headers: corsHeaders() }
      );
    }

    const agentData: AgentStatus = {
      status: body.status,
      agentName: body.status === 'passed' ? body.agentName : undefined,
      mission: body.mission || undefined,
      timestamp: new Date().toISOString(),
    };

    const kvKey = `agent_status_${body.borsId}`;
    const kvClient = await getKv();
    
    if (kvClient) {
      await kvClient.set(kvKey, agentData);
      console.log(`✅ Agent status stored in KV for borsId: ${body.borsId}, status: ${body.status}`);
    } else {
      // Use local cache for development
      localAgentCache[kvKey] = agentData;
      console.log(`📦 Agent status stored in local cache for borsId: ${body.borsId}, status: ${body.status} (dev mode)`);
    }

    return NextResponse.json({
      message: 'Agent status updated successfully',
      borsId: body.borsId,
      status: body.status,
      mode: kvClient ? 'kv' : 'local'
    }, { headers: corsHeaders() });
  } catch (error) {
    console.error('Error updating agent status:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500, headers: corsHeaders() }
    );
  }
}

// GET: Retrieve agent status (public endpoint)
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

    const kvKey = `agent_status_${borsId}`;
    const kvClient = await getKv();
    let agentData: AgentStatus | null = null;

    if (kvClient) {
      agentData = await kvClient.get<AgentStatus>(kvKey);
      console.log(`📥 Fetching agent status from KV for borsId: ${borsId}`);
    } else {
      // Use local cache for development
      agentData = localAgentCache[kvKey] || null;
      console.log(`📥 Fetching agent status from local cache for borsId: ${borsId} (dev mode)`);
    }

    if (!agentData) {
      // Return default pending status if no data exists yet
      return NextResponse.json({
        status: 'pending',
        timestamp: new Date().toISOString(),
        message: 'No agent status available yet for this borsId'
      }, { headers: corsHeaders() });
    }

    return NextResponse.json(agentData, { headers: corsHeaders() });
  } catch (error) {
    console.error('Error fetching agent status:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500, headers: corsHeaders() }
    );
  }
}
