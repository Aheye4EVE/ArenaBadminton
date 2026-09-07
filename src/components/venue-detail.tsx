"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import {
  ArrowLeft,
  ExternalLink,
  MapPin,
  MessageCircle,
  Navigation,
  ShieldAlert,
  Star,
} from "lucide-react";
import AccountMenu from "@/components/account-menu";
import VenueReviewForm from "@/components/venue-review-form";

export type VenueDetailData = {
  id: string;
  name: string;
  address: string;
  province: string | null;
  district: string | null;
  subdistrict: string | null;
  latitude: number | string | null;
  longitude: number | string | null;
  courtCount: number | null;
  rating: number;
  availability: string;
  coverImageUrl: string | null;
  sourceUrl: string | null;
  verifiedAt: string | null;
  openGroupCount: number;
  completedGroupCount: number;
};
export type VenueReviewData = {
  id: string;
  rating: number;
  body: string;
  createdAt: string;
  userId: string;
  displayName: string;
  handle: string;
  avatarUrl: string | null;
};

function mapsUrl(venue: VenueDetailData) {
  const latitude = Number(venue.latitude);
  const longitude = Number(venue.longitude);
  if (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  ) {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${latitude},${longitude}`)}`;
  }
  const query = [
    venue.name,
    venue.address,
    venue.subdistrict,
    venue.district,
    venue.province,
  ]
    .filter(Boolean)
    .join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function fallbackVenueImage(venue: VenueDetailData) {
  const hash = [...venue.id].reduce(
    (total, character) => total + character.charCodeAt(0),
    0,
  );
  return hash % 2 === 0
    ? "/images/venues/court-fallback-neon.webp"
    : "/images/venues/court-fallback-wood.webp";
}

function dateLabel(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "เมื่อสักครู่"
    : new Intl.DateTimeFormat("th-TH", {
        dateStyle: "medium",
        timeZone: "Asia/Bangkok",
      }).format(date);
}

export default function VenueDetail({
  venue,
  reviews,
  initialReview,
  signedIn,
}: {
  venue: VenueDetailData;
  reviews: VenueReviewData[];
  initialReview: { rating: number; body: string } | null;
  signedIn: boolean;
}) {
  return (
    <main className="venue-detail-page">
      <div className="venue-detail-shell">
        <header className="groups-topbar">
          <Link href="/venues" className="groups-back">
            <ArrowLeft size={17} /> กลับหน้าสนาม
          </Link>
          <Link
            href="/"
            className="groups-brand"
            aria-label="กลับหน้าหลัก Arena-Badminton"
          >
            <span>Arena</span>
            <em>-Badminton</em>
          </Link>
          <div className="organizer-user-chip organizer-user-chip--account">
            <AccountMenu />
          </div>
        </header>

        <section className="venue-detail-hero">
          <div className="venue-detail-hero__image">
            <img
              src={venue.coverImageUrl ?? fallbackVenueImage(venue)}
              alt=""
            />
          </div>
          <div>
            <p lang="en">Court profile</p>
            <h1>{venue.name}</h1>
            <span>
              <MapPin size={14} />{" "}
              {[venue.subdistrict, venue.district, venue.province]
                .filter(Boolean)
                .join(" · ") || "ยังไม่ระบุพื้นที่"}
            </span>
            <small>{venue.address}</small>
          </div>
          <div className="venue-detail-hero__actions">
            <a
              href={mapsUrl(venue)}
              target="_blank"
              rel="noreferrer"
              className="group-secondary-action"
            >
              <Navigation size={15} /> นำทาง <ExternalLink size={13} />
            </a>
            <Link
              href={`/groups?create=1&venueId=${encodeURIComponent(venue.id)}`}
              className="group-primary-action"
            >
              ⚡ เปิดก๊วนที่นี่
            </Link>
          </div>
        </section>

        <div className="venue-detail-stats">
          <div>
            <Star size={18} fill="currentColor" />
            <span>
              <small>คะแนนเฉลี่ย</small>
              <strong>{venue.rating.toFixed(1)} / 5</strong>
            </span>
          </div>
          <div>
            <span>🏟️</span>
            <span>
              <small>จำนวนคอร์ท</small>
              <strong>
                {venue.courtCount === null
                  ? "ยังไม่ระบุ"
                  : `${venue.courtCount} คอร์ท`}
              </strong>
            </span>
          </div>
          <div>
            <span>👥</span>
            <span>
              <small>ก๊วนที่เปิดรับ</small>
              <strong>{venue.openGroupCount} ก๊วน</strong>
            </span>
          </div>
          <div>
            <span>📅</span>
            <span>
              <small>จัดก๊วนแล้ว</small>
              <strong>{venue.completedGroupCount} ก๊วน</strong>
            </span>
          </div>
          <div>
            <ShieldAlert size={18} />
            <span>
              <small>ความปลอดภัย</small>
              <strong>รายงานได้</strong>
            </span>
          </div>
        </div>

        <div className="venue-detail-columns">
          <section className="venue-detail-panel">
            <div className="venue-detail-panel__heading">
              <div>
                <p lang="en">Community reviews</p>
                <h2>
                  <Star size={18} /> รีวิวจากผู้เล่น
                </h2>
              </div>
              <span>{reviews.length} รีวิว</span>
            </div>
            {reviews.length > 0 ? (
              <div className="venue-review-list">
                {reviews.map((review) => (
                  <article className="venue-review-card" key={review.id}>
                    <div className="venue-review-card__top">
                      <strong>{review.displayName}</strong>
                      <span>
                        {[1, 2, 3, 4, 5].map((value) => (
                          <Star
                            key={value}
                            size={13}
                            fill={
                              value <= review.rating ? "currentColor" : "none"
                            }
                          />
                        ))}
                      </span>
                    </div>
                    <small>
                      @{review.handle} · {dateLabel(review.createdAt)} ·{" "}
                      <Link
                        href={`/moderation/report?targetType=venue_review&targetId=${review.id}&returnTo=/venues/${venue.id}`}
                        className="venue-review-report"
                        aria-label="รายงานรีวิวนี้"
                      >
                        <ShieldAlert size={12} /> รายงาน
                      </Link>
                    </small>
                    <p>{review.body || "ให้คะแนนสนาม"}</p>
                  </article>
                ))}
              </div>
            ) : (
              <div className="venue-detail-empty">
                <MessageCircle size={26} />
                <span>ยังไม่มีรีวิว เป็นคนแรกที่แชร์ประสบการณ์ได้เลย</span>
              </div>
            )}
          </section>
          <aside>
            {signedIn ? (
              <VenueReviewForm
                venueId={venue.id}
                initialRating={initialReview?.rating ?? null}
                initialBody={initialReview?.body ?? ""}
              />
            ) : (
              <section className="venue-review-login">
                <Star size={24} />
                <h2>ช่วยรีวิวสนามให้เพื่อน ๆ</h2>
                <p>เข้าสู่ระบบเพื่อให้คะแนนและบันทึกประสบการณ์ของคุณ</p>
                <Link
                  href={`/auth/login?next=/venues/${venue.id}`}
                  className="group-primary-action"
                >
                  เข้าสู่ระบบ
                </Link>
              </section>
            )}
            <Link href="/friends" className="venue-contact-link">
              <MessageCircle size={16} /> หาเพื่อนคุยเรื่องสนามนี้
            </Link>
          </aside>
        </div>

        <footer className="venue-detail-footer">
          <Link href="/venues">
            <ArrowLeft size={14} /> กลับรายการสนาม
          </Link>
          {venue.sourceUrl ? (
            <a href={venue.sourceUrl} target="_blank" rel="noreferrer">
              <ExternalLink size={13} /> แหล่งข้อมูล
            </a>
          ) : null}
          <Link
            href={`/moderation/report?targetType=venue&targetId=${venue.id}&returnTo=/venues/${venue.id}`}
            className="venue-review-report"
          >
            <ShieldAlert size={13} /> รายงานข้อมูลสนาม
          </Link>
          <span>
            {venue.verifiedAt
              ? "มีการบันทึกแหล่งอ้างอิงแล้ว"
              : "ข้อมูลสนามจากทะเบียน Community"}
          </span>
        </footer>
      </div>
    </main>
  );
}
