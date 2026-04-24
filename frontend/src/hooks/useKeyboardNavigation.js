import { useEffect } from 'react';

export function useKeyboardNavigation({ max, onPrev, onNext }) {
    useEffect(() => {
        function handleKeydown(event) {
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
