export function normalizeSearchText(value: unknown) {
  return String(value ?? "")
    .normalize("NFKC")
    .toLocaleLowerCase("th-TH")
    .replace(/\s+/g, " ")
    .trim();
}

export function searchTerms(value: string) {
  return normalizeSearchText(value).split(" ").filter(Boolean).slice(0, 8);
}

export function matchesSearchTerms(fields: unknown[], terms: string[]) {
  if (terms.length === 0) return true;
  const haystack = normalizeSearchText(fields.filter(Boolean).join(" "));
  return terms.every((term) => haystack.includes(normalizeSearchText(term)));
}

function normalizeAreaValue(value: unknown) {
  const compact = normalizeSearchText(value)
    .replace(/จังหวัด|อำเภอ|เขต|ตำบล|แขวง/g, "")
    .replace(/\s+/g, "");

  if (["กรุงเทพ", "กรุงเทพฯ", "กรุงเทพมหานคร"].includes(compact)) return "กรุงเทพมหานคร";
  return compact;
}

export function matchesAreaValue(selected: string, values: unknown[]) {
  const target = normalizeAreaValue(selected);
  if (!target) return true;

  return values.some((value) => {
    const current = normalizeAreaValue(value);
    if (!current) return false;
    return current === target || current.includes(target) || target.includes(current);
  });
}

export function matchesLocationFilters(
  filters: { province: string; district: string; subdistrict: string },
  location: {
    province?: unknown;
    district?: unknown;
    subdistrict?: unknown;
    searchable?: unknown[];
  },
) {
  const searchable = location.searchable ?? [];
  return (
    matchesAreaValue(filters.province, [location.province, ...searchable])
    && matchesAreaValue(filters.district, [location.district, ...searchable])
    && matchesAreaValue(filters.subdistrict, [location.subdistrict, ...searchable])
  );
}
