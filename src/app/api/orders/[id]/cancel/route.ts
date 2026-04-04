import { NextResponse, type NextRequest } from "next/server";
import { OrderService } from "@/lib/services/order.service";

// POST /api/orders/[id]/cancel - Cancel a pending order
export async function POST(
    request: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await props.params;

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
