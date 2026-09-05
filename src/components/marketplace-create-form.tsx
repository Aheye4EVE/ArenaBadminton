"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useRef, useState } from "react";
import { useActionState } from "react";
import { CheckCircle2, ImagePlus, LoaderCircle, PackagePlus, XCircle } from "lucide-react";
import { createMarketplaceListingAction } from "@/app/marketplace/actions";
import ThaiAreaSelect from "@/components/thai-area-select";

export default function MarketplaceCreateForm() {
  const [state, action, pending] = useActionState(createMarketplaceListingAction, {});
  const [imageUrl, setImageUrl] = useState("");
  const [uploadMessage, setUploadMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    if (!file.type.startsWith("image/") || file.size > 10 * 1024 * 1024) {
      setUploadMessage("รองรับรูปภาพขนาดไม่เกิน 10 MB");
      return;
    }

    setUploading(true);
    setUploadMessage("");
    try {
      const response = await fetch("/api/media/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, contentType: file.type, size: file.size, purpose: "marketplace" }),
      });
      const result = await response.json() as { uploadUrl?: string; publicUrl?: string; requiredHeaders?: Record<string, string>; message?: string };
      if (!response.ok || !result.uploadUrl || !result.publicUrl) throw new Error(result.message ?? "เตรียมอัปโหลดไม่สำเร็จ");

      const uploadResponse = await fetch(result.uploadUrl, { method: "PUT", headers: result.requiredHeaders, body: file });
      if (!uploadResponse.ok) throw new Error("อัปโหลดรูปไม่สำเร็จ");
      setImageUrl(result.publicUrl);
      setUploadMessage("แนบรูปพร้อมประกาศแล้ว");
    } catch (error) {
      setUploadMessage(error instanceof Error ? error.message : "อัปโหลดรูปไม่สำเร็จ");
    } finally {
      setUploading(false);
    }
  }

  return (
    <form className="marketplace-create-form" action={action}>
      <div className="marketplace-create-intro">
        <PackagePlus size={22} />
        <div>
          <p lang="en">Create a listing</p>
          <h2>ลงขายอุปกรณ์ของคุณ</h2>
          <span>ประกาศนี้ไม่มีค่าธรรมเนียม และการชำระเงิน/นัดรับตกลงกันผ่านผู้ใช้</span>
        </div>
      </div>

      <div className="marketplace-form-grid">
        <label>
          <span>ชื่อสินค้า *</span>
          <input name="title" maxLength={160} required placeholder="เช่น Yonex Astrox 88D Pro" />
        </label>
        <label>
          <span>ราคา (บาท) *</span>
          <input name="price" type="number" min="0" max="100000000" step="0.01" required placeholder="0" />
        </label>
        <label>
          <span>หมวดหมู่ *</span>
          <select name="category" defaultValue="equipment">
            <option value="racket">ไม้แบด</option>
            <option value="shoes">รองเท้า</option>
            <option value="bag">กระเป๋า</option>
            <option value="apparel">เสื้อผ้า</option>
            <option value="equipment">อุปกรณ์</option>
            <option value="other">อื่น ๆ</option>
          </select>
        </label>
        <label>
          <span>สภาพสินค้า *</span>
          <select name="conditionGrade" defaultValue="good">
            <option value="new">ของใหม่</option>
            <option value="like_new">เหมือนใหม่</option>
            <option value="good">สภาพดี</option>
            <option value="fair">มีร่องรอย</option>
            <option value="for_parts">ขายตามสภาพ</option>
          </select>
        </label>
        <label className="marketplace-form-grid__wide">
          <span>รายละเอียด</span>
          <textarea name="description" maxLength={3000} placeholder="รุ่น, อายุการใช้งาน, ตำหนิ, อุปกรณ์ที่แถม..." />
        </label>
      </div>

      <div className="marketplace-form-location">
        <h3>พื้นที่นัดรับ</h3>
        <ThaiAreaSelect mode="form" />
        <p>ใช้ช่วยให้ผู้ซื้อค้นหาของใกล้พื้นที่ ไม่เปิดเผยที่อยู่ส่วนตัว</p>
      </div>

      <div className="marketplace-upload">
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void upload(file);
          }}
        />
        <button type="button" className="group-secondary-action" onClick={() => fileRef.current?.click()} disabled={uploading}>
          <ImagePlus size={16} />
          {uploading ? <><LoaderCircle className="community-spin" size={15} /> กำลังอัปโหลด</> : imageUrl ? "เปลี่ยนรูปสินค้า" : "แนบรูปสินค้า"}
        </button>
        <input type="hidden" name="imageUrl" value={imageUrl} />
        <span>{uploadMessage || "แนบรูปได้ 1 รูป · JPG, PNG, WebP, GIF ไม่เกิน 10 MB"}</span>
        {imageUrl ? <img src={imageUrl} alt="ตัวอย่างรูปสินค้า" /> : null}
      </div>

      {state.error ? <p className="marketplace-form-feedback marketplace-form-feedback--error" role="alert"><XCircle size={15} /> {state.error}</p> : null}
      {state.message ? <p className="marketplace-form-feedback" role="status"><CheckCircle2 size={15} /> {state.message}</p> : null}
      <div className="marketplace-create-actions">
        <Link href="/marketplace" className="group-secondary-action">ยกเลิก</Link>
        <button type="submit" className="group-primary-action" disabled={pending || uploading}>{pending ? "กำลังเผยแพร่..." : "เผยแพร่ประกาศ"}</button>
      </div>
    </form>
  );
}
