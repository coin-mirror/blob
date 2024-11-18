import { type S3ClientConfig } from "@aws-sdk/client-s3";

export type Bucket = {
  connection: S3ClientConfig;
  name: string;
  publicUrl: string;
};
