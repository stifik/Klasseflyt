import ActivityFeed from "@/components/ActivityFeed";
import RewardSystemLayout from "@/components/RewardSystemLayout";

export default function ActivityFeedPage() {
  return (
    <RewardSystemLayout showBackButton={true}>
      <ActivityFeed />
    </RewardSystemLayout>
  );
}