import { z } from "zod"

const sanitizedString = z.string().trim().transform((val) => {
    return val.replace(/<[^>]*>?/gm, "").trim();
});

export const loginSchema = z.object({
    email: z.string().email("Email tidak valid").trim().toLowerCase(),
    password: z.string().min(6, "Password minimal 6 karakter"),
})

export type LoginInput = z.infer<typeof loginSchema>
