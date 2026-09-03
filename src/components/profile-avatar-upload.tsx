"use client";

import { useRef, useState } from "react";
import { ImagePlus, LoaderCircle, Trash2, UserRound } from "lucide-react";

const AVATAR_MAX_BYTES = 5 * 1024 * 1024;
const AVATAR_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

type PresignResponse = {
  uploadUrl?: string;
  objectKey?: string;
  publicUrl?: string | null;
  requiredHeaders?: Record<string, string>;
  message?: string;
};

export default function ProfileAvatarUpload({ initialUrl, displayName }: { initialUrl: string | null; displayName: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState(initialUrl);
  const [avatarObjectKey, setAvatarObjectKey] = useState("");
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageIsError, setMessageIsError] = useState(false);

  async function uploadAvatar(file: File) {
    setMessage("");
    setMessageIsError(false);

    if (!AVATAR_TYPES.has(file.type) || file.size > AVATAR_MAX_BYTES) {
      setMessage("Avatar ต้องเป็น JPG, PNG หรือ WebP ขนาดไม่เกิน 5 MB");
      setMessageIsError(true);
      return;
    }

    setIsUploading(true);
    try {
      const response = await fetch("/api/media/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, contentType: file.type, size: file.size, purpose: "avatar" }),
      });
      const result = await response.json() as PresignResponse;
      if (!response.ok || !result.uploadUrl || !result.objectKey || !result.publicUrl) {
        throw new Error(result.message ?? "ยังไม่ได้ตั้งค่า Public URL ของ R2");
      }

      const uploadResponse = await fetch(result.uploadUrl, {
        method: "PUT",
        headers: result.requiredHeaders,
        body: file,
      });
      if (!uploadResponse.ok) throw new Error("อัปโหลด Avatar ไม่สำเร็จ");

      setPreviewUrl(result.publicUrl);
      setAvatarObjectKey(result.objectKey);
      setRemoveAvatar(false);
      setImageFailed(false);
      setMessage("อัปโหลดรูปโปรไฟล์แล้ว กดบันทึกเพื่อใช้งาน");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "อัปโหลด Avatar ไม่สำเร็จ");
      setMessageIsError(true);
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function clearAvatar() {
    setPreviewUrl(null);
    setAvatarObjectKey("");
    setRemoveAvatar(true);
    setImageFailed(false);
    setMessage("ลบรูปเดิมออกแล้ว กดบันทึกเพื่อยืนยัน");
    setMessageIsError(false);
  }

  return (
    <div className="profile-avatar-editor">
      <div className="profile-avatar-editor__preview">
        {previewUrl && !imageFailed ? (
          <>
            <span className="sr-only">รูปโปรไฟล์ที่เลือก</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewUrl} alt={`รูปโปรไฟล์ของ ${displayName}`} onError={() => setImageFailed(true)} />
          </>
        ) : <UserRound size={35} strokeWidth={1.7} aria-hidden="true" />}
      </div>
      <div className="profile-avatar-editor__copy">
        <strong>รูปโปรไฟล์</strong>
        <span>ใช้ JPG, PNG หรือ WebP ไม่เกิน 5 MB รูปจะถูกเก็บในพื้นที่ R2 ของบัญชีคุณ</span>
        {message ? <small className={messageIsError ? "profile-avatar-editor__message profile-avatar-editor__message--error" : "profile-avatar-editor__message"} role={messageIsError ? "alert" : "status"}>{message}</small> : null}
      </div>
      <div className="profile-avatar-editor__actions">
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadAvatar(file); }} />
        <button type="button" className="avatar-upload-button" onClick={() => inputRef.current?.click()} disabled={isUploading}><ImagePlus size={16} />{isUploading ? <><LoaderCircle className="community-spin" size={15} /> กำลังอัปโหลด</> : "เปลี่ยนรูป"}</button>
        {previewUrl ? <button type="button" className="avatar-remove-button" onClick={clearAvatar} disabled={isUploading}><Trash2 size={15} /> ลบรูป</button> : null}
      </div>
      <input type="hidden" name="avatarObjectKey" value={avatarObjectKey} readOnly />
      <input type="hidden" name="removeAvatar" value={removeAvatar ? "true" : "false"} readOnly />
    </div>
  );
}
