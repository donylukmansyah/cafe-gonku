import { NextRequest } from "next/server";
import { getServerSession } from "@/server/auth/server-auth";
import { z } from "zod";
import { apiResponse, handleApiError, apiError } from "@/server/http/api-utils";
import { TableService } from "@/features/tables/server/table.service";

const createTableSchema = z.object({
    tableNumber: z.coerce.number().min(1, "Nomor meja harus positif"),
    capacity: z.coerce.number().min(1).default(4),
});

// GET /api/tables - List all tables
export async function GET() {
    try {
        const session = await getServerSession();
        if (!session) return apiError("Unauthorized", 401);

        const user = session.user as { role?: string };
        if (user.role !== "OWNER") return apiError("Forbidden: Owner access required", 403);

        const tables = await TableService.getTables();
        return apiResponse(tables);
    } catch (error) {
        return handleApiError(error, "GET /api/tables");
    }
}

// POST /api/tables - Create table
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession();
        if (!session) return apiError("Unauthorized", 401);

        const user = session.user as { role?: string };
        if (user.role !== "OWNER") return apiError("Forbidden: Owner access required", 403);

        const body = await request.json();
        const validatedData = createTableSchema.parse(body);

        const table = await TableService.createTable(validatedData);
        return apiResponse(table, 201);
    } catch (error) {
        return handleApiError(error, "POST /api/tables");
    }
}
