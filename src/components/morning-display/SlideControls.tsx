'use client';

type SlideControlsProps = {
  currentSlide: number;
  onSlideChange: (slide: number) => void;
};

export default function SlideControls({ currentSlide, onSlideChange }: SlideControlsProps) {
  return (
    <div className="slide-controls">
      {currentSlide === 1 && (
        <button
          onClick={() => onSlideChange(2)}
          className="slide-button"
        >
          Dagsplan →
        </button>
      )}

      {currentSlide === 2 && (
        <div className="slide-controls-row">
          <button
            onClick={() => onSlideChange(1)}
            className="dagsplan-btn slide-button slide-controls-top"
          >
            ← Innsjekking
          </button>

          <button
            onClick={() => onSlideChange(3)}
            className="slide-button"
          >
            Agent Reveal →
          </button>
        </div>
      )}

      {currentSlide === 3 && (
        <button
          onClick={() => onSlideChange(2)}
          className="dagsplan-btn slide-button slide-controls-top"
        >
          ← Dagsplan
        </button>
      )}
    </div>
  );
}
