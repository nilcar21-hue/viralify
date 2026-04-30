const { google } = require("googleapis");
const fs = require("fs");
const path = require("path");

const CLIENT_ID = process.env.YOUTUBE_CLIENT_ID;
const CLIENT_SECRET = process.env.YOUTUBE_CLIENT_SECRET;
const REDIRECT_URI = process.env.YOUTUBE_REDIRECT_URI || "https://viralify-production.up.railway.app/youtube/callback";

function getOAuthClient() {
  return new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
}

// Gera URL de autorização para o dono do canal autenticar uma vez
function getAuthUrl() {
  const oauth2Client = getOAuthClient();
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: ["https://www.googleapis.com/auth/youtube.upload"],
  });
}

// Troca o code pelo token e retorna os tokens para salvar no .env / banco
async function exchangeCode(code) {
  const oauth2Client = getOAuthClient();
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

// Faz upload da VSL para o YouTube
async function uploadVSLToYoutube({ videoPath, title, description, tags, categoryId = "22", privacyStatus = "public" }) {
  const accessToken = process.env.YOUTUBE_ACCESS_TOKEN;
  const refreshToken = process.env.YOUTUBE_REFRESH_TOKEN;

  if (!accessToken || !refreshToken) {
    throw new Error("Tokens do YouTube não configurados. Faça a autenticação primeiro via GET /youtube/auth");
  }

  const oauth2Client = getOAuthClient();
  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  // Salva novo access_token automaticamente se renovado
  oauth2Client.on("tokens", (tokens) => {
    if (tokens.refresh_token) {
      console.log("YouTube: novo refresh_token —", tokens.refresh_token);
    }
    console.log("YouTube: access_token renovado automaticamente");
  });

  const youtube = google.youtube({ version: "v3", auth: oauth2Client });

  const fileSize = fs.statSync(videoPath).size;
  console.log(`YouTube: iniciando upload — ${(fileSize / 1024 / 1024).toFixed(1)} MB`);

  const res = await youtube.videos.insert({
    part: ["snippet", "status"],
    requestBody: {
      snippet: {
        title,
        description,
        tags,
        categoryId,
        defaultLanguage: "pt",
        defaultAudioLanguage: "pt",
      },
      status: {
        privacyStatus,
        selfDeclaredMadeForKids: false,
      },
    },
    media: {
      body: fs.createReadStream(videoPath),
    },
  });

  const videoId = res.data.id;
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
  console.log("YouTube: upload concluído —", videoUrl);
  return { videoId, videoUrl };
}

module.exports = { getAuthUrl, exchangeCode, uploadVSLToYoutube };
