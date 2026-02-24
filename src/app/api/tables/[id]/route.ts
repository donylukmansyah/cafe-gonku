import { NextRequest } from "next/server"
import { getServerSession } from "@/lib/server-auth"
import { prisma } from "@/lib/prisma"
import { updateTableSchema } from "@/validations/table"
import { apiResponse, handleApiError, apiError } from "@/lib/api-utils"

export async function PATCH(
    request: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await props.params
        const body = await request.json()

        // Check auth
        const session = await getServerSession();

        if (!session) {
            return apiError("Unauthorized", 401)
        }

        const user = session.user as { role?: string }
        if (user.role !== "ADMIN") {
            return apiError("Forbidden", 403)
        }

        // Validate body
        const validatedData = updateTableSchema.parse(body)

        // Update table
        const table = await prisma.table.update({
            where: { id },
            data: validatedData,
        })

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

        // Check auth
        const session = await getServerSession();

        if (!session) {
            return apiError("Unauthorized", 401)
        }

        const user = session.user as { role?: string }
        if (user.role !== "ADMIN") {
            return apiError("Forbidden", 403)
        }

        // Check if table exists
        const table = await prisma.table.findUnique({
            where: { id },
            select: { id: true }
        })

        if (!table) {
            return apiError("Table not found", 404)
        }

        // Force delete related orders first to avoid foreign key constraint errors
        await prisma.order.deleteMany({
            where: { tableId: id }
        })

        // Delete table
        await prisma.table.delete({
            where: { id },
        })

        return apiResponse({ message: "Table deleted successfully" })
    } catch (error) {
        return handleApiError(error, "DELETE /api/tables/[id]")
    }
}
