import RewardDashboard from "@/components/RewardDashboard";
import RewardSystemLayout from "@/components/RewardSystemLayout";

export default function Page() {
  return (
    <RewardSystemLayout showBackButton={true}>
      <RewardDashboard />
    </RewardSystemLayout>
  );
}
