const { S3Client, PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const fs = require("fs");
const path = require("path");

// Cloudflare R2 — compatível com S3
// Variáveis necessárias: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET
const R2_BUCKET = process.env.R2_BUCKET || "viralify-videos";

let s3Client = null;

function getClient() {
  if (s3Client) return s3Client;
  const accountId = process.env.R2_ACCOUNT_ID;
  if (!accountId) return null;
  s3Client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
    },
    // R2 requer path-style para evitar erro de DNS
    forcePathStyle: true,
  });
  return s3Client;
}

async function uploadFile(localPath, key, contentType = "video/mp4") {
  const client = getClient();
  if (!client) {
    console.log("[R2] sem credenciais configuradas, pulando upload");
    return null;
  }

  try {
    const fileBuffer = fs.readFileSync(localPath);
    console.log(`[R2] uploadando ${key} (${(fileBuffer.length/1024/1024).toFixed(1)}MB)...`);
    await client.send(new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: fileBuffer,
      ContentType: contentType,
    }));
    const publicDomain = process.env.R2_PUBLIC_URL;
    const url = publicDomain ? `${publicDomain}/${key}` : null;
    console.log(`[R2] upload OK: ${url}`);
    return url;
  } catch (e) {
    console.error("[R2] erro no upload:", e.message);
    return null;
  }
}

async function uploadVideo(localPath, videoId) {
  const key = `videos/${videoId}.mp4`;
  return uploadFile(localPath, key, "video/mp4");
}

async function uploadAudio(localPath, videoId) {
  const key = `audios/${videoId}.mp3`;
  return uploadFile(localPath, key, "audio/mpeg");
}

const hasStorage = () => !!process.env.R2_ACCOUNT_ID;

module.exports = { uploadVideo, uploadAudio, hasStorage };
