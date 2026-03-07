
import { getServerSession } from "@/lib/server-auth";
import { createOrderSchema } from "@/validations/order";
import { apiResponse, handleApiError, apiError } from "@/lib/api-utils";
import { OrderService } from "@/lib/services/order.service";

// GET /api/orders - Get orders for Kitchen Display (Priority Queue)
export async function GET(request: Request) {
    try {
        const session = await getServerSession();

        if (!session) {
            return apiError("Unauthorized", 401);
        }

        const userRole = (session.user as { role?: string }).role;
        if (userRole !== "KITCHEN" && userRole !== "ADMIN") {
            return apiError("Forbidden", 403);
        }

        const { searchParams } = new URL(request.url);
        const includeServed = searchParams.get("includeServed") === "true";

        const orders = await OrderService.getOrders(includeServed);

        return apiResponse({ orders });
    } catch (error) {
        return handleApiError(error, "GET /api/orders");
    }
}

// POST /api/orders - Create new order (Customer)
// Security Refactor: Move price calculation to server
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const validatedData = createOrderSchema.parse(body);

        const result = await OrderService.createOrder(validatedData);

        return apiResponse(result, 201);

    } catch (error: any) {
        if (error.message === "Sudah ada pesanan yang sedang diproses untuk meja ini. Tunggu sebentar.") {
            return apiError(error.message, 429);
        }
        return handleApiError(error, "POST /api/orders");
    }
}
