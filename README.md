# 🍙 @coin-mirror/blob

A simple and efficient solution for uploading files to S3/R2 from Next.js and similar applications. This package serves as a lightwight alternative to [`@vercel/blob`](https://github.com/vercel/storage/tree/main/packages/blob).

## Why and how?

Uploading files to S3/R2 Buckets from a Next.js App (or any other app) can be hard and comes with a lot of boiler plate code. Especially on serverless environments. _With this package we tried to make to uploading process really simple._

There are two ways of uploading files:

- **Server-side Upload**: Uploading from the server is easy and straight forward: Just use call the `put` function with your files `Buffer`, string or `ReadableStream` - and you're done!
- **Client upload**: Serverless environments like Vercel limit how much you can upload from client directly to your server (Limited to 4.5 MBs). For this case, you just need to provide an endpoint which calls `uploadHandler` function and put in the `upload` function on the client into your form. (Examples below...)

Uploading from files with up to 5 TB (on Cloudflare R2) will be easily possible on these ways. Let's have a look on the API.

## Example: Next.js Client Upload

In this example we will upload to an R2 Bucket where we store the avatar of the user. This example can also be applied for non-Next.js projects. Also, uploading to other S3-compatible object storages are pretty fine.

Let's start by installing the

```bash
npm install @coin-mirror/blob
# OR
yarn add @coin-mirror/blob
# OR
pnpm add @coin-mirror/blob
# OR
bun add @coin-mirror/blob
```

Then we need to define the bucket, for actually connecting to our R2 bucket:

```ts
// bucket.ts (on Server!)

import { type Bucket } from "@coin-mirror/blob";

export const myBucket: Bucket = {
  // The credentials for R2 can be access via the Cloudflare Dashboard.
  // Have a look here for other connection options: https://www.npmjs.com/package/@aws-sdk/client-s3
  connection: {
    region: "auto",
    endpoint: process.env.R2_ENDPOINT!,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY!,
      secretAccessKey: process.env.R2_SECRET_KEY!,
    },
  },
  name: "public-avatars", // The name of the bucket
  publicUrl: "public-avatars.cdn.example.com", // Required to access the file later in the process
};
```

Now we can implement the route. This is required so that the client can request an upload url. We put the endpoint under `/app/api/upload/avatar/route.ts`.

```ts
// route.ts (App Router Next.js Implementation)

import { uploadHandler } from "@coin-mirror/blob/upload/server";
import { NextRequest, NextResponse } from "next/server";

// Needs to be a POST Request, since we transmitting some data in body + we don't want any cache.
export const POST = async (req: NextRequest) => {
  // Don't forget to authenticate and authorize the upload request! Otherwise everyone could upload.
  const session = await auth();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Some pseudo-code, may you want to look up some data:
  const user = await getUserById(session.userId);
  if (!user)
    return NextResponse.json({ error: "User not found" }, { status: 404 });

  // Here comes the "magic": The upload handler returns a Response with a signed URL
  // where the client can upload his file.
  return uploadHandler(req, {
    bucket: myBucket,
    pathPrefix: `users/${user.id}`,
    maxSizeInBytes: 5 * 1024 * 1024, // 5MB
    allowedContentTypes: ["image/png", "image/jpeg", "image/jpg", "image/webp"],
  });
};
```

Now there should be an endpoint on `POST /api/upload/avatar` or similar. With this endpoint we can implement the client component (in this case a React input component).

```ts
// upload.tsx (React Component)

"use client";

import { upload } from "@coin-mirror/blob/upload/client";

function UploadComponent({
  onUploaded,
}: {
  onUploaded: (url: string) => void;
}) {
  return (
    <input
      type="file"
      accept="image/png, image/jpeg, image/jpg, image/webp"
      className="sr-only"
      aria-hidden
      id="avatarUpload"
      onChange={async (event) => {
        event.preventDefault();
        const file = event.target.files?.[0];
        if (!file) return console.log("No file selected");

        // Check file size is useful, to prevent errors from server response
        if (file.size > 4 * 1024 * 1024)
          return window.alert(
            "This file is too large. Please keep it under 4MB.",
          );

        try {
          // The upload function takes the file, requests the upload url
          // and does the upload via signed URL.
          const newBlob = await upload(file, {
            handleUploadUrl: `/api/upload/avatar`,
          });

          // Handle the successful upload
          onUploaded(newBlob.url);
        } catch (err) {
          // Handle the errors
          console.error("Failed to upload avatar image", err);
        }
      }}
      name="avatar"
    />
  );
}
```

This component should now successfully upload any avatar. Internally, the `upload` function calls the endpoint which we just implemented to request a signed url from the server for uploading the file. Then the upload will happen with an additional PUT / Multi-Part upload request.

## Example: Server Upload & Get Files

The more easy way is the directly upload files from your on-server workflows. In this example we connecting to R2 buckets, but this can also be done with any other S3-compatible object storage.

The first step is to install the package:

```bash
npm install @coin-mirror/blob
# OR
yarn install @coin-mirror/blob
# OR
pnpm add @coin-mirror/blob
# OR
bun add @coin-mirror/blob
```

Then we need to define the bucket, for actually connecting to our R2 bucket:

```ts
// bucket.ts (on Server!)

import { type Bucket } from "@coin-mirror/blob";

export const pdfBucket: Bucket = {
  // The credentials for R2 can be access via the Cloudflare Dashboard.
  // Have a look here for other connection options: https://www.npmjs.com/package/@aws-sdk/client-s3
  connection: {
    region: "auto",
    endpoint: process.env.R2_ENDPOINT!,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY!,
      secretAccessKey: process.env.R2_SECRET_KEY!,
    },
  },
  name: "my-big-pdf-blob-store", // The name of the bucket
  publicUrl: "pdf.cdn.example.com", // Required to access the file later in the process
};
```

Let's say you have a PDF in memory, in your `Buffer` and want to upload this file to your bucket:

```ts
// upload.ts (on server)

import { put } from "@coin-mirror/blob";

const buffer = new Buffer(/* Some buffer with your data in it. */);
const path = "/bug-reports/very-important.pdf";

await put(pdfBucket, path, buffer);
```

Please note, you can also use a string, ReadableStream or UIntArray as an input.

The same easy way, you can also get or delete the PDF file:

```ts
// get.ts (on server)

import { get, deleteFile } from "@coin-mirror/blob";

const path = "/bug-reports/very-important.pdf";

const pdfBuffer = await get(pdfBucket, path);

await deleteFile(pdfBucket, path);
```

## Development

=> Using Bun for this project.

## Contributing

1. Fork the repository
2. Create your feature branch
3. Test your changes.
4. Submit a pull request with detailed explainations.
