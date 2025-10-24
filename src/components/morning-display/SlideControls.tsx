'use client';

type SlideControlsProps = {
  currentSlide: number;
  onSlideChange: (slide: number) => void;
};

export default function SlideControls({ currentSlide, onSlideChange }: SlideControlsProps) {
  return (
    <div className="slide-controls">
      <button
        onClick={() => onSlideChange(1)}
        className={`slide-button ${currentSlide === 1 ? 'active' : ''}`}
      >
        ← Slide 1: Innsjekking
      </button>
      <button
        onClick={() => onSlideChange(2)}
        className={`slide-button ${currentSlide === 2 ? 'active' : ''}`}
      >
        Slide 2: Dagsplan →
      </button>
    </div>
  );
}
