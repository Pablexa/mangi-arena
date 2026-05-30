import { useState, useEffect } from 'react';

export function usePlayerControls() {
  const [movement, setMovement] = useState({
    forward: false,
    backward: false,
    left: false,
    right: false,
    jump: false,
    turbo: false,
    brake: false,
    shoot: false,
    reload: false,
    scoreboard: false,
    toggleCamera: false,
    reset: false,
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;

      // Prevenir el comportamiento por defecto del TAB
      if (e.code === 'Tab') e.preventDefault();

      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          setMovement((m) => ({ ...m, forward: true }));
          break;
        case 'KeyS':
        case 'ArrowDown':
          setMovement((m) => ({ ...m, backward: true }));
          break;
        case 'KeyA':
        case 'ArrowLeft':
          setMovement((m) => ({ ...m, left: true }));
          break;
        case 'KeyD':
        case 'ArrowRight':
          setMovement((m) => ({ ...m, right: true }));
          break;
        case 'Space':
          setMovement((m) => ({ ...m, jump: true }));
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          setMovement((m) => ({ ...m, turbo: true }));
          break;
        case 'KeyB':
          setMovement((m) => ({ ...m, brake: true }));
          break;
        case 'KeyR':
          setMovement((m) => ({ ...m, reload: true }));
          break;
        case 'KeyT':
          setMovement((m) => ({ ...m, toggleCamera: true }));
          break;
        case 'Tab':
          setMovement((m) => ({ ...m, scoreboard: true }));
          break;
        case 'KeyV':
          setMovement((m) => ({ ...m, reset: true }));
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          setMovement((m) => ({ ...m, forward: false }));
          break;
        case 'KeyS':
        case 'ArrowDown':
          setMovement((m) => ({ ...m, backward: false }));
          break;
        case 'KeyA':
        case 'ArrowLeft':
          setMovement((m) => ({ ...m, left: false }));
          break;
        case 'KeyD':
        case 'ArrowRight':
          setMovement((m) => ({ ...m, right: false }));
          break;
        case 'Space':
          setMovement((m) => ({ ...m, jump: false }));
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          setMovement((m) => ({ ...m, turbo: false }));
          break;
        case 'KeyB':
          setMovement((m) => ({ ...m, brake: false }));
          break;
        case 'KeyR':
          setMovement((m) => ({ ...m, reload: false }));
          break;
        case 'KeyT':
          setMovement((m) => ({ ...m, toggleCamera: false }));
          break;
        case 'Tab':
          setMovement((m) => ({ ...m, scoreboard: false }));
          break;
        case 'KeyV':
          setMovement((m) => ({ ...m, reset: false }));
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  return movement;
}
