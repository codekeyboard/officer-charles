import { useEffect, useRef, useState } from "react";

interface ActiveInterviewGuardOptions {
  active: boolean;
  onConfirmEnd: () => Promise<void> | void;
  message?: string;
}

const DEFAULT_MESSAGE = "Do you want to end the interview?";

export function useActiveInterviewGuard({ active, onConfirmEnd, message = DEFAULT_MESSAGE }: ActiveInterviewGuardOptions) {
  const endingRef = useRef(false);
  const onConfirmEndRef = useRef(onConfirmEnd);
  const [open, setOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const pendingHrefRef = useRef<string | null>(null);

  useEffect(() => {
    onConfirmEndRef.current = onConfirmEnd;
  }, [onConfirmEnd]);

  async function confirmLeave() {
    if (endingRef.current) return;
    endingRef.current = true;
    setLeaving(true);
    try {
      await onConfirmEndRef.current();
      setOpen(false);

      const href = pendingHrefRef.current;
      pendingHrefRef.current = null;
      if (href) window.location.href = href;
    } finally {
      endingRef.current = false;
      setLeaving(false);
    }
  }

  function cancelLeave() {
    if (leaving) return;
    pendingHrefRef.current = null;
    setOpen(false);
  }

  useEffect(() => {
    if (!active) return;

    function handleDocumentClick(event: MouseEvent) {
      const target = event.target instanceof Element ? event.target.closest("a") : null;
      if (!(target instanceof HTMLAnchorElement)) return;
      if (!target.href || target.target === "_blank" || target.download) return;

      const nextUrl = new URL(target.href, window.location.href);
      if (nextUrl.origin !== window.location.origin) return;
      if (nextUrl.pathname === window.location.pathname && nextUrl.search === window.location.search) return;

      event.preventDefault();
      event.stopPropagation();
      pendingHrefRef.current = nextUrl.toString();
      setOpen(true);
    }

    document.addEventListener("click", handleDocumentClick, true);

    return () => {
      document.removeEventListener("click", handleDocumentClick, true);
    };
  }, [active]);

  useEffect(() => {
    if (active) return;
    pendingHrefRef.current = null;
    endingRef.current = false;
    setOpen(false);
    setLeaving(false);
  }, [active]);

  return {
    open,
    leaving,
    message,
    confirmLeave,
    cancelLeave,
  };
}

export type ActiveInterviewGuard = ReturnType<typeof useActiveInterviewGuard>;
