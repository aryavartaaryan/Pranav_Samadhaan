import { NextResponse } from "next/server";
import { addMockSellerApp, getMockSellerApps } from "@/lib/mockStore";

export async function GET() {
  return NextResponse.json(getMockSellerApps());
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    addMockSellerApp(body);
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error("Error submitting seller application:", error);
    return NextResponse.json({ error: "Failed to submit request" }, { status: 500 });
  }
}
