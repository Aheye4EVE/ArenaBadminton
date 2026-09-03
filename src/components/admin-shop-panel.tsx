"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ArrowLeft, Check, Gem, LockKeyhole, Plus, Save, ShieldCheck, Sparkles, WalletCards } from "lucide-react";
import {
  creditGemsAction,
  saveShopItemAction,
  type AdminShopActionState,
} from "@/app/admin/shop/actions";
import type { ShopCatalogItem } from "@/components/shop-browser";

export type AdminShopItem = ShopCatalogItem & {
  isActive: boolean;
  sortOrder: number;
};

function Feedback({ state }: { state: AdminShopActionState }) {
  if (!state.error && !state.message) return null;
  return <p className={`admin-shop-feedback ${state.error ? "admin-shop-feedback--error" : "admin-shop-feedback--success"}`} role={state.error ? "alert" : "status"}>{state.error ? <Sparkles size={16} /> : <Check size={16} />}{state.error ?? state.message}</p>;
}

function ItemFields({ item }: { item?: AdminShopItem }) {
  return <>
    <input type="hidden" name="itemId" value={item?.id ?? ""} />
    <div className="admin-shop-form-grid admin-shop-form-grid--identity">
      <label><span>Slug</span><input name="slug" defaultValue={item?.slug ?? "new-badge"} required /></label>
      <label><span>ชื่อ Item</span><input name="name" defaultValue={item?.name ?? "New Arena Badge"} required /></label>
      <label className="admin-shop-field--wide"><span>คำอธิบาย</span><input name="description" defaultValue={item?.description ?? ""} /></label>
    </div>
    <div className="admin-shop-form-grid admin-shop-form-grid--config">
      <label><span>ประเภท</span><select name="itemType" defaultValue={item?.itemType ?? "badge"}><option value="badge">Badge</option><option value="exp_booster">EXP Booster</option><option value="title">Title</option><option value="cosmetic">Cosmetic</option></select></label>
      <label><span>Tier</span><select name="rarityTier" defaultValue={item?.rarityTier ?? "green"}><option value="white">White</option><option value="green">Green</option><option value="blue">Blue</option><option value="purple">Purple</option><option value="orange">Orange</option><option value="red">Red</option><option value="gold">Gold</option><option value="rainbow">Rainbow</option></select></label>
      <label><span>Icon</span><input name="icon" defaultValue={item?.icon ?? "✨"} maxLength={16} required /></label>
      <label><span>Effect</span><select name="effectType" defaultValue={item?.effectType ?? "exp_boost"}><option value="exp_boost">EXP Boost</option><option value="none">None</option></select></label>
      <label><span>ค่า Effect %</span><input name="effectValue" type="number" min={0} max={100} defaultValue={item?.effectValue ?? 10} required /></label>
      <label><span>ราคา Gems</span><input name="priceGems" type="number" min={0} max={1000000000} defaultValue={item?.priceGems ?? 49} required /></label>
      <label><span>ลำดับ</span><input name="sortOrder" type="number" min={-32768} max={32767} defaultValue={item?.sortOrder ?? 0} required /></label>
      <label className="admin-shop-checkbox"><input name="isActive" type="checkbox" value="true" defaultChecked={item?.isActive ?? true} /><span>เปิดขายใน Shop</span></label>
    </div>
  </>;
}

function ItemEditor({ item, action, pending }: { item?: AdminShopItem; action: (payload: FormData) => void; pending: boolean }) {
  return <form className="admin-shop-item-editor" action={action}><div className="admin-shop-item-editor__heading"><div><span>{item ? "Edit Catalog Item" : "Create Catalog Item"}</span><h3>{item ? item.name : "เพิ่ม Item ใหม่"}</h3></div><span className={`admin-shop-status ${item?.isActive ?? true ? "admin-shop-status--active" : "admin-shop-status--inactive"}`}>{item?.isActive ?? true ? "ACTIVE" : "ปิดขาย"}</span></div><ItemFields item={item} /><button type="submit" className="admin-shop-save" disabled={pending}>{item ? <Save size={15} /> : <Plus size={15} />}{pending ? "กำลังบันทึก..." : item ? "บันทึกการแก้ไข" : "สร้าง Item"}</button></form>;
}

export default function AdminShopPanel({ items, creditRequestKey, loadError }: { items: AdminShopItem[]; creditRequestKey: string; loadError?: string }) {
  const [saveState, saveFormAction, isSaving] = useActionState(saveShopItemAction, {});
  const [creditState, creditFormAction, isCrediting] = useActionState(creditGemsAction, {});
  const activeCount = items.filter((item) => item.isActive).length;

  return <main className="admin-shop-page"><div className="admin-shop-shell">
    <header className="admin-shop-topbar"><Link href="/shop" className="admin-shop-back"><ArrowLeft size={16} /> กลับหน้า Shop</Link><Link href="/" className="admin-shop-brand"><span>Arena</span><em>-Badminton</em></Link><span className="admin-shop-role"><ShieldCheck size={15} /> Admin Console</span></header>
    <section className="admin-shop-hero"><div><p lang="en">Control Center · Phase 6</p><h1>จัดการ Shop & Wallet</h1><span>ดูแล Catalog, เปิด/ปิดขาย Item และเติม Gems แบบ Internal ที่มี Audit trail</span></div><div className="admin-shop-hero__art">🛡️</div></section>
    <div className="admin-shop-stats"><div><span>Catalog ทั้งหมด</span><strong>{items.length}</strong></div><div><span>กำลังเปิดขาย</span><strong>{activeCount}</strong></div><div><span>ผลกระทบต่อ BP</span><strong>ไม่มี</strong></div></div>
    {loadError ? <p className="admin-shop-feedback admin-shop-feedback--error" role="alert"><Sparkles size={16} />{loadError}</p> : null}
    <Feedback state={saveState} />
    <section className="admin-shop-panel"><div className="admin-shop-section-heading"><div><p lang="en">Catalog Manager</p><h2>Shop Items</h2></div><span>แก้ไขราคา/Effect ได้ · ลบใช้วิธีปิดขาย</span></div><ItemEditor action={saveFormAction} pending={isSaving} />{items.length > 0 ? <div className="admin-shop-item-list">{items.map((item) => <ItemEditor key={item.id} item={item} action={saveFormAction} pending={isSaving} />)}</div> : null}</section>
    <section className="admin-shop-panel admin-shop-wallet-panel"><div className="admin-shop-section-heading"><div><p lang="en">Internal Wallet Control</p><h2>เติม Arena Gems</h2></div><span>Admin/Test only</span></div><div className="admin-shop-wallet-warning"><LockKeyhole size={18} /><span>หน้านี้ไม่ใช่ Payment Gateway การเติมทุกครั้งต้องอ้างอิงเหตุผลหรือรายการตรวจสอบ และระบบจะบันทึกเป็น <strong>admin_credit</strong> ใน Wallet Ledger</span></div><Feedback state={creditState} /><form className="admin-shop-credit-form" action={creditFormAction}><label><span>User ID</span><input name="userId" placeholder="UUID ของ User ที่ต้องการเติม" required /></label><label><span>จำนวน Gems</span><input name="amount" type="number" min={1} max={1000000000} placeholder="เช่น 250" required /></label><label><span>เหตุผล / Reference</span><input name="reference" placeholder="เช่น internal-test-credit" required /></label><input type="hidden" name="idempotencyKey" value={creditRequestKey} /><button type="submit" className="admin-shop-credit-button" disabled={isCrediting}><WalletCards size={16} />{isCrediting ? "กำลังบันทึก..." : "เติม Gems และบันทึก Audit"}</button></form></section>
    <aside className="admin-shop-safety"><ShieldCheck size={18} /><span><strong>สิทธิ์ถูกบังคับซ้ำที่ Database</strong> หน้าเว็บตรวจ Admin เพื่อ UX แต่ RPC ตรวจ `admin_users` และ `auth.uid()` อีกชั้นหนึ่ง ส่วน `admin_users` ไม่มีสิทธิ์อ่าน/เขียนผ่าน Data API</span></aside>
    <footer className="admin-shop-footer"><Link href="/shop">Shop</Link><span><Gem size={13} /> Phase 6 · Admin catalog and wallet foundation</span></footer>
  </div></main>;
}
