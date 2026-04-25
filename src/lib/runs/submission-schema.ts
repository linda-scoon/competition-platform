import { z } from "zod";

function hasMaxThreeDecimalPlaces(value: number) {
  return Number.isInteger(value * 1000);
}

export const runSubmissionInputSchema = z.object({
  videoUrl: z.string().trim().min(1),
  primaryScore: z
    .number({
      invalid_type_error: "Primary score must be a number.",
    })
    .finite("Primary score must be a finite number.")
    .min(0, "Primary score must be greater than or equal to 0.")
    .max(1_000_000_000, "Primary score must be less than or equal to 1000000000.")
    .refine(hasMaxThreeDecimalPlaces, "Primary score can include up to 3 decimal places."),
  notes: z.string().trim().max(500).optional(),
});

export type RunSubmissionInput = z.infer<typeof runSubmissionInputSchema>;
