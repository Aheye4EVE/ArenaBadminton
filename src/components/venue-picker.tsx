"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, LoaderCircle, MapPin, Search, X } from "lucide-react";
import ThaiAreaSelect from "@/components/thai-area-select";
import type { DirectoryVenue } from "@/lib/venue-directory";

export type VenuePickerVenue = {
  id: string;
  name: string;
  province: string | null;
  district: string | null;
  subdistrict: string | null;
  address: string | null;
};

function areaPath(venue: { province: string | null; district: string | null; subdistrict: string | null }) {
  return [venue.subdistrict, venue.district, venue.province].filter(Boolean).join(" · ") || "ยังไม่ระบุพื้นที่";
}

export default function VenuePicker({
  initialVenue,
  venueError,
  provinceError,
  districtError,
  subdistrictError,
}: {
  initialVenue?: VenuePickerVenue | null;
  venueError?: string;
  provinceError?: string;
  districtError?: string;
  subdistrictError?: string;
}) {
  const [selectedVenue, setSelectedVenue] = useState<VenuePickerVenue | null>(initialVenue ?? null);
  const [query, setQuery] = useState(initialVenue?.name ?? "");
  const [results, setResults] = useState<DirectoryVenue[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setIsLoading(true);
      setLoadError("");
      void fetch(`/api/venues/search?q=${encodeURIComponent(query.trim())}`, { signal: controller.signal, credentials: "same-origin" })
        .then(async (response) => {
          const payload = await response.json() as { items?: DirectoryVenue[]; error?: string };
          if (!response.ok) throw new Error(payload.error || "ค้นหาสนามไม่สำเร็จ");
          setResults(payload.items ?? []);
        })
        .catch((error: unknown) => {
          if (error instanceof DOMException && error.name === "AbortError") return;
          setLoadError(error instanceof Error ? error.message : "ค้นหาสนามไม่สำเร็จ");
          setResults([]);
        })
        .finally(() => setIsLoading(false));
    }, 220);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [isOpen, query]);

  function chooseVenue(venue: DirectoryVenue) {
    setSelectedVenue({
      id: venue.id,
      name: venue.name,
      province: venue.province,
      district: venue.district,
      subdistrict: venue.subdistrict,
      address: venue.address,
    });
    setQuery(venue.name);
    setIsOpen(false);
  }

  function clearVenue() {
    setSelectedVenue(null);
    setQuery("");
    setResults([]);
  }

  return (
    <div className="venue-picker">
      <div className={venueError ? "venue-picker__search venue-picker__search--error" : "venue-picker__search"}>
        <Search size={16} aria-hidden="true" />
        <input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setSelectedVenue(null);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="พิมพ์ชื่อสนามเพื่อค้นหาอัตโนมัติ"
          aria-label="ค้นหาสนามแบดมินตัน"
          aria-autocomplete="list"
        />
        {selectedVenue ? <button type="button" onClick={clearVenue} aria-label="ล้างสนามที่เลือก"><X size={15} /></button> : null}
      </div>
      <input type="hidden" name="venueId" value={selectedVenue?.id ?? ""} />

      {isOpen && !selectedVenue ? <div className="venue-picker__results" role="listbox" aria-label="ผลการค้นหาสนาม">
        {isLoading ? <div className="venue-picker__state"><LoaderCircle size={16} className="venue-picker__spin" />กำลังค้นหาสนาม...</div> : null}
        {!isLoading && results.map((venue) => <button type="button" className="venue-picker__result" key={venue.id} onClick={() => chooseVenue(venue)} role="option" aria-selected="false"><span className="venue-picker__result-icon"><MapPin size={15} /></span><span><strong>{venue.name}</strong><small>{areaPath(venue)}</small></span><CheckCircle2 size={15} /></button>)}
        {!isLoading && !loadError && results.length === 0 ? <div className="venue-picker__state">ไม่พบสนาม ลองค้นหาด้วยชื่อหรือพื้นที่อื่น</div> : null}
        {loadError ? <div className="venue-picker__state venue-picker__state--error">{loadError}</div> : null}
        <p className="venue-picker__hint">ค้นหาจากทะเบียนสนามของ Arena · หากยังไม่มีสนาม สามารถเสนอชื่อเพิ่มได้ที่หน้าสนาม</p>
      </div> : null}

      {selectedVenue ? <div className="venue-picker__selected"><MapPin size={17} /><div><strong>{selectedVenue.name}</strong><span>{areaPath(selectedVenue)}</span>{selectedVenue.address ? <small>{selectedVenue.address}</small> : null}</div><span className="venue-picker__selected-badge">เลือกแล้ว</span><input type="hidden" name="province" value={selectedVenue.province ?? ""} /><input type="hidden" name="district" value={selectedVenue.district ?? ""} /><input type="hidden" name="subdistrict" value={selectedVenue.subdistrict ?? ""} /></div> : <ThaiAreaSelect mode="form" provinceError={provinceError} districtError={districtError} subdistrictError={subdistrictError} />}
    </div>
  );
}
