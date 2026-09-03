"use client";

import { LocateFixed, MapPinned, Navigation } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Court } from "@/lib/demo-data";

type LeafletMap = import("leaflet").Map;
type LeafletLayerGroup = import("leaflet").LayerGroup;
type LeafletCircleMarker = import("leaflet").CircleMarker;

const fallbackCenter: [number, number] = [13.7563, 100.5018];

function hasCoordinates(court: Court): court is Court & { latitude: number; longitude: number } {
  return Number.isFinite(court.latitude) && Number.isFinite(court.longitude);
}

function makePopup(court: Court) {
  const wrapper = document.createElement("div");
  wrapper.className = "venue-map-popup";

  const title = document.createElement("strong");
  title.textContent = court.name;
  wrapper.append(title);

  const address = document.createElement("span");
  address.textContent = `${court.subdistrict} · ${court.district} · ${court.province}`;
  wrapper.append(address);

  const meta = document.createElement("small");
  meta.textContent = `${court.rating} ดาว · ${court.courtCount} คอร์ท · ${court.distance}`;
  wrapper.append(meta);

  const actions = document.createElement("div");
  actions.className = "venue-map-popup__actions";

  const detailLink = document.createElement("a");
  detailLink.href = `/venues#${encodeURIComponent(court.id)}`;
  detailLink.textContent = "ดูรายละเอียด";
  actions.append(detailLink);

  const mapLink = document.createElement("a");
  mapLink.href = `https://www.openstreetmap.org/?mlat=${court.latitude}&mlon=${court.longitude}#map=16/${court.latitude}/${court.longitude}`;
  mapLink.target = "_blank";
  mapLink.rel = "noreferrer";
  mapLink.textContent = "เปิดแผนที่";
  actions.append(mapLink);

  wrapper.append(actions);
  return wrapper;
}

export default function VenueMap({ venues }: { venues: Court[] }) {
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markersRef = useRef<LeafletLayerGroup | null>(null);
  const userMarkerRef = useRef<LeafletCircleMarker | null>(null);
  const [locationState, setLocationState] = useState<"idle" | "loading" | "ready" | "error">("idle");

  useEffect(() => {
    let disposed = false;

    async function setupMap() {
      const leaflet = await import("leaflet");
      if (disposed || !mapElementRef.current) return;

      const mappedVenues = venues.filter(hasCoordinates);
      const map = leaflet.map(mapElementRef.current, {
        zoomControl: false,
        scrollWheelZoom: false,
      });
      leaflet.control.zoom({ position: "bottomright" }).addTo(map);
      leaflet
        .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
          maxZoom: 19,
        })
        .addTo(map);

      const markers = leaflet.layerGroup().addTo(map);
      const markerIcon = leaflet.divIcon({
        className: "venue-map-marker-wrap",
        html: '<span class="venue-map-marker"><b>🏸</b></span>',
        iconSize: [38, 38],
        iconAnchor: [19, 35],
        popupAnchor: [0, -35],
      });

      for (const court of mappedVenues) {
        leaflet
          .marker([court.latitude, court.longitude], { icon: markerIcon, title: court.name })
          .bindPopup(makePopup(court), { maxWidth: 250 })
          .addTo(markers);
      }

      if (mappedVenues.length === 1) {
        map.setView([mappedVenues[0].latitude, mappedVenues[0].longitude], 14);
      } else if (mappedVenues.length > 1) {
        map.fitBounds(
          leaflet.latLngBounds(mappedVenues.map((court) => [court.latitude, court.longitude] as [number, number])),
          { padding: [30, 30], maxZoom: 13 },
        );
      } else {
        map.setView(fallbackCenter, 11);
      }

      mapRef.current = map;
      markersRef.current = markers;
      window.setTimeout(() => map.invalidateSize(), 0);
    }

    void setupMap();

    return () => {
      disposed = true;
      userMarkerRef.current?.remove();
      userMarkerRef.current = null;
      markersRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [venues]);

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

        userMarkerRef.current?.remove();

        void import("leaflet").then((leaflet) => {
          if (!mapRef.current) return;
          userMarkerRef.current = leaflet
            .circleMarker([coords.latitude, coords.longitude], {
              radius: 8,
              color: "#ffffff",
              weight: 3,
              fillColor: "#e968a9",
              fillOpacity: 1,
            })
            .addTo(mapRef.current)
            .bindTooltip("ตำแหน่งของฉัน", { direction: "top", offset: [0, -8] });
          mapRef.current.setView([coords.latitude, coords.longitude], 13);
          setLocationState("ready");
        });
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
        <span><MapPinned size={15} /> Leaflet · OpenStreetMap</span>
        <button type="button" className="venue-map__locate" onClick={locateUser} disabled={locationState === "loading"}>
          <LocateFixed size={14} /> {locationState === "loading" ? "กำลังค้นหา..." : "ใกล้ฉัน"}
        </button>
      </div>
      <div ref={mapElementRef} className="venue-map" aria-label="แผนที่สนามพร้อมหมุดสถานที่" />
      {venues.length === 0 ? <div className="venue-map__empty"><Navigation size={18} /><span>ยังไม่มีสนามในพื้นที่นี้</span></div> : null}
      {locationMessage ? <p className={`venue-map__message venue-map__message--${locationState}`} role="status">{locationMessage}</p> : null}
      <p className="venue-map__note">หมุดเป็นข้อมูลสนามที่ตรงกับตัวกรองปัจจุบัน · © OpenStreetMap contributors</p>
    </section>
  );
}
