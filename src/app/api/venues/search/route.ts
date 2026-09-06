import { getAuthenticatedProfile } from '@/lib/supabase-server';
import { directoryFilters,searchVenues } from '@/lib/venue-directory';
export async function GET(request:Request) {
  const {supabase,user}=await getAuthenticatedProfile();
  if(!supabase || !user) return Response.json({error:'กรุณาเข้าสู่ระบบเพื่อเลือกสนาม'},{status:401});
  try {return Response.json(await searchVenues(supabase,directoryFilters(new URL(request.url).searchParams),12),{headers:{'Cache-Control':'private, no-store'}});}
  catch {return Response.json({error:'โหลดรายชื่อสนามไม่สำเร็จ กรุณาลองใหม่'},{status:503});}
}
