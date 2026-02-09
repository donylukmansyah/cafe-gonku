import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";

export function apiResponse<T>(data: T, status = 200, cache?: string) {
    return NextResponse.json(
        {
            success: true,
            data,
            _timestamp: new Date().toISOString(),
        },
        {
            status,
            headers: cache ? { 'Cache-Control': cache } : undefined
        }
    );
}

export function apiError(message: string, status = 400, details?: any) {
    return NextResponse.json(
        {
            success: false,
            error: message,
            ...(details && { details }),
            _timestamp: new Date().toISOString(),
        },
        { status }
    );
}

export function handleApiError(error: unknown, context?: string) {
    const errorPrefix = context ? `[${context}] ` : "";

    // Structured Logging for Production
    const logData = {
        context,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? {
            message: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        } : error,
    };

    console.error(JSON.stringify(logData));

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
