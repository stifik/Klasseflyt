import type { NextApiRequest, NextApiResponse } from 'next';
import { kv } from '@vercel/kv';

type AgentStatus = {
  status: 'pending' | 'analyzing' | 'passed' | 'failed';
  agentName?: string;
  mission?: string;
  timestamp: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // CORS headers for offentlig reveal-display
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // POST: Oppdater agent-status (kun for lærer-app)
  if (req.method === 'POST') {
    const authHeader = req.headers.authorization;
    const expectedAuth = `Bearer ${process.env.API_SECRET_KEY}`;

    if (!authHeader || authHeader !== expectedAuth) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { borsId, status, agentName, mission } = req.body;

    if (!borsId || typeof borsId !== 'string') {
      return res.status(400).json({ message: 'BorsID is required and must be a string' });
    }

    if (!status || !['pending', 'analyzing', 'passed', 'failed'].includes(status)) {
      return res.status(400).json({ 
        message: 'Status is required and must be one of: pending, analyzing, passed, failed' 
      });
    }

    try {
      const agentData: AgentStatus = {
        status,
        agentName: status === 'passed' ? agentName : undefined,
        mission: mission || undefined,
        timestamp: new Date().toISOString(),
      };

      // Lagre med unik nøkkel basert på borsId
      await kv.set(`agent_status_${borsId}`, agentData);

      console.log(`✅ Agent status updated for borsId: ${borsId}, status: ${status}`);
      
      return res.status(200).json({ 
        message: 'Agent status updated successfully',
        borsId,
        status 
      });
    } catch (error) {
      console.error('Error updating agent status:', error);
      return res.status(500).json({ message: 'Failed to update agent status' });
    }
  }

  // GET: Hent agent-status (for offentlig reveal-side)
  if (req.method === 'GET') {
    const { borsId } = req.query;

    if (!borsId || typeof borsId !== 'string') {
      return res.status(400).json({ message: 'BorsID is required as query parameter' });
    }

    try {
      const agentData = await kv.get<AgentStatus>(`agent_status_${borsId}`);

      if (!agentData) {
        // Returner default pending status hvis ingen data finnes ennå
        return res.status(200).json({ 
          status: 'pending',
          timestamp: new Date().toISOString()
        });
      }

      return res.status(200).json(agentData);
    } catch (error) {
      console.error('Error fetching agent status:', error);
      return res.status(500).json({ message: 'Failed to fetch agent status' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
