const DEFAULT_BASE_URL = "https://arena-badminton.vercel.app";

const requestedBaseUrl = process.env.SMOKE_BASE_URL ?? DEFAULT_BASE_URL;
let baseUrl;

try {
  baseUrl = new URL(requestedBaseUrl);
} catch {
  console.error(`FAIL invalid SMOKE_BASE_URL: ${requestedBaseUrl}`);
  process.exitCode = 1;
  process.exit();
}

const isLocalHost = ["localhost", "127.0.0.1", "::1"].includes(baseUrl.hostname);
if (!isLocalHost && baseUrl.protocol !== "https:") {
  console.error("FAIL smoke target must use HTTPS unless it is localhost");
  process.exitCode = 1;
  process.exit();
}

const checks = [
  { path: "/", label: "Home", statuses: [200], markers: ["Arena-Badminton"] },
  { path: "/events", label: "Events", statuses: [200], markers: ["กิจกรรม"] },
  { path: "/venues", label: "Venues", statuses: [200], markers: ["สนาม"] },
  { path: "/ranking", label: "Ranking", statuses: [200], markers: ["Ranking"] },
  { path: "/guilds", label: "Guild directory", statuses: [200], markers: ["Guild"] },
  { path: "/community", label: "Community", statuses: [200], markers: ["Community"] },
  {
    path: "/marketplace",
    label: "Protected marketplace",
    statuses: [200, 301, 302, 303, 307, 308],
    locationPattern: /\/(auth\/login|profile\/setup)(?:[/?]|$)/,
    streamedRedirectMarker: "__next-page-redirect",
  },
  {
    path: "/profile",
    label: "Protected profile",
    statuses: [200, 301, 302, 303, 307, 308],
    locationPattern: /\/(auth\/login|profile\/setup)(?:[/?]|$)/,
    streamedRedirectMarker: "__next-page-redirect",
  },
  {
    path: "/events/create",
    label: "Protected tournament create",
    statuses: [200, 301, 302, 303, 307, 308],
    locationPattern: /\/(auth\/login|profile\/setup)(?:[/?]|$)/,
    streamedRedirectMarker: "__next-page-redirect",
  },
  {
    path: "/messages",
    label: "Protected messages",
    statuses: [200, 301, 302, 303, 307, 308],
    locationPattern: /\/(auth\/login|profile\/setup)(?:[/?]|$)/,
    streamedRedirectMarker: "__next-page-redirect",
  },
  {
    path: "/marketplace/create",
    label: "Protected marketplace create",
    statuses: [200, 301, 302, 303, 307, 308],
    locationPattern: /\/(auth\/login|profile\/setup)(?:[/?]|$)/,
    streamedRedirectMarker: "__next-page-redirect",
  },
  { path: "/api/health", label: "Health configuration", statuses: [200], health: true },
];

async function runCheck(check) {
  const url = new URL(check.path, baseUrl);

  try {
    const response = await fetch(url, {
      redirect: "manual",
      headers: { "user-agent": "arena-badminton-production-smoke/1.0" },
    });
    const body = await response.text();
    const details = [];

    if (!check.statuses.includes(response.status)) {
      return { ok: false, status: response.status, label: check.label, path: check.path, detail: `expected ${check.statuses.join("/")}` };
    }

    if (check.markers) {
      const missingMarkers = check.markers.filter((marker) => !body.includes(marker));
      if (missingMarkers.length > 0) {
        return { ok: false, status: response.status, label: check.label, path: check.path, detail: `missing marker: ${missingMarkers.join(", ")}` };
      }
      details.push("marker ok");
    }

    if (check.locationPattern) {
      const location = response.headers.get("location") ?? "";
      const streamedRedirect = response.status === 200 && check.streamedRedirectMarker && body.includes(check.streamedRedirectMarker);
      if (streamedRedirect) {
        if (!body.includes("/auth/login?message=auth_required")) {
          return { ok: false, status: response.status, label: check.label, path: check.path, detail: "streamed redirect target is not the login route" };
        }
      } else if (!check.locationPattern.test(location)) {
        return { ok: false, status: response.status, label: check.label, path: check.path, detail: "redirect target is not an auth/profile setup route" };
      }
      details.push("protected redirect ok");
    }

    if (check.health) {
      let health;
      try {
        health = JSON.parse(body);
      } catch {
        return { ok: false, status: response.status, label: check.label, path: check.path, detail: "response is not JSON" };
      }

      if (typeof health?.status !== "string" || !health?.integrations || typeof health.integrations !== "object") {
        return { ok: false, status: response.status, label: check.label, path: check.path, detail: "health shape is incomplete" };
      }
      details.push(`status ${health.status}`);
    }

    return { ok: true, status: response.status, label: check.label, path: check.path, detail: details.join(" · ") };
  } catch (error) {
    return {
      ok: false,
      status: "ERR",
      label: check.label,
      path: check.path,
      detail: error instanceof Error ? error.message : "request failed",
    };
  }
}

console.log(`Arena-Badminton production smoke · ${baseUrl.origin}`);
const results = await Promise.all(checks.map(runCheck));

for (const result of results) {
  console.log(`${result.ok ? "PASS" : "FAIL"} ${result.path} [${result.status}] ${result.label}${result.detail ? ` · ${result.detail}` : ""}`);
}

const failures = results.filter((result) => !result.ok);
console.log(failures.length === 0 ? `PASS ${results.length}/${results.length} checks` : `FAIL ${failures.length}/${results.length} checks`);
process.exitCode = failures.length === 0 ? 0 : 1;
