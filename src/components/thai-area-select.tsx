"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, MapPin } from "lucide-react";

type AddressModule = typeof import("thai-address-select");

type ThaiAreaSelectProps = {
  mode: "search" | "form" | "home";
  initialProvince?: string;
  initialDistrict?: string;
  initialSubdistrict?: string;
  provinceError?: string;
  districtError?: string;
  subdistrictError?: string;
};

function fieldClass(mode: ThaiAreaSelectProps["mode"], error?: string) {
  if (mode === "search") return "group-filter-control";
  if (mode === "home") return "search-field search-field--area";
  return error ? "group-form-field group-form-field--error" : "group-form-field";
}

export default function ThaiAreaSelect({
  mode,
  initialProvince = "",
  initialDistrict = "",
  initialSubdistrict = "",
  provinceError,
  districtError,
  subdistrictError,
}: ThaiAreaSelectProps) {
  const [addressData, setAddressData] = useState<AddressModule | null>(null);
  const [province, setProvince] = useState(initialProvince);
  const [district, setDistrict] = useState(initialDistrict);
  const [subdistrict, setSubdistrict] = useState(initialSubdistrict);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const addressModule = await import("thai-address-select");
        await addressModule.loadData();
        if (!cancelled) setAddressData(addressModule);
      } catch {
        if (!cancelled) setLoadError(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const provinces = useMemo(() => addressData?.getProvinces() ?? [], [addressData]);
  const districts = useMemo(() => addressData?.getDistricts(province) ?? [], [addressData, province]);
  const subdistricts = useMemo(
    () => addressData?.getSubDistricts(province, district) ?? [],
    [addressData, district, province],
  );
  const isForm = mode === "form";
  const isHome = mode === "home";
  const selectClass = isForm ? "group-form-select-wrap" : isHome ? "home-search-select-wrap" : "group-filter-select-wrap";
  const provincePlaceholder = isForm ? "เลือกจังหวัด" : "ทุกจังหวัด";
  const districtPlaceholder = province ? "ทุกเขต / อำเภอ" : "เลือกจังหวัดก่อน";
  const subdistrictPlaceholder = district ? "ทุกแขวง / ตำบล" : "เลือกเขต / อำเภอก่อน";
  const loadingLabel = loadError ? "โหลดข้อมูลพื้นที่ไม่สำเร็จ" : "กำลังโหลดพื้นที่...";

  return (
    <div className={isForm ? "group-form__grid group-form__grid--three group-form__grid--area" : isHome ? "home-location-grid" : "groups-location-grid"}>
      <label className={fieldClass(mode, provinceError)}>
        {isHome ? <MapPin size={18} aria-hidden="true" /> : null}
        <span className={isHome ? "sr-only" : undefined}>{isForm ? <MapPin size={15} /> : null} จังหวัด {isForm ? <b>*</b> : null}</span>
        <div className={selectClass}>
          <select
            name="province"
            value={province}
            onChange={(event) => {
              setProvince(event.target.value);
              setDistrict("");
              setSubdistrict("");
            }}
            disabled={!addressData}
            required={isForm}
            aria-label="จังหวัด"
          >
            <option value="">{addressData ? provincePlaceholder : loadingLabel}</option>
            {provinces.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
          <ChevronDown size={15} aria-hidden="true" />
        </div>
        {provinceError ? <small>{provinceError}</small> : null}
      </label>

      <label className={fieldClass(mode, districtError)}>
        {isHome ? <MapPin size={18} aria-hidden="true" /> : null}
        <span className={isHome ? "sr-only" : undefined}>อำเภอ / เขต</span>
        <div className={selectClass}>
          <select
            name="district"
            value={district}
            onChange={(event) => {
              setDistrict(event.target.value);
              setSubdistrict("");
            }}
            disabled={!addressData || !province}
            aria-label="อำเภอ หรือ เขต"
          >
            <option value="">{addressData ? districtPlaceholder : loadingLabel}</option>
            {districts.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
          <ChevronDown size={15} aria-hidden="true" />
        </div>
        {districtError ? <small>{districtError}</small> : null}
      </label>

      <label className={fieldClass(mode, subdistrictError)}>
        {isHome ? <MapPin size={18} aria-hidden="true" /> : null}
        <span className={isHome ? "sr-only" : undefined}>ตำบล / แขวง</span>
        <div className={selectClass}>
          <select
            name="subdistrict"
            value={subdistrict}
            onChange={(event) => setSubdistrict(event.target.value)}
            disabled={!addressData || !district}
            aria-label="ตำบล หรือ แขวง"
          >
            <option value="">{addressData ? subdistrictPlaceholder : loadingLabel}</option>
            {subdistricts.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
          <ChevronDown size={15} aria-hidden="true" />
        </div>
        {subdistrictError ? <small>{subdistrictError}</small> : null}
      </label>
    </div>
  );
}
