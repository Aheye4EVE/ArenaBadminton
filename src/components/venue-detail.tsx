"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { ArrowLeft, ExternalLink, MapPin, MessageCircle, Navigation, ShieldAlert, Star } from "lucide-react";
import VenueReviewForm from "@/components/venue-review-form";

export type VenueDetailData = { id: string; name: string; address: string; province: string | null; district: string | null; subdistrict: string | null; courtCount: number; rating: number; availability: string; latitude: number | null; longitude: number | null; coverImageUrl: string | null };
export type VenueReviewData = { id: string; rating: number; body: string; createdAt: string; userId: string; displayName: string; handle: string; avatarUrl: string | null };

function mapsUrl(venue: VenueDetailData) {
  const query = venue.latitude !== null && venue.longitude !== null ? `${venue.latitude},${venue.longitude}` : [venue.name, venue.address, venue.district, venue.province].filter(Boolean).join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function dateLabel(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "เมื่อสักครู่" : new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeZone: "Asia/Bangkok" }).format(date);
}

export default function VenueDetail({ venue, reviews, initialReview, signedIn }: { venue: VenueDetailData; reviews: VenueReviewData[]; initialReview: { rating: number; body: string } | null; signedIn: boolean }) {
  return (
    <main className="venue-detail-page">
      <div className="venue-detail-shell">
        <header className="groups-topbar">
          <Link href="/venues" className="groups-back"><ArrowLeft size={17} /> กลับหน้าสนาม</Link>
          <Link href="/" className="groups-brand" aria-label="กลับหน้าหลัก Arena-Badminton"><span>Arena</span><em>-Badminton</em></Link>
          <Link href="/profile" className="organizer-user-chip">Profile</Link>
        </header>

        <section className="venue-detail-hero">
          <div className="venue-detail-hero__image">{venue.coverImageUrl ? <img src={venue.coverImageUrl} alt="" /> : <span>🏟️</span>}</div>
          <div><p lang="en">Court profile</p><h1>{venue.name}</h1><span><MapPin size={14} /> {[venue.subdistrict, venue.district, venue.province].filter(Boolean).join(" · ") || "ยังไม่ระบุพื้นที่"}</span><small>{venue.address}</small></div>
          <a href={mapsUrl(venue)} target="_blank" rel="noreferrer" className="group-primary-action"><Navigation size={15} /> เปิด Google Maps <ExternalLink size={13} /></a>
        </section>

        <div className="venue-detail-stats">
          <div><Star size={18} fill="currentColor" /><span><small>คะแนนเฉลี่ย</small><strong>{venue.rating.toFixed(1)} / 5</strong></span></div>
          <div><span>🏟️</span><span><small>จำนวนคอร์ท</small><strong>{venue.courtCount} คอร์ท</strong></span></div>
          <div><span>●</span><span><small>สถานะ</small><strong>{venue.availability === "available" ? "มีคิวว่าง" : "ควรเช็กคิว"}</strong></span></div>
          <div><ShieldAlert size={18} /><span><small>ความปลอดภัย</small><strong>รายงานได้</strong></span></div>
        </div>

        <div className="venue-detail-columns">
          <section className="venue-detail-panel">
            <div className="venue-detail-panel__heading"><div><p lang="en">Community reviews</p><h2><Star size={18} /> รีวิวจากผู้เล่น</h2></div><span>{reviews.length} รีวิว</span></div>
            {reviews.length > 0 ? <div className="venue-review-list">{reviews.map((review) => <article className="venue-review-card" key={review.id}><div className="venue-review-card__top"><strong>{review.displayName}</strong><span>{[1, 2, 3, 4, 5].map((value) => <Star key={value} size={13} fill={value <= review.rating ? "currentColor" : "none"} />)}</span></div><small>@{review.handle} · {dateLabel(review.createdAt)} · <Link href={`/moderation/report?targetType=venue_review&targetId=${review.id}&returnTo=/venues/${venue.id}`} className="venue-review-report" aria-label="รายงานรีวิวนี้"><ShieldAlert size={12} /> รายงาน</Link></small><p>{review.body || "ให้คะแนนสนาม"}</p></article>)}</div> : <div className="venue-detail-empty"><MessageCircle size={26} /><span>ยังไม่มีรีวิว เป็นคนแรกที่แชร์ประสบการณ์ได้เลย</span></div>}
          </section>
          <aside>
            {signedIn ? <VenueReviewForm venueId={venue.id} initialRating={initialReview?.rating ?? null} initialBody={initialReview?.body ?? ""} /> : <section className="venue-review-login"><Star size={24} /><h2>ช่วยรีวิวสนามให้เพื่อน ๆ</h2><p>เข้าสู่ระบบเพื่อให้คะแนนและบันทึกประสบการณ์ของคุณ</p><Link href={`/auth/login?next=/venues/${venue.id}`} className="group-primary-action">เข้าสู่ระบบ</Link></section>}
            <Link href="/friends" className="venue-contact-link"><MessageCircle size={16} /> หาเพื่อนคุยเรื่องสนามนี้</Link>
          </aside>
        </div>

        <footer className="venue-detail-footer"><Link href="/venues"><ArrowLeft size={14} /> กลับรายการสนาม</Link><Link href={`/moderation/report?targetType=venue&targetId=${venue.id}&returnTo=/venues/${venue.id}`} className="venue-review-report"><ShieldAlert size={13} /> รายงานข้อมูลสนาม</Link><span>ข้อมูลสนามและรีวิวจากผู้เล่น Arena</span></footer>
      </div>
    </main>
  );
}
