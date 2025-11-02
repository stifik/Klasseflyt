'use client';

type SlideControlsProps = {
  currentSlide: number;
  onSlideChange: (slide: number) => void;
  maxSlide?: number;
};

export default function SlideControls({ currentSlide, onSlideChange, maxSlide = 3 }: SlideControlsProps) {
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
        <div className="slide-controls-row flex items-center gap-4">
          <button
            onClick={() => onSlideChange(1)}
            className="dagsplan-btn slide-button slide-controls-top"
          >
            ← Innsjekking
          </button>

          {maxSlide >= 3 && (
            <button
              onClick={() => onSlideChange(3)}
              className="dagsplan-btn slide-button"
            >
              Agent Reveal →
            </button>
          )}
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
