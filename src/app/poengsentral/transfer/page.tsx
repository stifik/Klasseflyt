import Poengsentral from "@/components/Terminal";
import RewardSystemLayout from "@/components/RewardSystemLayout";

export default function TransferPage() {
  return (
    <RewardSystemLayout showBackButton={true} settingsUrl="/settings#rewards">
      <Poengsentral />
    </RewardSystemLayout>
  );
}
