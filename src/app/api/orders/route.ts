
import { getServerSession } from "@/lib/server-auth";
import { createOrderSchema } from "@/validations/order";
import { apiResponse, handleApiError, apiError } from "@/lib/api-utils";
import { OrderService } from "@/lib/services/order.service";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { createApiTimer } from "@/lib/api-timing";
import { setOrderTokenCookie } from "@/lib/order-access";

// GET /api/orders - Get orders for Kitchen Display (Priority Queue)
export async function GET(request: Request) {
    const timer = createApiTimer("GET /api/orders");

    try {
        const session = await timer.step("auth", () => getServerSession());

        if (!session) {
            timer.finish(401);
            return apiError("Unauthorized", 401);
        }

        const userRole = (session.user as { role?: string }).role;
        if (userRole !== "KITCHEN" && userRole !== "ADMIN") {
            timer.finish(403);
            return apiError("Forbidden", 403);
        }

        const { searchParams } = new URL(request.url);
        const includeServed = searchParams.get("includeServed") === "true";

        const orders = await timer.step("orders", () => OrderService.getOrders(includeServed));

        timer.finish(200, { includeServed, count: orders.length });
        return apiResponse({ orders });
    } catch (error) {
        timer.finish(500);
        return handleApiError(error, "GET /api/orders");
    }
}

// POST /api/orders - Create new order (Customer)
// Security Refactor: Move price calculation to server
export async function POST(request: Request) {
    const timer = createApiTimer("POST /api/orders");

    try {
        const rateLimit = await timer.step("rateLimit", () => checkRateLimit("orderCreate", getClientIp(request)));
        if (!rateLimit.success) {
            timer.finish(429);
            return apiError("Terlalu banyak request. Coba lagi sebentar.", 429);
        }

        const body = await timer.step("parseBody", () => request.json());
        const validatedData = createOrderSchema.parse(body);

        const result = await timer.step("createOrder", () => OrderService.createOrder(validatedData));

        if (result.accessToken && result.orderCode) {
            await setOrderTokenCookie(result.orderCode, result.accessToken);
        }

        timer.finish(201, { itemCount: validatedData.items.length });
        return apiResponse(result, 201);

    } catch (error) {
        if (error instanceof Error && error.message === "Sudah ada pesanan yang sedang diproses untuk meja ini. Tunggu sebentar.") {
            timer.finish(429);
            return apiError(error.message, 429);
        }
        timer.finish(500);
        return handleApiError(error, "POST /api/orders");
    }
}
