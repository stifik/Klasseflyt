import type { NextApiRequest, NextApiResponse } from 'next';
import { kv } from '@vercel/kv';

type RewardPrice = {
  id: number;
  name: string;
  basePrice: number;
  currentPrice: number;
};

type PriceData = {
  rewards: RewardPrice[];
  lastUpdated: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // CORS headers for offentlig børs-display
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // POST: Oppdater priser (kun for lærer-app)
  if (req.method === 'POST') {
    const authHeader = req.headers.authorization;
    const expectedAuth = `Bearer ${process.env.API_SECRET_KEY}`;

    if (!authHeader || authHeader !== expectedAuth) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { borsId, rewards } = req.body;

    if (!borsId || typeof borsId !== 'string') {
      return res.status(400).json({ message: 'BorsID is required and must be a string' });
    }

    if (!rewards || !Array.isArray(rewards)) {
      return res.status(400).json({ message: 'Rewards must be an array' });
    }

    try {
      const priceData: PriceData = {
        rewards,
        lastUpdated: new Date().toISOString(),
      };

      // Lagre med unik nøkkel basert på borsId
      await kv.set(`price_list_${borsId}`, priceData);

      console.log(`✅ Prices updated for borsId: ${borsId}`);
      
      return res.status(200).json({ 
        message: 'Prices updated successfully',
        borsId,
        count: rewards.length 
      });
    } catch (error) {
      console.error('Error updating prices:', error);
      return res.status(500).json({ message: 'Failed to update prices' });
    }
  }

  // GET: Hent priser (for både lærer-app og offentlig display)
  if (req.method === 'GET') {
    const { borsId } = req.query;

    if (!borsId || typeof borsId !== 'string') {
      return res.status(400).json({ message: 'BorsID is required as query parameter' });
    }

    try {
      const priceData = await kv.get<PriceData>(`price_list_${borsId}`);

      if (!priceData) {
        return res.status(404).json({ 
          message: 'No price data found for this BorsID',
          borsId 
        });
      }

      return res.status(200).json(priceData);
    } catch (error) {
      console.error('Error fetching prices:', error);
      return res.status(500).json({ message: 'Failed to fetch prices' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
