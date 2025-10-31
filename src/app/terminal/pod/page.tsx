import Terminal from "@/components/Terminal";
import RewardSystemLayout from "@/components/RewardSystemLayout";

export default function PodPage() {
  return (
    <RewardSystemLayout showBackButton={true} settingsUrl="/settings#rewards">
      <Terminal />
    </RewardSystemLayout>
  );
}
