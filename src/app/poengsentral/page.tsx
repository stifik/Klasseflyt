import Poengsentral from "@/components/Terminal";
import RewardSystemLayout from "@/components/RewardSystemLayout";

export default function PoengsentralPage() {
  return (
    <RewardSystemLayout showBackButton={true} settingsUrl="/settings#rewards">
      <Poengsentral />
    </RewardSystemLayout>
  );
}
