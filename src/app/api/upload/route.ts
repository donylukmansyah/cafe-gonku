import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/server/auth/server-auth"
import { uploadMenuImage } from "@/server/storage/image-storage"
import { optimizeImage } from "@/server/storage/image-optimizer"
import { logger } from "@/shared/logger"
import { checkRateLimit, getClientIp } from "@/server/rate-limit/rate-limit"

export async function POST(request: NextRequest) {
    try {
        logger.debug("Starting upload process...")

        const rateLimit = await checkRateLimit("imageUpload", getClientIp(request));
        if (!rateLimit.success) {
            return NextResponse.json({ error: "Terlalu banyak upload. Coba lagi sebentar." }, { status: 429 })
        }

        // Check auth
        const session = await getServerSession();

        if (!session) {
            logger.warn("Upload failed: Unauthorized")
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const user = session.user as { role?: string }
        if (user.role !== "OWNER") {
            logger.warn("Upload failed: Forbidden")
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        // Get file from form data
        const formData = await request.formData()
        const file = formData.get("file") as File | null

        if (!file) {
            logger.warn("Upload failed: No file provided")
            return NextResponse.json({ error: "No file provided" }, { status: 400 })
        }

        logger.debug(`File received: ${file.name}, size: ${file.size}, type: ${file.type}`)

        // Validate file type
        const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"]
        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json(
                { error: "Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed." },
                { status: 400 }
            )
        }

        // Validate file size (max 5MB)
        const maxSize = 5 * 1024 * 1024
        if (file.size > maxSize) {
            return NextResponse.json(
                { error: "File too large. Maximum size is 5MB." },
                { status: 400 }
            )
        }

        // Convert File to ArrayBuffer for upload
        const arrayBuffer = await file.arrayBuffer()
        const rawBuffer = new Uint8Array(arrayBuffer)

        const optimized = await optimizeImage(rawBuffer, file.type)

        // Generate unique filename
        const ext = optimized.mimeType === "image/webp" ? "webp" : file.name.split(".").pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`

        const upload = await uploadMenuImage({
            fileName,
            mimeType: optimized.mimeType,
            bytes: optimized.data,
        })

        return NextResponse.json({
            url: upload.url,
            path: upload.path,
        })
    } catch (error: unknown) {
        logger.error("Upload error:", error)
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        )
    }
}
