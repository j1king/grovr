import { useEffect, useCallback, useRef } from 'react';

interface KeyboardShortcutOptions {
  /** The key to listen for (e.g., 'Enter', 'Escape', 's') */
  key: string;
  /** Require Cmd (Mac) or Ctrl (Windows/Linux) modifier */
  cmdOrCtrl?: boolean;
  /** Whether the shortcut is currently enabled */
  enabled?: boolean;
}

/**
 * Hook for handling keyboard shortcuts
 *
 * @example
 * // Cmd/Ctrl+Enter to save
 * useKeyboardShortcut({ key: 'Enter', cmdOrCtrl: true }, handleSave, !saving && isValid);
 *
 * // Enter to confirm modal
 * useKeyboardShortcut({ key: 'Enter' }, handleConfirm, isModalOpen);
 */
export function useKeyboardShortcut(
  options: KeyboardShortcutOptions,
  callback: () => void,
  enabled: boolean = true
) {
  const { key, cmdOrCtrl = false } = options;

  // Use ref to always have access to the latest callback without re-subscribing
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;

      const modifierMatch = cmdOrCtrl ? (e.metaKey || e.ctrlKey) : true;

      if (modifierMatch && e.key === key) {
        e.preventDefault();
        callbackRef.current();
      }
    },
    [key, cmdOrCtrl, enabled]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
