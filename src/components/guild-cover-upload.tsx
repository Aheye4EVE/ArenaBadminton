"use client";

import { ImagePlus, LoaderCircle, RectangleHorizontal, Trash2 } from "lucide-react";
import { useRef, useState } from "react";

const MAX_BYTES = 5 * 1024 * 1024;
const TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

type PresignResponse = {
  uploadUrl?: string;
  objectKey?: string;
  publicUrl?: string | null;
  requiredHeaders?: Record<string, string>;
  message?: string;
};

export default function GuildCoverUpload({ guildId, initialUrl }: { guildId: string; initialUrl: string | null }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState(initialUrl);
  const [objectKey, setObjectKey] = useState("");
  const [removeCover, setRemoveCover] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function upload(file: File) {
    setError("");
    setMessage("");
    if (!TYPES.has(file.type) || file.size > MAX_BYTES) {
      setError("ภาพหน้าปกต้องเป็น JPG, PNG หรือ WebP ขนาดไม่เกิน 5 MB");
      return;
    }

    setIsUploading(true);
    try {
      const response = await fetch("/api/media/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, contentType: file.type, size: file.size, purpose: "guild-cover", guildId }),
      });
      const result = await response.json() as PresignResponse;
      if (!response.ok || !result.uploadUrl || !result.objectKey || !result.publicUrl) throw new Error(result.message ?? "เตรียมอัปโหลดภาพหน้าปกไม่สำเร็จ");
      const uploadResponse = await fetch(result.uploadUrl, { method: "PUT", headers: result.requiredHeaders, body: file });
      if (!uploadResponse.ok) throw new Error("อัปโหลดภาพหน้าปกไม่สำเร็จ");
      setPreviewUrl(result.publicUrl);
      setObjectKey(result.objectKey);
      setRemoveCover(false);
      setMessage("อัปโหลดแล้ว กดบันทึก Guild เพื่อยืนยัน");
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "อัปโหลดภาพหน้าปกไม่สำเร็จ");
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function clear() {
    setPreviewUrl(null);
    setObjectKey("");
    setRemoveCover(true);
    setMessage("ลบภาพหน้าปกเดิมแล้ว กดบันทึกเพื่อยืนยัน");
    setError("");
  }

  return (
    <div className="guild-cover-editor">
      <div className="guild-cover-editor__preview">
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt="ภาพหน้าปก Guild ที่เลือก" />
        ) : <RectangleHorizontal size={34} aria-hidden="true" />}
      </div>
      <div className="guild-cover-editor__copy">
        <strong>Guild Cover Banner</strong>
        <span>JPG, PNG หรือ WebP · ไม่เกิน 5 MB · แนะนำภาพแนวกว้าง 21:9</span>
        {error ? <small className="guild-form-feedback guild-form-feedback--error" role="alert">{error}</small> : null}
        {message ? <small className="guild-form-feedback" role="status">{message}</small> : null}
      </div>
      <div className="guild-cover-editor__actions">
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file); }} />
        <button type="button" className="guild-secondary-action" onClick={() => inputRef.current?.click()} disabled={isUploading}><ImagePlus size={15} /> {isUploading ? <><LoaderCircle className="community-spin" size={14} /> กำลังอัปโหลด</> : "เปลี่ยนภาพปก"}</button>
        {previewUrl ? <button type="button" className="guild-danger-action" onClick={clear} disabled={isUploading}><Trash2 size={14} /> ลบ</button> : null}
      </div>
      <input type="hidden" name="coverObjectKey" value={objectKey} readOnly />
      <input type="hidden" name="removeCover" value={removeCover ? "true" : "false"} readOnly />
    </div>
  );
}
