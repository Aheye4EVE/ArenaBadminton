"use client";

import { useRef, useState } from "react";
import { ImagePlus, LoaderCircle, Trash2, X } from "lucide-react";
import ProfileMediaCropper from "@/components/profile-media-cropper";

const BACKGROUND_MAX_BYTES = 10 * 1024 * 1024;
const BACKGROUND_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"]);

type PresignResponse = {
  uploadUrl?: string;
  objectKey?: string;
  publicUrl?: string | null;
  requiredHeaders?: Record<string, string>;
  message?: string;
};

function focusValue(value: number | string | null | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(100, Math.max(0, parsed)) : 50;
}

export default function ProfileBackgroundUpload({ initialUrl, initialFocusX, initialFocusY }: { initialUrl: string | null; initialFocusX?: number | string | null; initialFocusY?: number | string | null }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState(initialUrl);
  const [focusX, setFocusX] = useState(focusValue(initialFocusX));
  const [focusY, setFocusY] = useState(focusValue(initialFocusY));
  const [objectKey, setObjectKey] = useState("");
  const [removeBackground, setRemoveBackground] = useState(false);
  const [cropConfirmed, setCropConfirmed] = useState(true);
  const [cropOpen, setCropOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [message, setMessage] = useState("");
  const [messageIsError, setMessageIsError] = useState(false);

  async function uploadBackground(file: File) {
    setMessage("");
    setMessageIsError(false);
    if (!BACKGROUND_TYPES.has(file.type) || file.size > BACKGROUND_MAX_BYTES) {
      setMessage("ภาพพื้นหลังต้องเป็น JPG, PNG, WebP, GIF หรือ AVIF ขนาดไม่เกิน 10 MB");
      setMessageIsError(true);
      return;
    }

    setIsUploading(true);
    try {
      const response = await fetch("/api/media/presign", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ filename: file.name, contentType: file.type, size: file.size, purpose: "profile-background" }) });
      const result = await response.json() as PresignResponse;
      if (!response.ok || !result.uploadUrl || !result.objectKey || !result.publicUrl) throw new Error(result.message ?? "ยังไม่ได้ตั้งค่า Public URL ของ R2");
      const uploadResponse = await fetch(result.uploadUrl, { method: "PUT", headers: result.requiredHeaders, body: file });
      if (!uploadResponse.ok) throw new Error("อัปโหลดภาพพื้นหลังไม่สำเร็จ");
      setPreviewUrl(result.publicUrl);
      setObjectKey(result.objectKey);
      setFocusX(50);
      setFocusY(50);
      setCropConfirmed(false);
      setCropOpen(true);
      setRemoveBackground(false);
      setImageFailed(false);
      setMessage("อัปโหลดภาพแล้ว ลากภาพเลือกมุม จากนั้นกดยืนยันการ Crop");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "อัปโหลดภาพพื้นหลังไม่สำเร็จ");
      setMessageIsError(true);
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function clearBackground() {
    setPreviewUrl(null);
    setObjectKey("");
    setRemoveBackground(true);
    setCropConfirmed(true);
    setImageFailed(false);
    setMessage("ลบภาพพื้นหลังเดิมแล้ว กดบันทึกเพื่อยืนยัน");
    setMessageIsError(false);
  }

  return (
    <div className="profile-background-editor">
      <div className="profile-background-editor__heading"><div><strong>ภาพพื้นหลัง Profile</strong><span>ใช้ภาพอัตราส่วนมาตรฐาน 3:1 · JPG, PNG, WebP, GIF หรือ AVIF ไม่เกิน 5 MB</span></div><span className="profile-background-editor__badge">Banner 3:1</span></div>
      {previewUrl && !imageFailed ? <div className="profile-background-editor__selected"><span>มีภาพพื้นหลังที่เลือกไว้แล้ว</span><button type="button" className="avatar-crop-button" onClick={() => setCropOpen(true)} disabled={isUploading}><ImagePlus size={15} /> ปรับ Crop</button></div> : <div className="profile-background-editor__empty">ยังไม่มีภาพพื้นหลัง · ระบบจะใช้พื้นหลัง Rainbow Court ให้โดยอัตโนมัติ</div>}
      <div className="profile-background-editor__footer">
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadBackground(file); }} />
        <button type="button" className="avatar-upload-button" onClick={() => inputRef.current?.click()} disabled={isUploading}><ImagePlus size={16} />{isUploading ? <><LoaderCircle className="community-spin" size={15} /> กำลังอัปโหลด</> : previewUrl ? "เปลี่ยนภาพพื้นหลัง" : "อัปโหลดภาพพื้นหลัง"}</button>
        {previewUrl ? <button type="button" className="avatar-remove-button" onClick={clearBackground} disabled={isUploading}><Trash2 size={15} /> ลบภาพ</button> : null}
        {message ? <small className={messageIsError ? "profile-background-editor__message profile-background-editor__message--error" : "profile-background-editor__message"} role={messageIsError ? "alert" : "status"}>{message}</small> : null}
      </div>
      {cropOpen && previewUrl && !imageFailed ? (
        <div className="profile-media-modal" role="dialog" aria-modal="true" aria-labelledby="profile-background-crop-title">
          <button type="button" className="profile-media-modal__backdrop" aria-label="ปิดหน้าต่าง Crop" onClick={() => setCropOpen(false)} />
          <div className="profile-media-modal__surface">
            <div className="profile-media-modal__header">
              <div><p lang="en">Profile cover</p><strong id="profile-background-crop-title">จัดตำแหน่งภาพพื้นหลัง</strong></div>
              <button type="button" className="profile-media-modal__close" aria-label="ปิดหน้าต่าง Crop" onClick={() => setCropOpen(false)}><X size={18} /></button>
            </div>
            <ProfileMediaCropper url={previewUrl} alt="ภาพพื้นหลัง Profile" focusX={focusX} focusY={focusY} aspectRatio="banner" confirmed={cropConfirmed} onFocusChange={(nextX, nextY) => { setFocusX(nextX); setFocusY(nextY); setCropConfirmed(false); }} onConfirm={() => { setCropConfirmed(true); setCropOpen(false); setMessage("ยืนยันตำแหน่งภาพพื้นหลังแล้ว"); setMessageIsError(false); }} />
            <p className="profile-media-modal__note">รูปต้นฉบับจะไม่ถูกลดความละเอียด ระบบจะบันทึกเฉพาะตำแหน่งที่เลือกไว้ใช้แสดงผล</p>
          </div>
        </div>
      ) : null}
      <input type="hidden" name="profileBackgroundObjectKey" value={objectKey} readOnly />
      <input type="hidden" name="removeProfileBackground" value={removeBackground ? "true" : "false"} readOnly />
      <input type="hidden" name="backgroundFocusX" value={focusX} readOnly />
      <input type="hidden" name="backgroundFocusY" value={focusY} readOnly />
      <input type="hidden" name="profileBackgroundCropConfirmed" value={cropConfirmed ? "true" : "false"} readOnly />
    </div>
  );
}
