import { NextResponse } from "next/server";
import { getIntegrationConfiguration } from "@/lib/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({
    status: "local-preview",
    integrations: getIntegrationConfiguration(),
    note: "Configuration visibility only; external services are not contacted by this check.",
  });
}
