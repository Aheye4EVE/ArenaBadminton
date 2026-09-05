"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { ImagePlus, LoaderCircle, UserRound, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { updateProfileMedia } from "@/app/profile/actions";
import ProfileMediaCropper from "@/components/profile-media-cropper";
import type { ProfileActionState } from "@/lib/profile-validation";

type MediaKind = "avatar" | "background";

type PresignResponse = {
  uploadUrl?: string;
  objectKey?: string;
  publicUrl?: string | null;
  requiredHeaders?: Record<string, string>;
  message?: string;
};

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"]);
const MAX_BYTES = 5 * 1024 * 1024;

function focusValue(value: number | string | null | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(100, Math.max(0, parsed)) : 50;
}

function resetObjectUrl(ref: { current: string | null }) {
  if (ref.current) URL.revokeObjectURL(ref.current);
  ref.current = null;
}

export default function ProfileMediaInlineEditor({
  kind,
  initialUrl,
  initialFocusX,
  initialFocusY,
  displayName,
}: {
  kind: MediaKind;
  initialUrl: string | null;
  initialFocusX?: number | string | null;
  initialFocusY?: number | string | null;
  displayName: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const objectUrlRef = useRef<string | null>(null);
  const router = useRouter();
  const [state, formAction, isSaving] = useActionState<ProfileActionState, FormData>(updateProfileMedia, {});
  const [previewUrl, setPreviewUrl] = useState(initialUrl);
  const [focusX, setFocusX] = useState(focusValue(initialFocusX));
  const [focusY, setFocusY] = useState(focusValue(initialFocusY));
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  useEffect(() => () => resetObjectUrl(objectUrlRef), []);

  useEffect(() => {
    if (!state.message) return;
    const refreshTimer = window.setTimeout(() => {
      setCropOpen(false);
      setSelectedFile(null);
      resetObjectUrl(objectUrlRef);
      router.refresh();
    }, 0);
    return () => window.clearTimeout(refreshTimer);
  }, [router, state]);

  function chooseFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    setUploadError("");
    if (!file) return;
    if (!IMAGE_TYPES.has(file.type) || file.size > MAX_BYTES) {
      setUploadError("รูปต้องเป็น JPG, PNG, WebP, GIF หรือ AVIF ขนาดไม่เกิน 5 MB");
      return;
    }

    resetObjectUrl(objectUrlRef);
    const localUrl = URL.createObjectURL(file);
    objectUrlRef.current = localUrl;
    setSelectedFile(file);
    setPreviewUrl(localUrl);
    setFocusX(50);
    setFocusY(50);
    setCropOpen(true);
  }

  function cancelCrop() {
    if (isUploading || isSaving) return;
    setCropOpen(false);
    setSelectedFile(null);
    resetObjectUrl(objectUrlRef);
    setPreviewUrl(initialUrl);
    setFocusX(focusValue(initialFocusX));
    setFocusY(focusValue(initialFocusY));
    setUploadError("");
  }

  async function confirmCrop() {
    if (!selectedFile || isUploading || isSaving) return;
    setUploadError("");
    setIsUploading(true);
    try {
      const response = await fetch("/api/media/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: selectedFile.name,
          contentType: selectedFile.type,
          size: selectedFile.size,
          purpose: kind === "avatar" ? "avatar" : "profile-background",
        }),
      });
      const result = await response.json() as PresignResponse;
      if (!response.ok || !result.uploadUrl || !result.objectKey || !result.publicUrl) throw new Error(result.message ?? "ยังไม่ได้ตั้งค่า Public URL ของ R2");

      const uploadResponse = await fetch(result.uploadUrl, {
        method: "PUT",
        headers: result.requiredHeaders,
        body: selectedFile,
      });
      if (!uploadResponse.ok) throw new Error("อัปโหลดรูปไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");

      setPreviewUrl(result.publicUrl);
      const formData = new FormData();
      formData.set("mediaType", kind);
      formData.set("avatarObjectKey", kind === "avatar" ? result.objectKey : "");
      formData.set("profileBackgroundObjectKey", kind === "background" ? result.objectKey : "");
      formData.set("avatarFocusX", String(focusX));
      formData.set("avatarFocusY", String(focusY));
      formData.set("backgroundFocusX", String(focusX));
      formData.set("backgroundFocusY", String(focusY));
      formData.set("avatarCropConfirmed", kind === "avatar" ? "true" : "false");
      formData.set("profileBackgroundCropConfirmed", kind === "background" ? "true" : "false");
      formAction(formData);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "อัปโหลดรูปไม่สำเร็จ");
    } finally {
      setIsUploading(false);
    }
  }

  const feedback = uploadError || state.error;
  const isBackground = kind === "background";
  const alt = isBackground ? "ภาพพื้นหลัง Profile" : `รูปโปรไฟล์ของ ${displayName}`;

  return (
    <div className={isBackground ? "profile-inline-media-editor profile-inline-media-editor--background" : "profile-inline-media-editor profile-inline-media-editor--avatar"}>
      <button type="button" className={isBackground ? "profile-inline-media-editor__background-trigger" : "profile-overview-avatar profile-overview-avatar--large profile-inline-media-editor__avatar-trigger"} onClick={() => inputRef.current?.click()} disabled={isUploading || isSaving} aria-label={isBackground ? "เปลี่ยนภาพพื้นหลัง Profile" : "เปลี่ยนรูปโปรไฟล์"}>
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt={isBackground ? "" : alt} style={{ objectPosition: `${focusX}% ${focusY}%` }} />
        ) : isBackground ? <span className="profile-inline-media-editor__background-empty"><ImagePlus size={20} /> เพิ่มภาพพื้นหลัง</span> : <UserRound size={40} strokeWidth={1.8} aria-hidden="true" />}
        <span className="profile-inline-media-editor__trigger-label"><ImagePlus size={13} /> {isBackground ? "เปลี่ยนภาพ" : "เปลี่ยนรูป"}</span>
      </button>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" hidden onChange={chooseFile} />
      {feedback ? <p className="profile-inline-media-editor__feedback" role="alert">{feedback}</p> : null}

      {cropOpen && selectedFile && previewUrl ? (
        <div className="profile-media-modal" role="dialog" aria-modal="true" aria-labelledby={`${kind}-inline-crop-title`}>
          <button type="button" className="profile-media-modal__backdrop" aria-label="ปิดหน้าต่าง Crop" onClick={cancelCrop} />
          <div className="profile-media-modal__surface">
            <div className="profile-media-modal__header">
              <div><p lang="en">{isBackground ? "Profile cover" : "Profile photo"}</p><strong id={`${kind}-inline-crop-title`}>{isBackground ? "จัดตำแหน่งภาพพื้นหลัง" : "จัดตำแหน่งรูปโปรไฟล์"}</strong></div>
              <button type="button" className="profile-media-modal__close" aria-label="ปิดหน้าต่าง Crop" onClick={cancelCrop} disabled={isUploading || isSaving}><X size={18} /></button>
            </div>
            <ProfileMediaCropper url={previewUrl} alt={alt} focusX={focusX} focusY={focusY} aspectRatio={isBackground ? "banner" : "square"} confirmed={false} confirmDisabled={isUploading || isSaving} onFocusChange={(nextX, nextY) => { setFocusX(nextX); setFocusY(nextY); }} onConfirm={() => void confirmCrop()} />
            {feedback ? <p className="profile-media-modal__feedback" role="alert">{feedback}</p> : null}
            <p className="profile-media-modal__note">ลากภาพเพื่อเลือกจุดที่ต้องการ รูปต้นฉบับจะไม่ถูกลดความละเอียด และจะบันทึกตำแหน่งนี้ไว้ใช้แสดงผล</p>
            {isUploading || isSaving ? <p className="profile-media-modal__saving"><LoaderCircle className="community-spin" size={15} /> กำลังอัปโหลดและบันทึก...</p> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
