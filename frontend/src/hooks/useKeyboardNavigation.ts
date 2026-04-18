import { useEffect } from 'react';

interface KeyboardNavigationOptions {
  max: number;
  onPrev: () => void;
  onNext: () => void;
}

export function useKeyboardNavigation({ max, onPrev, onNext }: KeyboardNavigationOptions) {
  useEffect(() => {
    function handleKeydown(event: KeyboardEvent) {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        onPrev();
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        onNext();
      }
    }

    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [max, onNext, onPrev]);
}
