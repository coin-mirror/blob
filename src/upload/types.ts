import { z, type ZodFormattedError } from "zod";

const handleUploadBodyParams = z.object({
  filename: z.string(),
  contentType: z.string(),
  size: z.number(),
});

export type HandleUploadBody = z.infer<typeof handleUploadBodyParams>;

export type UploadResponse = {
  uploadUrl: string;
  resultUrl: string;
};

export const validateHandleUploadBody = (
  body: unknown,
): HandleUploadBody | { error: ZodFormattedError<HandleUploadBody> } => {
  const result = handleUploadBodyParams.safeParse(body);
  if (!result.success) {
    return { error: result.error.format() };
  }
  return result.data;
};
