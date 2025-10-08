import React, { useState } from "react";
import { rewards, Reward } from "@/lib/rewards";

export default function RewardStore() {
  const [name, setName] = useState("");
  const [cost, setCost] = useState(0);
  const [rewardList, setRewardList] = useState<Reward[]>(rewards);

  const handleAddReward = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || cost <= 0) return;
    const newReward: Reward = {
      id: rewardList.length > 0 ? Math.max(...rewardList.map(r => r.id)) + 1 : 1,
      name,
      cost,
    };
    setRewardList([...rewardList, newReward]);
    setName("");
    setCost(0);
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Butikk</h2>
      <ul className="mb-6">
        {rewardList.map(reward => (
          <li key={reward.id} className="mb-2 flex justify-between border-b pb-1">
            <span>{reward.name}</span>
            <span>{reward.cost} poeng</span>
          </li>
        ))}
      </ul>
      <form onSubmit={handleAddReward} className="flex gap-2 items-end">
        <div>
          <label className="block text-sm">Navn</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className="border p-1 rounded"
            required
          />
        </div>
        <div>
          <label className="block text-sm">Kostnad</label>
          <input
            type="number"
            value={cost}
            onChange={e => setCost(Number(e.target.value))}
            className="border p-1 rounded"
            min={1}
            required
          />
        </div>
        <button type="submit" className="bg-blue-500 text-white px-3 py-1 rounded">Legg til ny belønning</button>
      </form>
    </div>
  );
}
