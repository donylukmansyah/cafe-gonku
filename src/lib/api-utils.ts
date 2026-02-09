import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";

export function apiResponse<T>(data: T, status = 200) {
    return NextResponse.json({ success: true, data }, { status });
}

export function apiError(message: string, status = 400, details?: any) {
    return NextResponse.json(
        { success: false, error: message, ...(details && { details }) },
        { status }
    );
}

export function handleApiError(error: unknown, context?: string) {
    const errorPrefix = context ? `[${context}] ` : "";
    console.error(`${errorPrefix}API Error:`, error);

    if (error instanceof ZodError) {
        return apiError("Validation failed", 400, error.issues);
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2025") {
            return apiError("Resource not found", 404);
        }
        if (error.code === "P2002") {
            return apiError("A unique constraint failed", 400);
        }
        if (error.code === "P2003") {
            return apiError("Foreign key constraint failed", 400);
        }
    }

    const message = error instanceof Error ? error.message : "Internal Server Error";
    return apiError(message, 500);
}
