import { NextResponse, type NextRequest } from "next/server";
import { OrderService } from "@/lib/services/order.service";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

// POST /api/orders/[id]/cancel - Cancel a pending order
export async function POST(
    request: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await props.params;
        const rateLimit = await checkRateLimit(
            "orderCancel",
            `${getClientIp(request)}:${id}`,
        );
        if (!rateLimit.success) {
            return NextResponse.json(
                { error: "Terlalu banyak request pembatalan. Coba lagi sebentar." },
                { status: 429 },
            );
        }

        const updatedOrder = await OrderService.cancelOrder(id);

        return NextResponse.json({
            message: "Pesanan berhasil dibatalkan",
            order: updatedOrder
        });

    } catch (error) {
        console.error("[POST /api/orders/[id]/cancel] Error:", error);
        if (
            typeof error === "object" &&
            error !== null &&
            "status" in error &&
            error.status === 400 &&
            "message" in error &&
            typeof error.message === "string"
        ) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
