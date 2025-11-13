'use client';

import { useEffect, useRef } from 'react';

type WelcomeSectionProps = {
  message: string;
  instructions: string;
  className: string;
  isEditMode?: boolean;
  onMessageChange?: (message: string) => void;
  onInstructionsChange?: (instructions: string) => void;
};

export default function WelcomeSection({ 
  message, 
  instructions,
  className,
  isEditMode = false,
  onMessageChange,
  onInstructionsChange
}: WelcomeSectionProps) {
  const messageRef = useRef<HTMLParagraphElement>(null);

  // Replace {klassenavn} placeholder with actual class name
  const formattedMessage = message.replace('{klassenavn}', className);

  // Prevent line break before emoji by replacing space+emoji with non-breaking-space+emoji
  // Uses Unicode Extended_Pictographic property to match emoji characters
  const preventEmojiBreaks = (s: string) => {
    try {
      return s.replace(/ (\p{Extended_Pictographic})/gu, '\u00A0$1');
    } catch (e) {
      // Fallback: if Unicode property escapes aren't supported, do a simple common-emoji replace
      return s.replace(/ ([\u{1F300}-\u{1F6FF}\u{2600}-\u{26FF}])/gu, '\u00A0$1');
    }
  };

  const processedMessage = preventEmojiBreaks(formattedMessage);
  const processedInstructions = preventEmojiBreaks(instructions || '');
  const fullText = `${processedMessage}\n\n${processedInstructions}`;

  // Dynamisk font-size: start fra en rimelig stor størrelse og krymp til teksten får plass i containeren
  useEffect(() => {
    const el = messageRef.current;
    if (!el) return;

    // Map the heuristic sizes (px) for initial value
    const textLength = fullText.length;
    let initialSize = 48; // px
    if (textLength < 100) initialSize = 56;
    else if (textLength < 200) initialSize = 44;
    else if (textLength < 300) initialSize = 36;
    else initialSize = 28;

    const minSize = 14; // px
    el.style.fontSize = `${initialSize}px`;
    el.style.lineHeight = '1.05';

    // Allow the browser to render and then check measurements
    const fit = () => {
      // Parent container available height
      const container = el.parentElement ?? el;
      const availableH = container.clientHeight;

      // Reset to initial size first, so text can grow back when window expands
      el.style.fontSize = `${initialSize}px`;

      // If the element's scrollHeight is greater than available height, shrink
      let current = initialSize;
      let iterations = 0;
      while (el.scrollHeight > availableH && current > minSize && iterations < 40) {
        current = Math.max(minSize, Math.floor(current * 0.95));
        el.style.fontSize = `${current}px`;
        iterations += 1;
      }
    };

    // Use rAF to let layout settle, then fit
    let raf = requestAnimationFrame(() => {
      fit();
    });

    // Re-fit on resize
    const ro = new ResizeObserver(() => {
      fit();
    });
    ro.observe(el.parentElement ?? el);

    window.addEventListener('resize', fit);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('resize', fit);
    };
  }, [fullText]);

  const renderWithLineBreaks = (text: string) => {
    return text.split('\n').map((line, idx) => (
      <span key={idx}>
        {line}
        {idx < text.split('\n').length - 1 && <br />}
      </span>
    ));
  };

  // If in edit mode, show textarea fields
  if (isEditMode) {
    return (
      <div className="welcome-message-edit">
        <div className="edit-field">
          <label>Velkomstmelding:</label>
          <textarea
            value={message}
            onChange={(e) => onMessageChange?.(e.target.value)}
            className="welcome-textarea"
            rows={4}
            placeholder="Skriv velkomstmelding..."
          />
        </div>
        <div className="edit-field">
          <label>Instrukser:</label>
          <textarea
            value={instructions}
            onChange={(e) => onInstructionsChange?.(e.target.value)}
            className="instructions-textarea"
            rows={3}
            placeholder="Skriv instrukser..."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="welcome-message" ref={messageRef} id="welcomeMessage">
      <div className="welcome-main-text">
        {renderWithLineBreaks(processedMessage)}
      </div>

      <div className="welcome-instructions">
        <span className="instructions-inline">{renderWithLineBreaks(processedInstructions)}</span>
      </div>
    </div>
  );
}
