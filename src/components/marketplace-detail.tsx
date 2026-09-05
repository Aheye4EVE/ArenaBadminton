"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useActionState } from "react";
import { ArrowLeft, Check, MessageCircle, PackageSearch, Send, ShieldAlert, ShieldCheck, Tag, UserRound, XCircle } from "lucide-react";
import { requestMarketplacePurchaseAction, updateMarketplaceOrderAction, type MarketplaceActionState } from "@/app/marketplace/actions";

type Listing = { id: string; sellerId: string; title: string; description: string; category: string; conditionGrade: string; price: number; province: string | null; district: string | null; subdistrict: string | null; imageUrl: string | null; status: string; sellerName: string; sellerHandle: string; sellerLevel: number; sellerAvatarUrl: string | null };
type Order = { id: string; buyerId: string; sellerId: string; status: string; message: string; createdAt: string; buyerName: string };
const statusLabels: Record<string, string> = { requested: "รอผู้ขายตอบรับ", accepted: "นัดหมายซื้อขาย", rejected: "ปฏิเสธแล้ว", cancelled: "ยกเลิกแล้ว", completed: "ปิดการขายแล้ว" };
const categoryLabels: Record<string, string> = { racket: "ไม้แบด", shoes: "รองเท้า", bag: "กระเป๋า", apparel: "เสื้อผ้า", equipment: "อุปกรณ์", other: "อื่น ๆ" };
const conditionLabels: Record<string, string> = { new: "ของใหม่", like_new: "เหมือนใหม่", good: "สภาพดี", fair: "มีร่องรอย", for_parts: "ขายตามสภาพ" };

function Feedback({ state }: { state: MarketplaceActionState }) {
  if (!state.error && !state.message) return null;
  return <p className={state.error ? "marketplace-form-feedback marketplace-form-feedback--error" : "marketplace-form-feedback"} role={state.error ? "alert" : "status"}>{state.error ? <XCircle size={14} /> : <Check size={14} />}{state.error ?? state.message}</p>;
}

function OrderControls({ order, listingId, currentUserId }: { order: Order; listingId: string; currentUserId: string }) {
  const [state, action, pending] = useActionState(updateMarketplaceOrderAction, {});
  const seller = order.sellerId === currentUserId;
  const buyer = order.buyerId === currentUserId;
  return <article className="marketplace-order"><div><strong>{seller ? `คำขอจาก ${order.buyerName}` : "คำขอซื้อของคุณ"}</strong><span>{statusLabels[order.status] ?? order.status}</span>{order.message ? <p>“{order.message}”</p> : null}</div><div className="marketplace-order__actions">{seller && order.status === "requested" ? <><button form={`accept-${order.id}`} type="submit" disabled={pending}>รับคำขอ</button><button form={`reject-${order.id}`} type="submit" disabled={pending}>ปฏิเสธ</button></> : null}{seller && order.status === "accepted" ? <button form={`complete-${order.id}`} type="submit" disabled={pending}>ยืนยันปิดการขาย</button> : null}{buyer && ["requested", "accepted"].includes(order.status) ? <button form={`cancel-${order.id}`} type="submit" disabled={pending}>ยกเลิก</button> : null}</div>{["accept", "reject", "complete", "cancel"].map((decision) => <form id={`${decision}-${order.id}`} action={action} key={decision}><input type="hidden" name="orderId" value={order.id} /><input type="hidden" name="listingId" value={listingId} /><input type="hidden" name="decision" value={decision} /></form>)}<Feedback state={state} /></article>;
}

export default function MarketplaceDetail({ listing, orders, currentUserId }: { listing: Listing; orders: Order[]; currentUserId: string }) {
  const [state, action, pending] = useActionState(requestMarketplacePurchaseAction, {});
  const isSeller = listing.sellerId === currentUserId;
  return (
    <main className="marketplace-detail-page">
      <div className="marketplace-detail-shell">
        <header className="groups-topbar"><Link href="/marketplace" className="groups-back"><ArrowLeft size={17} /> กลับตลาดมือสอง</Link><Link href="/" className="groups-brand"><span>Arena</span><em>-Badminton</em></Link><Link href="/messages" className="organizer-user-chip">Messages</Link></header>
        <section className="marketplace-detail-hero"><div className="marketplace-detail-image">{listing.imageUrl ? <img src={listing.imageUrl} alt="" /> : <PackageSearch size={45} />}</div><div className="marketplace-detail-copy"><div className="marketplace-card__tags"><span><Tag size={12} /> {categoryLabels[listing.category] ?? listing.category}</span><span>{conditionLabels[listing.conditionGrade] ?? listing.conditionGrade}</span></div><h1>{listing.title}</h1><strong>฿{listing.price.toLocaleString("th-TH", { maximumFractionDigits: 2 })}</strong><p><ShieldCheck size={14} /> {[listing.subdistrict, listing.district, listing.province].filter(Boolean).join(" · ") || "ไม่ระบุพื้นที่นัดรับ"}</p></div></section>
        <div className="marketplace-detail-columns">
          <section className="marketplace-detail-panel"><div className="marketplace-detail-panel__heading"><div><p lang="en">Item details</p><h2>รายละเอียดสินค้า</h2></div><span className={`marketplace-status marketplace-status--${listing.status}`}>{listing.status === "active" ? "ยังว่าง" : listing.status === "reserved" ? "มีคนจอง" : "ขายแล้ว"}</span></div><p className="marketplace-description">{listing.description || "ผู้ขายยังไม่ได้เพิ่มรายละเอียด"}</p><div className="marketplace-seller"><span>{listing.sellerAvatarUrl ? <img src={listing.sellerAvatarUrl} alt="" /> : <UserRound size={18} />}</span><div><strong>{listing.sellerName}</strong><small>@{listing.sellerHandle} · Level {listing.sellerLevel}</small></div><Link href={`/messages?user=${listing.sellerId}`} className="group-secondary-action"><MessageCircle size={14} /> คุยกับผู้ขาย</Link></div></section>
          <aside>{!isSeller && listing.status === "active" ? <form className="marketplace-purchase-form" action={action}><div><p lang="en">Interested?</p><h2>ส่งคำขอซื้อ</h2><span>ระบบจะส่งคำขอให้ผู้ขาย แล้วคุยรายละเอียดผ่าน Messages</span></div><textarea name="message" maxLength={1000} placeholder="เช่น ขอสอบถามสภาพ/นัดรับสินค้า" /><input type="hidden" name="listingId" value={listing.id} /><button type="submit" className="group-primary-action" disabled={pending}><Send size={15} /> {pending ? "กำลังส่ง..." : "ส่งคำขอซื้อ"}</button><Feedback state={state} /></form> : <section className="marketplace-purchase-locked"><PackageSearch size={25} /><strong>{isSeller ? "นี่คือประกาศของคุณ" : "รายการนี้ไม่เปิดรับคำขอแล้ว"}</strong><span>{isSeller ? "ดูแลคำขอซื้อด้านล่าง และนัดหมายกับผู้ซื้ออย่างปลอดภัย" : "สถานะสินค้านี้เปลี่ยนแปลงแล้ว"}</span></section>}</aside>
        </div>
        {orders.length > 0 ? <section className="marketplace-detail-panel marketplace-orders-panel"><div className="marketplace-detail-panel__heading"><div><p lang="en">Purchase requests</p><h2>คำขอซื้อสินค้า</h2></div><span>{orders.length} รายการ</span></div>{orders.map((order) => <OrderControls key={order.id} order={order} listingId={listing.id} currentUserId={currentUserId} />)}</section> : null}
        <footer className="marketplace-detail-footer"><Link href="/marketplace"><ArrowLeft size={14} /> ตลาดมือสอง</Link><Link href={`/moderation/report?targetType=marketplace_listing&targetId=${listing.id}&returnTo=/marketplace/${listing.id}`} className="venue-review-report"><ShieldAlert size={13} /> รายงานประกาศ</Link><span>โปรดตรวจสอบสินค้า นัดหมายในพื้นที่ปลอดภัย และอย่าโอนเงินก่อนตรวจสอบ</span></footer>
      </div>
    </main>
  );
}
