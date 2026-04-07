import { useState, useCallback } from "react";

export const MAX_FAILED_ATTEMPTS = 3;

export const BLOCKED_MESSAGE =
  "Prekoračen je broj pokušaja. Pokušajte ponovo kasnije ili kontaktirajte podršku.";

/**
 * Hook za pracenje neuspelih pokusaja verifikacije.
 *
 * Counter persistira u `sessionStorage` pod kljucem `failed_attempts_${scope}`,
 * tako da F5 / re-mount komponente NE resetuje broj pokusaja. Counter se brise
 * tek kad eksplicitno pozovemo `reset()` ili kad se zatvori tab/browser.
 *
 * Razliciti `scope`-ovi (npr. "login", "totp", "totp-setup") ne dele isti
 * brojac — svaki flow ima svoju nezavisnu blokadu.
 *
 * @param {string} scope - identifikator flow-a (npr. "login", "totp")
 * @param {number} max - maksimalan broj pokusaja pre blokade
 */
export default function useFailedAttempts(scope = "default", max = MAX_FAILED_ATTEMPTS) {
  const storageKey = `failed_attempts_${scope}`;

  const readInitial = () => {
    if (typeof window === "undefined") return 0;
    const raw = window.sessionStorage.getItem(storageKey);
    const parsed = parseInt(raw, 10);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  };

  const [attempts, setAttempts] = useState(readInitial);

  const increment = useCallback(() => {
    setAttempts((n) => {
      const next = n + 1;
      try {
        window.sessionStorage.setItem(storageKey, String(next));
      } catch {
        // ignore (npr. storage disabled)
      }
      return next;
    });
  }, [storageKey]);

  const reset = useCallback(() => {
    setAttempts(0);
    try {
      window.sessionStorage.removeItem(storageKey);
    } catch {
      // ignore
    }
  }, [storageKey]);

  const isBlocked = attempts >= max;

  return { attempts, isBlocked, increment, reset };
}
