"use client";

import type { UploadResponse, HandleUploadBody } from "./types";

export const upload = async (
  file: File,
  options: {
    handleUploadUrl: string;
  },
) => {
  // Get presigned URL from server
  const response = await fetch(options.handleUploadUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type,
      size: file.size,
    } satisfies HandleUploadBody),
  });

  if (!response.ok) {
    const { error, details } = await response.json();
    throw new Error(`Error uploading file: ${error}`, details);
  }

  const { resultUrl, uploadUrl } = (await response.json()) as UploadResponse;

  // Upload file to presigned URL
  const uploadResponse = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": file.type,
    },
    body: await file.arrayBuffer(),
  });

  if (!uploadResponse.ok) {
    throw new Error(`Error uploading file: ${uploadResponse.statusText}`);
  }

  return { url: resultUrl };
};
