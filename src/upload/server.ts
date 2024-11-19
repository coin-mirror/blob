"use server";

import { validateHandleUploadBody } from "./types";
import { type Bucket, getSecureUploadUrl } from "..";
import { customAlphabet } from "nanoid";

const genSecureFilename = customAlphabet(
  "0123456789abcdefghijklmnopqrstuvwxyz",
  32,
);

export const uploadHandler = async (
  req: Request,
  {
    bucket,
    pathPrefix,
    maxSizeInBytes,
    allowedContentTypes,
  }: {
    bucket: Bucket;
    pathPrefix?: string;
    maxSizeInBytes?: number;
    allowedContentTypes?: string[];
  },
) => {
  const body = validateHandleUploadBody(await req.json());
  if ("error" in body) {
    console.warn("Invalid request body on requesting upload URL", body.error);
    return new Response(
      JSON.stringify({
        error: "Invalid request body",
        details: body.error,
      }),
      {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "private, no-store",
        },
      },
    );
  }

  try {
    if (maxSizeInBytes && body.size > maxSizeInBytes) {
      return new Response(
        JSON.stringify({
          error: "File too large",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "private, no-store",
          },
        },
      );
    }

    if (
      allowedContentTypes &&
      !allowedContentTypes.includes(body.contentType.toLowerCase())
    ) {
      return new Response(
        JSON.stringify({
          error: `File type "${body.contentType}" not allowed`,
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "private, no-store",
          },
        },
      );
    }

    const path = `${pathPrefix ?? ""}${genSecureFilename()}`;
    const url = await getSecureUploadUrl(bucket, path, {
      expiresIn: 3600,
    });

    const resultUrl = new URL(path, bucket.publicUrl).toString();
    return new Response(
      JSON.stringify({
        uploadUrl: url,
        resultUrl,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "private, no-store",
        },
      },
    );
  } catch (error) {
    console.error("Error requesting upload URL", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "private, no-store",
        },
      },
    );
  }
};
