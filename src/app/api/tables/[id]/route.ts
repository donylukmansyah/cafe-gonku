import { NextRequest } from "next/server"
import { getServerSession } from "@/server/auth/server-auth"
import { updateTableSchema } from "@/features/tables/schema"
import { apiResponse, handleApiError, apiError } from "@/server/http/api-utils"
import { TableService } from "@/features/tables/server/table.service"

export async function PATCH(
    request: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await props.params
        const body = await request.json()

        const session = await getServerSession();
        if (!session) return apiError("Unauthorized", 401)

        const user = session.user as { role?: string }
        if (user.role !== "OWNER") return apiError("Forbidden", 403)

        const validatedData = updateTableSchema.parse(body)
        const table = await TableService.updateTable(id, validatedData)

        return apiResponse(table)
    } catch (error) {
        return handleApiError(error, "PATCH /api/tables/[id]")
    }
}

export async function DELETE(
    request: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await props.params

        const session = await getServerSession();
        if (!session) return apiError("Unauthorized", 401)

        const user = session.user as { role?: string }
        if (user.role !== "OWNER") return apiError("Forbidden", 403)

        await TableService.deleteTable(id)

        return apiResponse({ message: "Table deleted successfully" })
    } catch (error) {
        return handleApiError(error, "DELETE /api/tables/[id]")
    }
}
