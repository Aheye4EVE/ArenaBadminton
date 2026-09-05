"use client";

import { importLibrary, setOptions } from "@googlemaps/js-api-loader";
import { ExternalLink, LocateFixed, MapPinned, Navigation } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Court } from "@/lib/demo-data";

type MapState = "idle" | "loading" | "ready" | "missing-key" | "error";

const fallbackCenter = { lat: 13.7563, lng: 100.5018 };

function hasCoordinates(court: Court): court is Court & { latitude: number; longitude: number } {
  return Number.isFinite(court.latitude)
    && Number.isFinite(court.longitude)
    && Math.abs(court.latitude) <= 90
    && Math.abs(court.longitude) <= 180
    && (court.latitude !== 0 || court.longitude !== 0);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function googleMapsUrl(court: Court) {
  const hasLocation = Number.isFinite(court.latitude)
    && Number.isFinite(court.longitude)
    && (court.latitude !== 0 || court.longitude !== 0);
  return hasLocation
    ? `https://www.google.com/maps/search/?api=1&query=${court.latitude},${court.longitude}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([court.name, court.address].filter(Boolean).join(", "))}`;
}

function makePopup(court: Court) {
  const address = [court.subdistrict, court.district, court.province].filter(Boolean).join(" · ");
  return `
    <div class="venue-map-popup">
      <strong>${escapeHtml(court.name)}</strong>
      <span>${escapeHtml(address || court.address || "ยังไม่มีข้อมูลที่อยู่")}</span>
      <small>${escapeHtml(`${court.rating} ดาว · ${court.courtCount} คอร์ท · ${court.distance}`)}</small>
      <div class="venue-map-popup__actions">
        <a href="/venues/${encodeURIComponent(court.id)}">ดูรายละเอียด</a>
        <a href="${googleMapsUrl(court)}" target="_blank" rel="noreferrer">เปิด Google Maps</a>
      </div>
    </div>
  `;
}

function markerIcon() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="46" height="46" viewBox="0 0 46 46"><defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#ff91c1"/><stop offset="1" stop-color="#806fe4"/></linearGradient></defs><path d="M23 2C13.2 2 5.2 9.8 5.2 19.4c0 12.2 14.6 22.5 17.8 24.6 3.2-2.1 17.8-12.4 17.8-24.6C40.8 9.8 32.8 2 23 2Z" fill="url(#g)" stroke="#fff" stroke-width="3"/><text x="23" y="26" text-anchor="middle" font-size="16">🏸</text></svg>`;
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new google.maps.Size(46, 46),
    anchor: new google.maps.Point(23, 42),
  };
}

export default function VenueMap({ venues }: { venues: Court[] }) {
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const userMarkerRef = useRef<google.maps.Marker | null>(null);
  const userCircleRef = useRef<google.maps.Circle | null>(null);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ?? "";
  const [mapState, setMapState] = useState<MapState>(apiKey ? "loading" : "missing-key");
  const [locationState, setLocationState] = useState<"idle" | "loading" | "ready" | "error">("idle");

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
      return () => { disposed = true; };
    }

    setOptions({ key: apiKey, v: "weekly", language: "th", region: "TH" });

    void Promise.all([importLibrary("maps"), importLibrary("marker"), importLibrary("core")]).then(([mapsLibrary, , coreLibrary]) => {
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

      markersRef.current = mappedVenues.map((court) => {
        const marker = new google.maps.Marker({
          map,
          position: { lat: court.latitude, lng: court.longitude },
          title: court.name,
          icon,
        });
        marker.addListener("click", () => {
          infoWindow.setContent(makePopup(court));
          infoWindow.open({ map, anchor: marker });
        });
        return marker;
      });

      if (mappedVenues.length === 1) {
        map.setCenter({ lat: mappedVenues[0].latitude, lng: mappedVenues[0].longitude });
        map.setZoom(14);
      } else if (mappedVenues.length > 1) {
        const bounds = new coreLibrary.LatLngBounds();
        mappedVenues.forEach((court) => bounds.extend({ lat: court.latitude, lng: court.longitude }));
        map.fitBounds(bounds, 34);
      }

      mapRef.current = map;
      setMapState("ready");
    }).catch(() => {
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
        const map = mapRef.current;
        if (!map) return;

        userMarkerRef.current?.setMap(null);
        userCircleRef.current?.setMap(null);
        userMarkerRef.current = new google.maps.Marker({
          map,
          position: { lat: coords.latitude, lng: coords.longitude },
          title: "ตำแหน่งของฉัน",
          label: { text: "●", color: "#e968a9", fontSize: "28px" },
          zIndex: 999,
        });
        userCircleRef.current = new google.maps.Circle({
          map,
          center: { lat: coords.latitude, lng: coords.longitude },
          radius: 120,
          strokeColor: "#e968a9",
          strokeOpacity: 0.32,
          strokeWeight: 2,
          fillColor: "#f7a4ca",
          fillOpacity: 0.12,
        });
        map.setCenter({ lat: coords.latitude, lng: coords.longitude });
        map.setZoom(13);
        setLocationState("ready");
      },
      () => setLocationState("error"),
      { enableHighAccuracy: false, maximumAge: 300_000, timeout: 8_000 },
    );
  }

  const locationMessage = locationState === "ready"
    ? "แสดงตำแหน่งของคุณแล้ว"
    : locationState === "error"
      ? "อนุญาต Location เพื่อดูระยะใกล้คุณ"
      : null;

  return (
    <section className="preview-panel preview-panel--soft venue-map-shell" aria-label="แผนที่สนามแบดมินตัน">
      <div className="venue-map__toolbar">
        <span><MapPinned size={15} /> Google Maps</span>
        <button type="button" className="venue-map__locate" onClick={locateUser} disabled={locationState === "loading" || mapState !== "ready"}>
          <LocateFixed size={14} /> {locationState === "loading" ? "กำลังค้นหา..." : "ใกล้ฉัน"}
        </button>
      </div>
      <div ref={mapElementRef} className="venue-map" aria-label="แผนที่สนามพร้อมหมุดสถานที่" />

      {mapState === "missing-key" ? (
        <div className="venue-map__fallback">
          <Navigation size={22} />
          <strong>แผนที่พร้อมเชื่อม Google Maps</strong>
          <span>เพิ่ม NEXT_PUBLIC_GOOGLE_MAPS_API_KEY เพื่อเปิดแผนที่แบบโต้ตอบ</span>
          {venues.length > 0 ? <div className="venue-map__fallback-links">{venues.slice(0, 4).map((court) => <a key={court.id} href={googleMapsUrl(court)} target="_blank" rel="noreferrer"><span>{court.name}</span><ExternalLink size={13} /></a>)}</div> : null}
        </div>
      ) : null}
      {mapState === "loading" ? <div className="venue-map__loading">กำลังโหลด Google Maps...</div> : null}
      {mapState === "error" ? <div className="venue-map__fallback"><Navigation size={22} /><strong>โหลด Google Maps ไม่สำเร็จ</strong><span>ตรวจ API Key, Maps JavaScript API และโดเมนที่อนุญาต</span></div> : null}
      {venues.length === 0 && mapState === "ready" ? <div className="venue-map__empty"><Navigation size={18} /><span>ยังไม่มีสนามในพื้นที่นี้</span></div> : null}
      {locationMessage ? <p className={`venue-map__message venue-map__message--${locationState}`} role="status">{locationMessage}</p> : null}
      <p className="venue-map__note">หมุดเป็นข้อมูลสนามที่ตรงกับตัวกรองปัจจุบัน · Google Maps Platform</p>
    </section>
  );
}
