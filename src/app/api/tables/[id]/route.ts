import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { updateTableSchema } from "@/validations/table"

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const body = await request.json()

        // Check auth
        const session = await auth.api.getSession({
            headers: await headers(),
        })

        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const user = session.user as { role?: string }
        if (user.role !== "ADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        // Validate body
        const validatedData = updateTableSchema.parse(body)

        // Update table
        const table = await prisma.table.update({
            where: { id },
            data: validatedData,
        })

        return NextResponse.json(table)
    } catch (error) {
        console.error("Error updating table:", error)
        return NextResponse.json(
            { error: "Failed to update table" },
            { status: 500 }
        )
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params

        // Check auth
        const session = await auth.api.getSession({
            headers: await headers(),
        })

        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const user = session.user as { role?: string }
        if (user.role !== "ADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        // Check if table exists
        const table = await prisma.table.findUnique({
            where: { id },
        })

        if (!table) {
            return NextResponse.json({ error: "Table not found" }, { status: 404 })
        }

        // Delete table
        await prisma.table.delete({
            where: { id },
        })

        return NextResponse.json({ message: "Table deleted successfully" })
    } catch (error) {
        console.error("Error deleting table:", error)
        return NextResponse.json(
            { error: "Failed to delete table" },
            { status: 500 }
        )
    }
}
