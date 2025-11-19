/**
 * EKSEMPEL: Hvordan bruke prishistorikk-funksjonen
 * 
 * Dette er et eksempel på hvordan du kan hente og vise prishistorikk
 * for en belønning i din React-komponent.
 */

import { useState, useEffect } from 'react';
import { getPriceHistory } from '@/lib/rewardService';

interface PriceHistoryData {
  rewardId: number;
  rewardName: string;
  history: Array<{
    timestamp: string;
    price: number;
    date: string;
  }>;
}

export function PriceHistoryExample({ rewardId }: { rewardId: number }) {
  const [historyData, setHistoryData] = useState<PriceHistoryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getPriceHistory(rewardId);
      setHistoryData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Feil ved henting av prishistorikk');
      console.error('Error fetching price history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (rewardId) {
      fetchHistory();
    }
  }, [rewardId]);

  if (loading) {
    return <div>Laster prishistorikk...</div>;
  }

  if (error) {
    return <div>Feil: {error}</div>;
  }

  if (!historyData || historyData.history.length === 0) {
    return <div>Ingen prishistorikk tilgjengelig ennå.</div>;
  }

  return (
    <div className="price-history">
      <h3>Prishistorikk for {historyData.rewardName}</h3>
      <table>
        <thead>
          <tr>
            <th>Dato</th>
            <th>Pris</th>
          </tr>
        </thead>
        <tbody>
          {historyData.history.map((entry, index) => (
            <tr key={index}>
              <td>{new Date(entry.timestamp).toLocaleString('nb-NO')}</td>
              <td>{entry.price} poeng</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * ALTERNATIV BRUK: Med chart-bibliotek (f.eks. recharts)
 * 
 * npm install recharts
 * 
 * import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
 * 
 * export function PriceHistoryChart({ rewardId }: { rewardId: number }) {
 *   const [historyData, setHistoryData] = useState<PriceHistoryData | null>(null);
 * 
 *   useEffect(() => {
 *     getPriceHistory(rewardId).then(setHistoryData);
 *   }, [rewardId]);
 * 
 *   if (!historyData) return null;
 * 
 *   return (
 *     <LineChart width={600} height={300} data={historyData.history}>
 *       <CartesianGrid strokeDasharray="3 3" />
 *       <XAxis dataKey="date" />
 *       <YAxis />
 *       <Tooltip />
 *       <Legend />
 *       <Line type="monotone" dataKey="price" stroke="#8884d8" name="Pris (poeng)" />
 *     </LineChart>
 *   );
 * }
 */
