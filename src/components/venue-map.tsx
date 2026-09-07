"use client";

import { importLibrary, setOptions } from "@googlemaps/js-api-loader";
import { ExternalLink, LocateFixed, MapPinned, Navigation } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  formatDistanceKm,
  normalizeCoordinates,
} from "@/lib/geolocation";
import type { DirectoryVenue } from "@/lib/venue-directory";

type MapState = "idle" | "loading" | "ready" | "missing-key" | "error";
const fallbackCenter = { lat: 13.7563, lng: 100.5018 };

function hasCoordinates(
  venue: DirectoryVenue,
): venue is DirectoryVenue & { latitude: number; longitude: number } {
  return normalizeCoordinates(venue.latitude, venue.longitude) !== null;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
function areaPath(venue: DirectoryVenue) {
  return (
    [venue.subdistrict, venue.district, venue.province]
      .filter(Boolean)
      .join(" · ") || "ยังไม่ระบุพื้นที่"
  );
}
function googleMapsUrl(venue: DirectoryVenue) {
  const coordinates = normalizeCoordinates(venue.latitude, venue.longitude);
  return coordinates
    ? `https://www.google.com/maps/dir/?api=1&destination=${coordinates.latitude},${coordinates.longitude}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([venue.name, venue.address, areaPath(venue)].filter(Boolean).join(", "))}`;
}

function makePopup(venue: DirectoryVenue) {
  const distance = formatDistanceKm(venue.distance_km);
  return `<div class="venue-map-popup"><strong>${escapeHtml(venue.name)}</strong><span>${escapeHtml(areaPath(venue))}</span><small>⭐ ${venue.rating.toFixed(1)} · ${venue.court_count ?? "ไม่ระบุ"} คอร์ท${distance ? ` · ${escapeHtml(distance)}` : ""}</small><div class="venue-map-popup__actions"><a href="/venues/${encodeURIComponent(venue.id)}">ดูรายละเอียด</a><a href="${googleMapsUrl(venue)}" target="_blank" rel="noreferrer">🚗 นำทาง</a><a href="/groups?create=1&amp;venueId=${encodeURIComponent(venue.id)}">⚡ เปิดก๊วน</a></div></div>`;
}

function markerIcon() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="46" height="46" viewBox="0 0 46 46"><defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#ff2a8d"/><stop offset="1" stop-color="#806fe4"/></linearGradient></defs><path d="M23 2C13.2 2 5.2 9.8 5.2 19.4c0 12.2 14.6 22.5 17.8 24.6 3.2-2.1 17.8-12.4 17.8-24.6C40.8 9.8 32.8 2 23 2Z" fill="url(#g)" stroke="#fff" stroke-width="3"/><text x="23" y="26" text-anchor="middle" font-size="16">🏸</text></svg>`;
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new google.maps.Size(46, 46),
    anchor: new google.maps.Point(23, 42),
  };
}

export default function VenueMap({ venues }: { venues: DirectoryVenue[] }) {
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const userMarkerRef = useRef<google.maps.Marker | null>(null);
  const userCircleRef = useRef<google.maps.Circle | null>(null);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ?? "";
  const [mapState, setMapState] = useState<MapState>(
    apiKey ? "loading" : "missing-key",
  );
  const [locationState, setLocationState] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");

  useEffect(() => {
    let disposed = false;
    function clearMapObjects() {
      markersRef.current.forEach((marker) => marker.setMap(null));
      markersRef.current = [];
      userMarkerRef.current?.setMap(null);
      userMarkerRef.current = null;
      userCircleRef.current?.setMap(null);
      userCircleRef.current = null;
      mapRef.current = null;
    }
    if (!apiKey) {
      clearMapObjects();
      return () => {
        disposed = true;
      };
    }
    setOptions({ key: apiKey, v: "weekly", language: "th", region: "TH" });
    void Promise.all([
      importLibrary("maps"),
      importLibrary("marker"),
      importLibrary("core"),
    ])
      .then(([mapsLibrary, , coreLibrary]) => {
        if (disposed || !mapElementRef.current) return;
        clearMapObjects();
        const mappedVenues = venues.filter(hasCoordinates);
        const map = new mapsLibrary.Map(mapElementRef.current, {
          center: fallbackCenter,
          zoom: 11,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          gestureHandling: "greedy",
          clickableIcons: false,
        });
        const infoWindow = new mapsLibrary.InfoWindow();
        const icon = markerIcon();
        markersRef.current = mappedVenues.map((venue) => {
          const marker = new google.maps.Marker({
            map,
            position: { lat: venue.latitude, lng: venue.longitude },
            title: venue.name,
            icon,
          });
          marker.addListener("click", () => {
            infoWindow.setContent(makePopup(venue));
            infoWindow.open({ map, anchor: marker });
          });
          return marker;
        });
        if (mappedVenues.length === 1) {
          map.setCenter({
            lat: mappedVenues[0].latitude,
            lng: mappedVenues[0].longitude,
          });
          map.setZoom(14);
        } else if (mappedVenues.length > 1) {
          const bounds = new coreLibrary.LatLngBounds();
          mappedVenues.forEach((venue) =>
            bounds.extend({ lat: venue.latitude, lng: venue.longitude }),
          );
          map.fitBounds(bounds, 34);
        }
        mapRef.current = map;
        setMapState("ready");
      })
      .catch(() => {
        if (!disposed) setMapState("error");
      });
    return () => {
      disposed = true;
      clearMapObjects();
    };
  }, [apiKey, venues]);

  function locateUser() {
    if (!navigator.geolocation || !mapRef.current) {
      setLocationState("error");
      return;
    }
    setLocationState("loading");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const coordinates = normalizeCoordinates(
          coords.latitude,
          coords.longitude,
        );
        const map = mapRef.current;
        if (!coordinates || !map) {
          setLocationState("error");
          return;
        }
        userMarkerRef.current?.setMap(null);
        userCircleRef.current?.setMap(null);
        const mapPosition = {
          lat: coordinates.latitude,
          lng: coordinates.longitude,
        };
        userMarkerRef.current = new google.maps.Marker({
          map,
          position: mapPosition,
          title: "ตำแหน่งของฉัน",
          label: { text: "●", color: "#e968a9", fontSize: "28px" },
          zIndex: 999,
        });
        userCircleRef.current = new google.maps.Circle({
          map,
          center: mapPosition,
          radius: 120,
          strokeColor: "#e968a9",
          strokeOpacity: 0.32,
          strokeWeight: 2,
          fillColor: "#f7a4ca",
          fillOpacity: 0.12,
        });
        map.setCenter(mapPosition);
        map.setZoom(13);
        setLocationState("ready");
      },
      () => setLocationState("error"),
      { enableHighAccuracy: false, maximumAge: 300_000, timeout: 8_000 },
    );
  }

  const locationMessage =
    locationState === "ready"
      ? "แสดงตำแหน่งของคุณแล้ว"
      : locationState === "error"
        ? "อนุญาต Location เพื่อดูระยะใกล้คุณ"
        : null;
  return (
    <section className="venue-map-shell" aria-label="แผนที่สนามแบดมินตัน">
      <div className="venue-map__toolbar">
        <span>
          <MapPinned size={15} /> แผนที่พิกัดจริง · {venues.length} สนาม
        </span>
        <button
          type="button"
          className="venue-map__locate"
          onClick={locateUser}
          disabled={locationState === "loading" || mapState !== "ready"}
        >
          <LocateFixed size={14} />{" "}
          {locationState === "loading" ? "กำลังค้นหา..." : "ตำแหน่งฉัน"}
        </button>
      </div>
      <div
        ref={mapElementRef}
        className="venue-map"
        aria-label="แผนที่พร้อมหมุดสนามแบดมินตัน"
      />
      {mapState === "missing-key" ? (
        <div className="venue-map__fallback">
          <Navigation size={22} />
          <strong>แผนที่พร้อมเชื่อมต่อ</strong>
          <span>
            ยังไม่ได้ตั้งค่า Google Maps JavaScript API ·
            ใช้รายการสนามและปุ่มนำทางได้ทันที
          </span>
          {venues.length > 0 ? (
            <div className="venue-map__fallback-links">
              {venues.slice(0, 5).map((venue) => (
                <a
                  key={venue.id}
                  href={googleMapsUrl(venue)}
                  target="_blank"
                  rel="noreferrer"
                >
                  <span>{venue.name}</span>
                  <ExternalLink size={13} />
                </a>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
      {mapState === "loading" ? (
        <div className="venue-map__loading">กำลังโหลดแผนที่...</div>
      ) : null}
      {mapState === "error" ? (
        <div className="venue-map__fallback">
          <Navigation size={22} />
          <strong>โหลดแผนที่ไม่สำเร็จ</strong>
          <span>คุณยังใช้ Grid และเปิด Google Maps นำทางได้ตามปกติ</span>
        </div>
      ) : null}
      {venues.length === 0 && mapState === "ready" ? (
        <div className="venue-map__empty">
          <Navigation size={18} />
          <span>ยังไม่มีสนามในพื้นที่นี้</span>
        </div>
      ) : null}
      {locationMessage ? (
        <p
          className={`venue-map__message venue-map__message--${locationState}`}
          role="status"
        >
          {locationMessage}
        </p>
      ) : null}
      <p className="venue-map__note">
        หมุดใช้ Latitude / Longitude ที่บันทึกในระบบ · ไม่เรียก Google Places
        API
      </p>
    </section>
  );
}
