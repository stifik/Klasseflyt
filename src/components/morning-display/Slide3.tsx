'use client';

import AgentReveal from '@/app/agent-reveal/page';

export default function Slide3() {
  return (
    <div className="slide slide-3">
      {/* Reuse the existing AgentReveal page component inside the slide */}
      <AgentReveal />
    </div>
  );
}
