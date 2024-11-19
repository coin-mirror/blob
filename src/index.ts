import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  NotFound,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl as getSignedUrlOnS3 } from "@aws-sdk/s3-request-presigner";
import { type Bucket } from "./types";

export const put = async (
  bucket: Bucket,
  path: string,
  buffer: string | Uint8Array | Buffer | ReadableStream,
) => {
  const client = new S3Client(bucket.connection);
  const res = await client.send(
    new PutObjectCommand({
      Bucket: bucket.name,
      Key: path,
      Body: buffer,
    }),
  );

  return {
    url: `https://${bucket.publicUrl}/${path}`,
    etag: res.ETag,
    expiration: res.Expiration,
    versionId: res.VersionId,
    checksum: res.ChecksumSHA1,
  };
};

export const exists = async (
  bucket: Bucket,
  path: string,
): Promise<boolean> => {
  const client = new S3Client(bucket.connection);
  const res = await client
    .send(
      new HeadObjectCommand({
        Bucket: bucket.name,
        Key: path,
      }),
    )
    .catch((err) => {
      if (err instanceof NotFound) {
        return {
          ContentLength: undefined,
        };
      }
      throw err;
    });

  return res.ContentLength !== undefined;
};

export const get = async (
  bucket: Bucket,
  path: string,
): Promise<Buffer | null> => {
  const client = new S3Client(bucket.connection);
  const res = await client
    .send(
      new GetObjectCommand({
        Bucket: bucket.name,
        Key: path,
      }),
    )
    .catch((err) => {
      if (err instanceof NotFound) {
        return null;
      }
      throw err;
    });

  return res?.Body ? Buffer.from(await res.Body.transformToByteArray()) : null;
};

export const deleteFile = async (
  bucket: Bucket,
  path: string,
): Promise<void> => {
  const client = new S3Client(bucket.connection);
  await client
    .send(new DeleteObjectCommand({ Bucket: bucket.name, Key: path }))
    .catch((err) => {
      if (err instanceof NotFound) {
        return;
      }
      throw err;
    });
};

export const getStreamed = async (
  bucket: Bucket,
  path: string,
): Promise<ReadableStream | null> => {
  const client = new S3Client(bucket.connection);
  const res = await client.send(
    new GetObjectCommand({
      Bucket: bucket.name,
      Key: path,
    }),
  );

  return res.Body ? res.Body.transformToWebStream() : null;
};

export const getSignedUrl = async (
  bucket: Bucket,
  path: string,
  { expiresIn = 3600 }: { expiresIn?: number },
) => {
  const client = new S3Client(bucket.connection);
  return await getSignedUrlOnS3(
    client,
    new GetObjectCommand({
      Bucket: bucket.name,
      Key: path,
    }),
    {
      expiresIn,
    },
  );
};

export const getSecureUploadUrl = async (
  bucket: Bucket,
  path: string,
  {
    expiresIn = 3600,
  }: {
    expiresIn?: number;
  },
) => {
  const client = new S3Client(bucket.connection);
  return await getSignedUrlOnS3(
    client,
    new PutObjectCommand({
      Bucket: bucket.name,
      Key: path,
    }),
    {
      expiresIn,
    },
  );
};

export { type Bucket };
