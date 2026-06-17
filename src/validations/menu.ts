import { z } from "zod"

const menuCategorySchema = z.enum(["FOOD", "DRINK", "SNACK", "DESSERT"], {
    error: "Kategori wajib dipilih",
})
const menuHighlightTypeSchema = z.enum(["NONE", "RECOMMENDED"], {
    error: "Highlight customer wajib dipilih",
})

// Menu Option Value schema
export const menuOptionValueSchema = z.object({
    id: z.string().optional(),
    label: z.string().trim().min(1, "Label wajib diisi").transform(val => val.replace(/<[^>]*>?/gm, "")),
    priceAdjust: z.number(),
})

// Menu Option schema
export const menuOptionSchema = z.object({
    id: z.string().optional(),
    name: z.string().trim().min(1, "Nama option wajib diisi").transform(val => val.replace(/<[^>]*>?/gm, "")),
    isRequired: z.boolean(),
    values: z.array(menuOptionValueSchema).min(1, "Minimal 1 nilai option"),
})

// Create Menu schema
export const createMenuSchema = z.object({
    name: z.string().trim().min(1, "Nama menu wajib diisi").transform(val => val.replace(/<[^>]*>?/gm, "")),
    description: z.string().trim().optional().transform(val => val ? val.replace(/<[^>]*>?/gm, "") : val),
    price: z.number().min(1, "Harga wajib diisi"),
    category: menuCategorySchema,
    imageUrl: z.string().url().optional().or(z.literal("")).transform(val => val || undefined),
    isAvailable: z.boolean(),
    isActive: z.boolean(),
    highlightType: menuHighlightTypeSchema,
    menuOptions: z.array(menuOptionSchema).optional(),
})

// Update Menu schema
export const updateMenuSchema = createMenuSchema.partial()

// Types
export type CreateMenuFormInput = z.input<typeof createMenuSchema>
export type MenuOptionValueInput = z.infer<typeof menuOptionValueSchema>
export type MenuOptionInput = z.infer<typeof menuOptionSchema>
export type CreateMenuInput = z.infer<typeof createMenuSchema>
export type UpdateMenuInput = z.infer<typeof updateMenuSchema>
