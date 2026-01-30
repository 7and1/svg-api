"use client";

import { useEffect, RefObject } from "react";

export const useKeyboardShortcut = (
  key: string,
  inputRef: RefObject<HTMLInputElement | null>
) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === key && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [key, inputRef]);
};
