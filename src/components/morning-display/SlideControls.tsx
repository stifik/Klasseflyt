'use client';

type SlideControlsProps = {
  currentSlide: number;
  onSlideChange: (slide: number) => void;
};

export default function SlideControls({ currentSlide, onSlideChange }: SlideControlsProps) {
  return (
    <div className="slide-controls">
      {currentSlide === 1 ? (
        <button
          onClick={() => onSlideChange(2)}
          className="slide-button"
        >
          Dagsplan →
        </button>
      ) : (
        // When showing the left arrow (go back to innsjekking), use the same visual style
        // as the header dagsplan button and allow CSS to position it near the top-left on slide-2
        <button
          onClick={() => onSlideChange(1)}
          className="dagsplan-btn slide-button slide-controls-top"
        >
          ← Innsjekking
        </button>
      )}
    </div>
  );
}
