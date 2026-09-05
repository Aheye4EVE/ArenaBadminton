"use client";

import { useRef, type PointerEvent as ReactPointerEvent } from "react";
import { Check, Move } from "lucide-react";

type ProfileMediaCropperProps = {
  url: string;
  alt: string;
  focusX: number;
  focusY: number;
  aspectRatio: "square" | "banner";
  confirmed: boolean;
  confirmDisabled?: boolean;
  onFocusChange: (focusX: number, focusY: number) => void;
  onConfirm: () => void;
};

const clamp = (value: number) => Math.min(100, Math.max(0, value));

export default function ProfileMediaCropper({ url, alt, focusX, focusY, aspectRatio, confirmed, confirmDisabled = false, onFocusChange, onConfirm }: ProfileMediaCropperProps) {
  const dragRef = useRef<{ startX: number; startY: number; focusX: number; focusY: number } | null>(null);

  const beginDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { startX: event.clientX, startY: event.clientY, focusX, focusY };
  };

  const moveDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    // Moving the photo right/down reveals the opposite side of the source.
    onFocusChange(
      clamp(drag.focusX - ((event.clientX - drag.startX) / bounds.width) * 100),
      clamp(drag.focusY - ((event.clientY - drag.startY) / bounds.height) * 100),
    );
  };

  const endDrag = () => { dragRef.current = null; };

  return (
    <div className={`profile-media-cropper profile-media-cropper--${aspectRatio}`}>
      <div
        className="profile-media-cropper__frame"
        onPointerDown={beginDrag}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        role="img"
        aria-label={`${alt} พื้นที่ Crop ลากเพื่อเลือกตำแหน่ง`}
      >
        {/* The source file is never drawn to a canvas or recompressed. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={alt} style={{ objectPosition: `${focusX}% ${focusY}%` }} draggable={false} />
        <span className="profile-media-cropper__hint"><Move size={14} /> ลากภาพเพื่อเลือกมุมที่ต้องการ</span>
      </div>
      <div className="profile-media-cropper__footer">
        <span>{confirmed ? "ยืนยันตำแหน่งแล้ว" : "เลือกตำแหน่งก่อนบันทึก"}</span>
        <button type="button" className={confirmed ? "profile-media-cropper__confirm profile-media-cropper__confirm--confirmed" : "profile-media-cropper__confirm"} onClick={onConfirm} disabled={confirmDisabled}>
          <Check size={14} /> {confirmDisabled ? "กำลังบันทึก..." : confirmed ? "Crop แล้ว" : "ยืนยันการ Crop"}
        </button>
      </div>
    </div>
  );
}
