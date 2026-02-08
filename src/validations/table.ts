import { z } from "zod"

export const updateTableSchema = z.object({
    isActive: z.boolean(),
    capacity: z.coerce.number().min(1).optional(),
    tableNumber: z.coerce.number().min(1).optional(),
})

export type UpdateTableValues = z.infer<typeof updateTableSchema>
