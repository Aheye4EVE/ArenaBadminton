"use client";

import { useEffect, useState } from "react";
import { ChevronDown, MapPin } from "lucide-react";

export default function ThaiProvinceSelect() {
  const [provinces, setProvinces] = useState<string[]>([]);
  const [province, setProvince] = useState("");
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const addressModule = await import("thai-address-select");
        await addressModule.loadData();
        if (!cancelled) setProvinces(addressModule.getProvinces());
      } catch {
        if (!cancelled) setLoadError(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <label className="search-field">
      <MapPin size={18} />
      <span className="sr-only">จังหวัด</span>
      <select name="province" value={province} onChange={(event) => setProvince(event.target.value)} aria-label="เลือกจังหวัด" disabled={loadError || provinces.length === 0}>
        <option value="">{loadError ? "โหลดจังหวัดไม่สำเร็จ" : provinces.length > 0 ? "ทุกจังหวัด" : "กำลังโหลดจังหวัด..."}</option>
        {provinces.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
      <ChevronDown size={15} />
    </label>
  );
}
