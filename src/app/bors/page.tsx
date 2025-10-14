"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface Reward {
  id: number;
  name: string;
  basePrice: number;
  currentPrice: number;
}

interface PriceData {
  rewards: Reward[];
  lastUpdated: string | null;
}

export default function BorsPage() {
  const [priceData, setPriceData] = useState<PriceData>({ rewards: [], lastUpdated: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Function to fetch price data
    const fetchPrices = async () => {
      try {
        const response = await fetch('/api/prices');
        if (!response.ok) {
          throw new Error('Failed to fetch prices');
        }
        const data: PriceData = await response.json();
        setPriceData(data);
        setError(null);
      } catch (err) {
        console.error("Error fetching prices:", err);
        setError('Kunne ikke hente priser. Prøv igjen senere.');
      } finally {
        setLoading(false);
      }
    };

    // Fetch immediately
    fetchPrices();

    // Set up polling every 5 seconds
    const intervalId = setInterval(fetchPrices, 5000);

    // Cleanup interval on unmount
    return () => clearInterval(intervalId);
  }, []);

  const getPriceChangeIndicator = (reward: Reward) => {
    const diff = reward.currentPrice - reward.basePrice;
    const percentChange = Math.round((diff / reward.basePrice) * 100);
    
    if (diff > 0) {
      return {
        icon: <TrendingUp className="w-4 h-4 text-green-600" />,
        text: `+${percentChange}%`,
        color: 'text-green-600'
      };
    } else if (diff < 0) {
      return {
        icon: <TrendingDown className="w-4 h-4 text-red-600" />,
        text: `${percentChange}%`,
        color: 'text-red-600'
      };
    } else {
      return {
        icon: <Minus className="w-4 h-4 text-gray-400" />,
        text: '0%',
        color: 'text-gray-400'
      };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-700 dark:text-gray-300">Laster priser...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-red-600">Feil</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 dark:text-gray-300">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-2">
            Klasseflyt Børs 📈
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Sanntidspriser på klassebelønninger
          </p>
          {priceData.lastUpdated && (
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
              Sist oppdatert: {new Date(priceData.lastUpdated).toLocaleString('nb-NO')}
            </p>
          )}
        </div>

        {/* Dagens vindere og tapere */}
        {priceData.rewards.length > 0 && (() => {
          const sortedByChange = [...priceData.rewards].sort((a, b) => {
            const changeA = ((a.currentPrice - a.basePrice) / a.basePrice) * 100;
            const changeB = ((b.currentPrice - b.basePrice) / b.basePrice) * 100;
            return changeB - changeA;
          });
          const topGainers = sortedByChange.slice(0, 3).filter(r => r.currentPrice > r.basePrice);
          const topLosers = sortedByChange.slice(-3).reverse().filter(r => r.currentPrice < r.basePrice);

          return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* Dagens vindere */}
              {topGainers.length > 0 && (
                <Card className="border-green-200 bg-green-50/50 dark:bg-green-900/10">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2 text-green-700 dark:text-green-400">
                      <TrendingUp className="w-5 h-5" />
                      🏆 Mest etterspurt
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {topGainers.map((reward, idx) => {
                        const change = Math.round(((reward.currentPrice - reward.basePrice) / reward.basePrice) * 100);
                        return (
                          <div key={reward.id} className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded">
                            <span className="font-medium text-sm">
                              {idx + 1}. {reward.name}
                            </span>
                            <span className="text-green-600 dark:text-green-400 font-bold text-sm">
                              +{change}%
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Dagens tapere */}
              {topLosers.length > 0 && (
                <Card className="border-red-200 bg-red-50/50 dark:bg-red-900/10">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2 text-red-700 dark:text-red-400">
                      <TrendingDown className="w-5 h-5" />
                      📉 Dagens kupp
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {topLosers.map((reward, idx) => {
                        const change = Math.round(((reward.currentPrice - reward.basePrice) / reward.basePrice) * 100);
                        return (
                          <div key={reward.id} className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded">
                            <span className="font-medium text-sm">
                              {idx + 1}. {reward.name}
                            </span>
                            <span className="text-red-600 dark:text-red-400 font-bold text-sm">
                              {change}%
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          );
        })()}

        {/* Rewards Grid */}
        {priceData.rewards.length === 0 ? (
          <Card className="max-w-md mx-auto">
            <CardContent className="py-8">
              <p className="text-center text-gray-600 dark:text-gray-400">
                Ingen belønninger tilgjengelig ennå.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Alle belønninger
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {priceData.rewards
                .sort((a, b) => b.currentPrice - a.currentPrice) // Sort by price (highest first)
                .map((reward) => {
                  const priceChange = getPriceChangeIndicator(reward);
                  const diff = reward.currentPrice - reward.basePrice;
                  const isHot = diff > reward.basePrice * 0.2; // More than 20% increase
                  const isCold = diff < -reward.basePrice * 0.2; // More than 20% decrease
                  
                  return (
                    <Card 
                      key={reward.id} 
                      className={`hover:shadow-xl transition-all duration-300 border-2 ${
                        isHot ? 'border-orange-300 bg-orange-50/30 dark:bg-orange-900/10' : 
                        isCold ? 'border-blue-300 bg-blue-50/30 dark:bg-blue-900/10' : 
                        ''
                      }`}
                    >
                      <CardHeader className="pb-3">
                        <CardTitle className="text-xl font-semibold text-gray-900 dark:text-white flex items-center justify-between">
                          <span>{reward.name}</span>
                          {isHot && <span className="text-lg">🔥</span>}
                          {isCold && <span className="text-lg">❄️</span>}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {/* Current Price */}
                          <div className="flex items-baseline justify-between">
                            <span className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
                              {reward.currentPrice}
                            </span>
                            <span className="text-lg text-gray-500 dark:text-gray-400">
                              poeng
                            </span>
                          </div>

                          {/* Price Change */}
                          <div className="flex items-center justify-between pt-2 border-t">
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              Fra grunnpris:
                            </span>
                            <div className={`flex items-center gap-1 ${priceChange.color} font-medium`}>
                              {priceChange.icon}
                              <span>{priceChange.text}</span>
                            </div>
                          </div>

                          {/* Base Price */}
                          <div className="text-xs text-gray-500 dark:text-gray-500 flex justify-between">
                            <span>Grunnpris:</span>
                            <span>{reward.basePrice} poeng</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
            </div>
          </>
        )}

        {/* Info Footer */}
        <div className="mt-12 text-center">
          <Card className="max-w-2xl mx-auto bg-white/50 dark:bg-gray-800/50 backdrop-blur">
            <CardContent className="py-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                💡 Prisene oppdateres automatisk basert på etterspørsel. 
                Jo mer en belønning kjøpes, desto høyere blir prisen!
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
