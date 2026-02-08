import { NextResponse } from "next/server";

export async function POST() {
    // In a real app, this would send a notification to the kitchen/admin via WebSocket
    // For now, we just simulate a successful request

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    return NextResponse.json({ success: true, message: "Waiters have been notified!" });
}
