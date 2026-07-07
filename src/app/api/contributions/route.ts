import { NextResponse } from "next/server";

export async function GET() {
  const scriptUrl = process.env.GOOGLE_APPS_SCRIPT_URL;

  if (!scriptUrl) {
    return NextResponse.json(
      { reason: "missing-script-url" },
      { status: 503 },
    );
  }

  const response = await fetch(scriptUrl, {
    cache: "no-store",
  });
  const text = await response.text();

  if (!response.ok) {
    return NextResponse.json(
      { reason: "script-request-failed", detail: text.slice(0, 500) },
      { status: 502 },
    );
  }

  if (text.includes("doGet")) {
    return NextResponse.json(
      { reason: "doGet-not-deployed" },
      { status: 502 },
    );
  }

  let data: unknown;

  try {
    data = JSON.parse(text);
  } catch {
    return NextResponse.json(
      { reason: "script-returned-non-json", detail: text.slice(0, 500) },
      { status: 502 },
    );
  }

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const payload = await request.json();

  return syncWithScript(payload);
}

export async function PATCH(request: Request) {
  const payload = await request.json();

  return syncWithScript({
    action: "update",
    contribution: payload,
  });
}

export async function DELETE(request: Request) {
  const payload = await request.json();

  return syncWithScript({
    action: "delete",
    contribution: payload,
  });
}

async function syncWithScript(payload: unknown) {
  const scriptUrl = process.env.GOOGLE_APPS_SCRIPT_URL;

  if (!scriptUrl) {
    return NextResponse.json(
      { saved: false, reason: "missing-script-url" },
      { status: 503 },
    );
  }

  const response = await fetch(scriptUrl, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    return NextResponse.json(
      { saved: false, reason: "script-request-failed" },
      { status: 502 },
    );
  }

  const result = await response.json().catch(() => null);

  if (result && result.saved === false) {
    return NextResponse.json(
      { saved: false, reason: result.reason || "script-save-failed" },
      { status: 502 },
    );
  }

  return NextResponse.json({ saved: true });
}
