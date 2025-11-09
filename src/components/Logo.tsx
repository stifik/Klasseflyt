export function Logo({ className }: { className?: string }) {
  return (
    <svg 
      width="32" 
      height="32" 
      viewBox="0 0 80 80" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="gradSimple" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#60a5fa', stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: '#3b82f6', stopOpacity: 1 }} />
        </linearGradient>
      </defs>
      
      <path 
        d="M 15 25 Q 30 20, 40 25 T 65 25" 
        stroke="url(#gradSimple)" 
        strokeWidth="3.5" 
        fill="none" 
        strokeLinecap="round"
        opacity="0.7"
      />
      
      <path 
        d="M 15 40 Q 30 35, 40 40 T 65 40" 
        stroke="url(#gradSimple)" 
        strokeWidth="3.5" 
        fill="none" 
        strokeLinecap="round"
        opacity="0.55"
      />
      
      <path 
        d="M 15 55 Q 30 50, 40 55 T 65 55" 
        stroke="url(#gradSimple)" 
        strokeWidth="3.5" 
        fill="none" 
        strokeLinecap="round"
        opacity="0.4"
      />
      
      <path 
        d="M 20 45 L 35 60 Q 50 25, 75 15" 
        stroke="#2db83d" 
        strokeWidth="8" 
        fill="none" 
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
