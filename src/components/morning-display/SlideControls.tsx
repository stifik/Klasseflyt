'use client';

import { ChevronLeft, ChevronRight, Maximize2 } from 'lucide-react';
import { useState, useEffect } from 'react';

type SlideControlsProps = {
  currentSlide: number;
  onSlideChange: (slide: number) => void;
  maxSlide?: number;
  showEditButton?: boolean;
  onEditClick?: () => void;
  isEditMode?: boolean;
};

export default function SlideControls({ 
  currentSlide, 
  onSlideChange, 
  maxSlide = 3,
  showEditButton = false,
  onEditClick,
  isEditMode = false
}: SlideControlsProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const checkFullscreen = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', checkFullscreen);
    return () => document.removeEventListener('fullscreenchange', checkFullscreen);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F11') {
        e.preventDefault();
        toggleFullscreen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (err) {
      console.error('Error toggling fullscreen:', err);
    }
  };

  const goToPrevSlide = () => {
    if (currentSlide > 1) {
      onSlideChange(currentSlide - 1);
    }
  };

  const goToNextSlide = () => {
    if (currentSlide < maxSlide) {
      onSlideChange(currentSlide + 1);
    }
  };

  return (
    <div className="slide-controls-footer">
      {/* Left side - Edit button (only on slide 2) */}
      <div className="slide-controls-left">
        {showEditButton && (
          <button
            onClick={onEditClick}
            className="slide-edit-button"
            aria-label={isEditMode ? 'Avslutt redigering' : 'Rediger'}
          >
            {isEditMode ? '✓ Ferdig' : '✏️ Rediger'}
          </button>
        )}
      </div>

      {/* Center - Navigation dots and arrows */}
      <div className="slide-controls-center">
        <button
          onClick={goToPrevSlide}
          disabled={currentSlide === 1}
          className="slide-arrow"
          aria-label="Forrige slide"
        >
          <ChevronLeft size={32} />
        </button>

        <div className="slide-dots">
          {Array.from({ length: maxSlide }, (_, i) => i + 1).map((slideNum) => (
            <button
              key={slideNum}
              onClick={() => onSlideChange(slideNum)}
              className={`slide-dot ${currentSlide === slideNum ? 'active' : ''}`}
              aria-label={`Gå til slide ${slideNum}`}
              aria-current={currentSlide === slideNum ? 'true' : 'false'}
            />
          ))}
        </div>

        <button
          onClick={goToNextSlide}
          disabled={currentSlide === maxSlide}
          className="slide-arrow"
          aria-label="Neste slide"
        >
          <ChevronRight size={32} />
        </button>
      </div>

      {/* Right side - Fullscreen button */}
      <div className="slide-controls-right">
        <button
          onClick={toggleFullscreen}
          className="slide-fullscreen-button"
          aria-label={isFullscreen ? 'Avslutt fullskjerm' : 'Fullskjerm'}
          aria-pressed={isFullscreen}
        >
          <Maximize2 size={24} />
        </button>
      </div>
    </div>
  );
}
