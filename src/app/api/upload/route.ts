import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/server-auth"
import { uploadMenuImage } from "@/lib/image-storage"

export async function POST(request: NextRequest) {
    try {
        console.log("Starting upload process...")

        // Check auth
        const session = await getServerSession();

        if (!session) {
            console.error("Upload failed: Unauthorized")
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const user = session.user as { role?: string }
        if (user.role !== "ADMIN") {
            console.error("Upload failed: Forbidden", user)
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        // Get file from form data
        const formData = await request.formData()
        const file = formData.get("file") as File | null

        if (!file) {
            console.error("Upload failed: No file provided")
            return NextResponse.json({ error: "No file provided" }, { status: 400 })
        }

        console.log(`File received: ${file.name}, size: ${file.size}, type: ${file.type}`)

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

        // Generate unique filename
        const fileExt = file.name.split(".").pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`

        // Convert File to ArrayBuffer for upload
        const arrayBuffer = await file.arrayBuffer()
        const buffer = new Uint8Array(arrayBuffer)

        const upload = await uploadMenuImage({
            fileName,
            mimeType: file.type,
            bytes: buffer,
        })

        return NextResponse.json({
            url: upload.url,
            path: upload.path,
            provider: upload.provider,
        })
    } catch (error: unknown) {
        console.error("Upload error (catch):", error)
        return NextResponse.json(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            { error: `Internal Server Error: ${(error as any).message || String(error)}` },
            { status: 500 }
        )
    }
}
