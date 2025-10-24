'use client';

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
  // Replace {klassenavn} placeholder with actual class name
  const formattedMessage = message.replace('{klassenavn}', className);

  return (
    <div className="welcome-section">
      <h1 className="welcome-message">{formattedMessage}</h1>
      <p className="instructions">{instructions}</p>
    </div>
  );
}
