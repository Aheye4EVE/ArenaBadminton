"use client";

import { useActionState } from "react";
import { Check, MessageSquare, Star, XCircle } from "lucide-react";
import { upsertVenueReviewAction } from "@/app/venues/actions";

export default function VenueReviewForm({ venueId, initialRating, initialBody }: { venueId: string; initialRating: number | null; initialBody: string }) {
  const [state, action, pending] = useActionState(upsertVenueReviewAction, {});
  return <form className="venue-review-form" action={action}><div className="venue-review-form__heading"><div><p lang="en">Share your experience</p><h2><MessageSquare size={18} /> รีวิวสนามนี้</h2></div><span>แก้ไขรีวิวเดิมได้</span></div><div className="venue-review-stars" role="group" aria-label="ให้คะแนนสนาม"><span>คะแนน</span>{[1, 2, 3, 4, 5].map((value) => <label key={value}><input type="radio" name="rating" value={value} defaultChecked={initialRating === value} required /><Star size={22} fill={initialRating !== null && value <= initialRating ? "currentColor" : "none"} /><span className="sr-only">{value} ดาว</span></label>)}</div><input type="hidden" name="venueId" value={venueId} /><textarea name="body" defaultValue={initialBody} maxLength={1000} placeholder="บอกเพื่อน ๆ ว่าสนามนี้เป็นอย่างไรบ้าง" /><button type="submit" className="group-primary-action" disabled={pending}>{pending ? "กำลังบันทึก..." : "บันทึกรีวิว"}</button>{state.error ? <p className="venue-review-feedback venue-review-feedback--error" role="alert"><XCircle size={15} /> {state.error}</p> : state.message ? <p className="venue-review-feedback" role="status"><Check size={15} /> {state.message}</p> : null}</form>;
}
