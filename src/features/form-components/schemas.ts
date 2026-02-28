import * as z from 'zod';

export const textFieldSchema = z.object({
  title: z
    .string()
    .min(5, 'Bug title must be at least 5 characters.')
    .max(32, 'Bug title must be at most 32 characters.'),
});

export const textareaFieldSchema = z.object({
  description: z
    .string()
    .min(20, 'Description must be at least 20 characters.')
    .max(100, 'Description must be at most 100 characters.'),
});

export type TextFieldFormData = z.infer<typeof textFieldSchema>;
export type TextareaFieldFormData = z.infer<typeof textareaFieldSchema>;
