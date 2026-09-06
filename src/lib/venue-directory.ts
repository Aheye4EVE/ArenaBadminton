import type { SupabaseClient } from '@supabase/supabase-js';
import type { GeoCoordinates } from '@/lib/geolocation';
export type DirectoryVenue = {
  id: string; name: string; province: string | null; district: string | null; subdistrict: string | null;
  address: string | null; aliases: string[]; cover_image_url: string | null; court_count: number | null;
  rating: number; source_url: string | null; verified_at: string | null;
  latitude: number | string | null; longitude: number | string | null; distance_km: number | string | null;
  area_score: number; completed_90: number; open_groups: number;
};
export type DirectoryFilters = { q: string; province: string; district: string; subdistrict: string; sort: string; activity: string; page: number };
export function directoryFilters(params: URLSearchParams): DirectoryFilters {
  const text = (name: string) => (params.get(name) ?? '').trim().slice(0,160);
  const sort=text('sort'), activity=text('activity');
  return { q:text('q'),province:text('province'),district:text('district'),subdistrict:text('subdistrict'),
    sort:['nearby','area','popular','open','name'].includes(sort)?sort:'nearby', activity:['open','history'].includes(activity)?activity:'all',
    page:Math.min(100000,Math.max(1,Math.trunc(Number(params.get('page')))||1)) };
}
export async function searchVenues(client: SupabaseClient, filters: DirectoryFilters, size=24, coordinates?: GeoCoordinates | null): Promise<{items:DirectoryVenue[];total:number}> {
  const {data,error}=await client.rpc('search_arena_venues',{p_q:filters.q,p_province:filters.province,p_district:filters.district,p_subdistrict:filters.subdistrict,p_sort:filters.sort,p_activity:filters.activity,p_page:filters.page,p_size:size,p_latitude:coordinates?.latitude ?? null,p_longitude:coordinates?.longitude ?? null});
  if(error) throw new Error('โหลดข้อมูลสนามไม่สำเร็จ กรุณาลองอีกครั้ง');
  return data as {items:DirectoryVenue[];total:number};
}
export function areaLabel(score:number) { return ['', 'จังหวัดเดียวกับคุณ','อำเภอ / เขตเดียวกับคุณ','ตำบล / แขวงเดียวกับคุณ'][score] ?? ''; }
