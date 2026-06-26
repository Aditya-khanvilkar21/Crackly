import { useEffect } from "react";

/**
 * Warn the user before they navigate away (browser back, tab close, refresh)
 * when `when` is true. On browser back, shows a confirm() dialog and only
 * actually navigates back if confirmed.
 */
export function useUnsavedChangesWarning(
  when: boolean,
  message = "You have unsaved changes. Are you sure you want to leave? Your progress will be lost."
) {
  useEffect(() => {
    if (!when) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = message;
      return message;
    };

    // Push a sentinel state so the next "back" fires popstate without leaving the page.
    window.history.pushState({ __unsavedGuard: true }, "");

    const handlePopState = () => {
      const confirmed = window.confirm(message);
      if (confirmed) {
        // Remove our listener so we don't re-prompt, then actually go back.
        window.removeEventListener("popstate", handlePopState);
        window.removeEventListener("beforeunload", handleBeforeUnload);
        window.history.back();
      } else {
        // Re-arm the guard.
        window.history.pushState({ __unsavedGuard: true }, "");
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [when, message]);
}
