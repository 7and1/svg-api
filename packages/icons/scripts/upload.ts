import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import fg from "fast-glob";
import { promises as fs } from "fs";
import path from "path";
import mime from "mime-types";
import pLimit from "p-limit";
import { INVERTED_INDEX_KEY, SYNONYMS_KEY } from "@svg-api/shared/constants";

const ROOT = path.resolve(process.cwd(), "..", "..");
const DIST_DIR = path.join(ROOT, "packages", "icons", "dist");
const ICONS_DIR = path.join(DIST_DIR, "icons");

const requiredEnv = (key: string) => {
  const value = process.env[key];
  if (!value) throw new Error(`Missing env var: ${key}`);
  return value;
};

const uploadKVValue = async (
  accountId: string,
  token: string,
  namespaceId: string,
  key: string,
  body: string,
) => {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${namespaceId}/values/${encodeURIComponent(key)}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body,
    },
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`KV upload failed for ${key}: ${response.status} ${error}`);
  }

  return response;
};

const uploadToKV = async () => {
  const accountId = requiredEnv("CLOUDFLARE_ACCOUNT_ID");
  const token = requiredEnv("CLOUDFLARE_API_TOKEN");
  const namespaceId = requiredEnv("CF_KV_NAMESPACE_ID");
  const indexKey = process.env.INDEX_KEY ?? "index:v1";

  // Upload main index
  const indexPath = path.join(DIST_DIR, "index.json");
  const indexBody = await fs.readFile(indexPath, "utf-8");
  await uploadKVValue(accountId, token, namespaceId, indexKey, indexBody);
  console.log(`Uploaded index to KV (${indexKey}).`);

  // Upload inverted index
  const invertedIndexPath = path.join(DIST_DIR, "inverted-index.json");
  try {
    const invertedIndexBody = await fs.readFile(invertedIndexPath, "utf-8");
    await uploadKVValue(
      accountId,
      token,
      namespaceId,
      INVERTED_INDEX_KEY,
      invertedIndexBody,
    );
    console.log(`Uploaded inverted index to KV (${INVERTED_INDEX_KEY}).`);
  } catch (err) {
    console.log("Inverted index not found, skipping upload.");
  }

  // Upload synonyms
  const synonymsPath = path.join(DIST_DIR, "synonyms.json");
  try {
    const synonymsBody = await fs.readFile(synonymsPath, "utf-8");
    await uploadKVValue(
      accountId,
      token,
      namespaceId,
      SYNONYMS_KEY,
      synonymsBody,
    );
    console.log(`Uploaded synonyms to KV (${SYNONYMS_KEY}).`);
  } catch (err) {
    console.log("Synonyms file not found, skipping upload.");
  }
};

const uploadToR2 = async () => {
  const endpoint = requiredEnv("R2_ENDPOINT");
  const accessKeyId = requiredEnv("R2_ACCESS_KEY_ID");
  const secretAccessKey = requiredEnv("R2_SECRET_ACCESS_KEY");
  const bucket = requiredEnv("R2_BUCKET_NAME");

  const client = new S3Client({
    region: "auto",
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
  });

  const files = await fg("**/*", { cwd: ICONS_DIR, onlyFiles: true });
  const limit = pLimit(8);

  await Promise.all(
    files.map((file) =>
      limit(async () => {
        const abs = path.join(ICONS_DIR, file);
        const body = await fs.readFile(abs);
        const contentType = mime.lookup(file) || "application/octet-stream";

        await client.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: file.replace(/\\/g, "/"),
            Body: body,
            ContentType: contentType,
            CacheControl: "public, max-age=31536000, immutable",
          }),
        );
      }),
    ),
  );

  const manifestPath = path.join(DIST_DIR, "manifest.json");
  const manifestBody = await fs.readFile(manifestPath);
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: "_meta/manifest.json",
      Body: manifestBody,
      ContentType: "application/json",
      CacheControl: "public, max-age=3600",
    }),
  );

  console.log(`Uploaded ${files.length} icons to R2.`);
};

const run = async () => {
  await uploadToR2();
  await uploadToKV();
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
