import { z } from "zod";

export const dailyCashEntrySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  amount: z.number().int().min(1, "Nominal kas wajib lebih dari Rp0"),
  notes: z
    .string()
    .trim()
    .max(500, "Catatan terlalu panjang")
    .optional()
    .transform((value) => (value ? value.replace(/<[^>]*>?/gm, "") : undefined)),
});

export type DailyCashEntryInput = z.infer<typeof dailyCashEntrySchema>;
