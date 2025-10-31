import RewardStore from "@/components/RewardStore";
import RewardSystemLayout from "@/components/RewardSystemLayout";

export default function Page() {
  return (
    <RewardSystemLayout showBackButton={true} settingsUrl="/settings#rewards">
      <RewardStore />
    </RewardSystemLayout>
  );
}
