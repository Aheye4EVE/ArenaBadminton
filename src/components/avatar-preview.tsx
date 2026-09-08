"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Eye, ShieldCheck, X } from "lucide-react";

/**
 * Opens the original avatar bytes in a view-only lightbox. The UI deliberately
 * blocks the normal context-menu and drag affordances; this is a usability
 * guard, not a claim that a browser can prevent screenshots or developer tools.
 */
export function AvatarPreview({
  avatarUrl,
  displayName,
  children,
}: {
  avatarUrl?: string | null;
  displayName: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setOpen(false);
    };

    document.addEventListener("keydown", handleKeyDown);
    window.requestAnimationFrame(() => closeButtonRef.current?.focus());
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  if (!avatarUrl) return <>{children}</>;

  return (
    <>
      <button
        type="button"
        className="avatar-preview-trigger"
        onClick={() => setOpen(true)}
        onContextMenu={(event) => event.preventDefault()}
        aria-label={`ดูภาพ Avatar ต้นฉบับของ ${displayName}`}
      >
        {children}
        <span className="avatar-preview-trigger__hint" aria-hidden="true">
          <Eye size={12} />
        </span>
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            className="avatar-preview-backdrop"
            role="presentation"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={() => setOpen(false)}
            onContextMenu={(event) => event.preventDefault()}
          >
            <motion.section
              className="avatar-preview-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="avatar-preview-title"
              initial={{ opacity: 0, scale: 0.9, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 10 }}
              transition={{ type: "spring", stiffness: 360, damping: 26, mass: 0.75 }}
              onClick={(event) => event.stopPropagation()}
              onContextMenu={(event) => event.preventDefault()}
            >
              <div className="avatar-preview-dialog__topline">
                <span><ShieldCheck size={14} /> ARENA PASS · ORIGINAL AVATAR</span>
                <button
                  ref={closeButtonRef}
                  type="button"
                  className="avatar-preview-dialog__close"
                  onClick={() => setOpen(false)}
                  aria-label="ปิดภาพ Avatar"
                >
                  <X size={18} />
                </button>
              </div>
              <h2 id="avatar-preview-title">{displayName}</h2>
              <div
                className="avatar-preview-dialog__image-wrap"
                onContextMenu={(event) => event.preventDefault()}
              >
                <img
                  src={avatarUrl}
                  alt={`ภาพ Avatar ต้นฉบับของ ${displayName}`}
                  draggable={false}
                  onContextMenu={(event) => event.preventDefault()}
                />
              </div>
              <p className="avatar-preview-dialog__notice">
                <ShieldCheck size={13} /> โหมดดูอย่างเดียว · ปิดการลากและเมนูคลิกขวา
              </p>
            </motion.section>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
