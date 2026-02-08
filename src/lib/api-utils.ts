import { NextResponse } from "next/server"
import { ZodError } from "zod"
import { Prisma } from "@prisma/client"

export function handleApiError(error: unknown) {
    console.error("API Error:", error)

    if (error instanceof ZodError) {
        return NextResponse.json(
            { error: "Validation failed", details: error.issues },
            { status: 400 }
        )
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2025") {
            return NextResponse.json({ error: "Resource not found" }, { status: 404 })
        }
        if (error.code === "P2003") {
            return NextResponse.json(
                { error: "Foreign key constraint failed" },
                { status: 400 }
            )
        }
    }

    return NextResponse.json(
        { error: "Internal Server Error" },
        { status: 500 }
    )
}
