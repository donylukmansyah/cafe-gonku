import { z } from "zod"

// Menu Option Value schema
export const menuOptionValueSchema = z.object({
    id: z.string().optional(),
    label: z.string().min(1, "Label wajib diisi"),
    priceAdjust: z.number(),
})

// Menu Option schema
export const menuOptionSchema = z.object({
    id: z.string().optional(),
    name: z.string().min(1, "Nama option wajib diisi"),
    isRequired: z.boolean(),
    values: z.array(menuOptionValueSchema).min(1, "Minimal 1 nilai option"),
})

// Create Menu schema
export const createMenuSchema = z.object({
    name: z.string().min(1, "Nama menu wajib diisi"),
    description: z.string().optional(),
    price: z.number().min(0, "Harga tidak boleh negatif"),
    category: z.enum(["FOOD", "DRINK", "SNACK", "DESSERT"]),
    imageUrl: z.string().optional(),
    isAvailable: z.boolean(),
    menuOptions: z.array(menuOptionSchema).optional(),
})

// Update Menu schema
export const updateMenuSchema = createMenuSchema.partial()

// Types
export type MenuOptionValueInput = z.infer<typeof menuOptionValueSchema>
export type MenuOptionInput = z.infer<typeof menuOptionSchema>
export type CreateMenuInput = z.infer<typeof createMenuSchema>
export type UpdateMenuInput = z.infer<typeof updateMenuSchema>
