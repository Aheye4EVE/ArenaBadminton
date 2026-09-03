"use client";

import { useActionState } from "react";
import Link from "next/link";
import { BadgeCheck, Check, Gem, History, PackageOpen, Sparkles, Zap } from "lucide-react";
import {
  purchaseShopItemAction,
  setShopItemEquippedAction,
  type ShopActionState,
} from "@/app/shop/actions";

export type ShopCatalogItem = {
  id: string;
  slug: string;
  name: string;
  description: string;
  itemType: string;
  rarityTier: string;
  icon: string;
  effectType: string;
  effectValue: number;
  priceGems: number;
};

export type ShopInventoryItem = ShopCatalogItem & {
  inventoryId: string;
  quantity: number;
  isEquipped: boolean;
  acquiredAt: string;
};

const rarityLabels: Record<string, string> = {
  white: "White",
  green: "Green",
  blue: "Blue",
  purple: "Purple",
  orange: "Orange",
  red: "Red",
  gold: "Gold",
  rainbow: "Rainbow",
};

function formatNumber(value: number) {
  return value.toLocaleString("th-TH");
}

function ActionFeedback({ state }: { state: ShopActionState }) {
  if (!state.error && !state.message) return null;
  return (
    <p className={`shop-live-feedback ${state.error ? "shop-live-feedback--error" : "shop-live-feedback--success"}`} role={state.error ? "alert" : "status"}>
      {state.error ? <Sparkles size={16} /> : <Check size={16} />}
      {state.error ?? state.message}
    </p>
  );
}

function EffectLabel({ item }: { item: ShopCatalogItem }) {
  if (item.effectType === "exp_boost") {
    return <span className="shop-live-effect"><Zap size={14} /> +{item.effectValue}% EXP</span>;
  }
  return <span className="shop-live-effect shop-live-effect--muted">Cosmetic item</span>;
}

export default function ShopBrowser({
  items,
  inventory,
  gemsBalance,
  purchaseKeys,
}: {
  items: ShopCatalogItem[];
  inventory: ShopInventoryItem[];
  gemsBalance: number;
  purchaseKeys: Record<string, string>;
}) {
  const [purchaseState, purchaseFormAction, isPurchasing] = useActionState(purchaseShopItemAction, {});
  const [equipState, equipFormAction, isEquipping] = useActionState(setShopItemEquippedAction, {});
  const equippedItem = inventory.find((item) => item.isEquipped && item.effectType === "exp_boost");

  return (
    <main className="shop-live-page">
      <div className="shop-live-shell">
        <header className="shop-live-topbar">
          <Link href="/" className="shop-live-brand" aria-label="กลับหน้าหลัก Arena-Badminton"><span>Arena</span><em>-Badminton</em></Link>
          <nav className="shop-live-nav" aria-label="เมนูร้านค้า"><Link href="/groups">ก๊วน</Link><Link href="/matches">แมตช์</Link><Link className="shop-live-nav__active" href="/shop">ร้านค้า</Link><Link href="/profile">Profile</Link></nav>
          <div className="shop-live-user"><span>🧑🏻</span><span>Shop & Inventory</span></div>
        </header>

        <section className="shop-live-hero">
          <div>
            <p lang="en">Collect more, play more</p>
            <h1>ร้านค้า Arena</h1>
            <span>ซื้อ Badge แล้วเลือก Equip เพื่อรับ EXP Bonus จากแมตช์ที่ยืนยันผล</span>
          </div>
          <div className="shop-live-hero__sparkle" aria-hidden="true">💎</div>
        </section>

        <section className="shop-live-balance" aria-label="ยอด Arena Gems">
          <div className="shop-live-balance__icon"><Gem size={24} /></div>
          <div><p>ยอด Arena Gems</p><strong>{formatNumber(gemsBalance)}</strong></div>
          <div className="shop-live-balance__status"><History size={15} /><span>Virtual currency<br /><small>Payment phase จะเพิ่มช่องทางเติมเงิน</small></span></div>
        </section>

        <ActionFeedback state={purchaseState} />
        <ActionFeedback state={equipState} />

        <section className="shop-live-section">
          <div className="shop-live-section__heading"><div><p lang="en">Arena Collection</p><h2>Badge เพิ่ม EXP</h2></div><span>{items.length} รายการ</span></div>
          {items.length === 0 ? <div className="shop-live-empty"><PackageOpen size={25} /><strong>ยังไม่มี Item เปิดขาย</strong><span>ผู้ดูแลระบบจะเพิ่ม Item ใน Catalog ให้เร็ว ๆ นี้</span></div> : <div className="shop-live-grid">
            {items.map((item) => {
              const canAfford = gemsBalance >= item.priceGems;
              return <article key={item.id} className={`shop-live-card shop-live-card--${item.rarityTier}`}>
                <div className="shop-live-card__art"><span>{item.icon}</span><small>{rarityLabels[item.rarityTier] ?? item.rarityTier}</small></div>
                <div className="shop-live-card__body"><span className="shop-live-card__tag">{item.itemType === "badge" ? "BADGE ITEM" : "ITEM"}</span><h3>{item.name}</h3><p>{item.description}</p><EffectLabel item={item} /><div className="shop-live-card__footer"><strong><Gem size={15} /> {formatNumber(item.priceGems)}</strong><form action={purchaseFormAction}><input type="hidden" name="itemId" value={item.id} /><input type="hidden" name="quantity" value="1" /><input type="hidden" name="idempotencyKey" value={purchaseKeys[item.id]} /><button type="submit" className="shop-live-buy" disabled={isPurchasing || !canAfford}>{isPurchasing ? "กำลังซื้อ..." : canAfford ? "ซื้อ Item" : "Gems ไม่พอ"}</button></form></div></div>
              </article>;
            })}
          </div>}
        </section>

        <section className="shop-live-section shop-live-inventory-section">
          <div className="shop-live-section__heading"><div><p lang="en">Your Collection</p><h2>Inventory ของฉัน</h2></div><span>{inventory.length} ชิ้น</span></div>
          <div className="shop-live-equipped-note"><BadgeCheck size={17} /><span>{equippedItem ? <>กำลังใช้ <strong>{equippedItem.name}</strong> · ทุกแมตช์จะได้ Base EXP + Item Bonus แยกกัน</> : "ยังไม่มี EXP Booster ที่ Equip · EXP จะได้รับตามรางวัลพื้นฐานจากผู้จัด"}</span></div>
          {inventory.length === 0 ? <div className="shop-live-empty shop-live-empty--inventory"><PackageOpen size={25} /><strong>Inventory ยังว่างอยู่</strong><span>ซื้อ Badge จากด้านบน แล้ว Item จะถูกบันทึกเป็น Record ของคุณ</span></div> : <div className="shop-live-inventory-list">
            {inventory.map((item) => <article className={`shop-live-inventory-row ${item.isEquipped ? "shop-live-inventory-row--equipped" : ""}`} key={item.inventoryId}><div className={`shop-live-inventory-row__icon shop-live-inventory-row__icon--${item.rarityTier}`}>{item.icon}</div><div className="shop-live-inventory-row__info"><strong>{item.name}</strong><span>{rarityLabels[item.rarityTier] ?? item.rarityTier} · มี {formatNumber(item.quantity)} ชิ้น</span><EffectLabel item={item} /></div><form action={equipFormAction}><input type="hidden" name="itemId" value={item.id} /><input type="hidden" name="equipped" value={item.isEquipped ? "false" : "true"} /><button type="submit" className={item.isEquipped ? "shop-live-unequip" : "shop-live-equip"} disabled={isEquipping}>{item.isEquipped ? "ถอด Equip" : "Equip"}</button></form></article>)}
          </div>}
        </section>

        <aside className="shop-live-safety"><Sparkles size={18} /><span><strong>กติกาแต้มของ Arena</strong> EXP จากผู้จัดและ EXP Bonus จาก Item ถูกบันทึกคนละ ledger ส่วน BP ไม่สามารถซื้อหรือเพิ่มจาก Shop ได้ และระบบจะคำนวณฝั่ง server เท่านั้น</span></aside>
        <footer className="shop-live-footer"><Link href="/">Arena-Badminton</Link><span>Phase 5 · Shop / Inventory / EXP Booster</span></footer>
      </div>
    </main>
  );
}
