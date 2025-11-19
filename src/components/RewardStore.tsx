"use client";

import React, { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import type { Reward } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TrendingUp, TrendingDown, Minus, Plus } from "lucide-react";

export default function RewardStore() {
  const [name, setName] = useState("");
  const [basePrice, setBasePrice] = useState(20);
  
  const rewards = useLiveQuery(() => db.rewards.toArray(), []) || [];

  const handleAddReward = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || basePrice <= 0) return;
    
    const maxId = rewards.length > 0 ? Math.max(...rewards.map(r => r.id)) : 0;
    const newReward: Reward = {
      id: maxId + 1,
      name,
      cost: basePrice,
      basePrice,
      currentPrice: basePrice,
    };
    
    await db.rewards.add(newReward);
    setName("");
    setBasePrice(20);
  };

  const getPriceChangeIndicator = (reward: Reward) => {
    const diff = reward.currentPrice - reward.basePrice;
    const percentChange = ((diff / reward.basePrice) * 100).toFixed(1);
    
    if (diff > 0) {
      return {
        icon: <TrendingUp className="w-3 h-3" />,
        text: `+${percentChange}%`,
        color: 'text-green-600 dark:text-green-400'
      };
    } else if (diff < 0) {
      return {
        icon: <TrendingDown className="w-3 h-3" />,
        text: `${percentChange}%`,
        color: 'text-red-600 dark:text-red-400'
      };
    } else {
      return {
        icon: <Minus className="w-3 h-3" />,
        text: '0%',
        color: 'text-gray-400'
      };
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Prisliste</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {rewards.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Ingen belønninger ennå. Legg til din første!
              </p>
            ) : (
              <div className="grid gap-3">
                {rewards.map(reward => {
                  const priceChange = getPriceChangeIndicator(reward);
                  return (
                    <div 
                      key={reward.id} 
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="font-medium">{reward.name}</div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                          <span>Grunnpris: {reward.basePrice}</span>
                          <span className={`flex items-center gap-1 ${priceChange.color}`}>
                            {priceChange.icon}
                            {priceChange.text}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-primary">
                          {reward.currentPrice}
                        </div>
                        <div className="text-xs text-muted-foreground">poeng</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Legg til ny belønning
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddReward} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="reward-name">Navn</Label>
                <Input
                  id="reward-name"
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="F.eks. 15 min spilletid"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reward-price">Grunnpris (poeng)</Label>
                <Input
                  id="reward-price"
                  type="number"
                  value={basePrice}
                  onChange={e => setBasePrice(Number(e.target.value))}
                  min={1}
                  required
                />
              </div>
            </div>
            <Button type="submit" className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Legg til belønning
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
        <CardContent className="pt-6">
          <div className="text-sm space-y-2 text-blue-900 dark:text-blue-100">
            <p className="font-semibold">💡 Dynamisk prissetting</p>
            <p>Prisene endres automatisk basert på popularitet:</p>
            <ul className="list-disc list-inside space-y-1 text-xs ml-2">
              <li>Kjøpt belønning: pris øker (konfigurerbart i innstillinger)</li>
              <li>Andre belønninger: deler prisøkningen likt mellom seg som reduksjon</li>
              <li>Dette gir matematisk balanse (zero-sum) - populære varer blir dyrere, upopulære billigere</li>
              <li>Prisene holdes innenfor konfigurerte grenser (standard: 50%-200% av grunnpris)</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
