import RewardPOS from "@/components/RewardPOS";
import RewardSystemLayout from "@/components/RewardSystemLayout";

export default function POSPage() {
  return (
    <RewardSystemLayout showBackButton={true}>
      <RewardPOS />
    </RewardSystemLayout>
  );
}
