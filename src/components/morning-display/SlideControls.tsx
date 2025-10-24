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
        <button
          onClick={() => onSlideChange(1)}
          className="slide-button"
        >
          ← Innsjekking
        </button>
      )}
    </div>
  );
}
