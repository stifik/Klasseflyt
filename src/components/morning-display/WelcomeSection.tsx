'use client';

import { useEffect, useRef } from 'react';

type WelcomeSectionProps = {
  message: string;
  instructions: string;
  className: string;
};

export default function WelcomeSection({ 
  message, 
  instructions,
  className 
}: WelcomeSectionProps) {
  const messageRef = useRef<HTMLParagraphElement>(null);

  // Replace {klassenavn} placeholder with actual class name
  const formattedMessage = message.replace('{klassenavn}', className);
  const fullText = `${formattedMessage}\n\n${instructions}`;

  // Dynamisk font-size basert på tekstlengde
  useEffect(() => {
    if (!messageRef.current) return;

    const textLength = fullText.length;
    let fontSize: string;

    if (textLength < 100) {
      fontSize = '3rem';      // Kort melding = stor tekst
    } else if (textLength < 200) {
      fontSize = '2.5rem';    // Medium melding
    } else if (textLength < 300) {
      fontSize = '2rem';      // Lengre melding
    } else {
      fontSize = '1.5rem';    // Veldig lang melding = mindre tekst
    }

    messageRef.current.style.fontSize = fontSize;
  }, [fullText]);

  return (
    <p className="welcome-message" ref={messageRef} id="welcomeMessage">
      {formattedMessage}
      <br />
      <br />
      <span className="instructions-inline">{instructions}</span>
    </p>
  );
}
