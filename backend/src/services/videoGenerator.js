const Groq = require("groq-sdk");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const FFMPEG = process.env.FFMPEG_PATH || "ffmpeg";
const VOICE_ID = "TX3LPaxmHKxFdv7VOQHJ"; // Liam PT-BR

// Gera roteiro com IA
async function gerarRoteiro(produto) {
  const prompt = `Você é um roteirista especialista em vídeos virais de afiliados para TikTok/YouTube Brasil.

Crie um roteiro de Short de 45-60 segundos para divulgar esse produto:
Nome: ${produto.title}
Preço: R$ ${produto.price}
Comissão: ${produto.commission}%

REGRAS:
- Começo chocante que PARA O DEDO de dar scroll (primeiros 3 segundos)
- NUNCA mencione nomes de pessoas ou canais
- Fala direta: "você", "a gente"
- Frases curtas, máximo 12 palavras
- Destaque o benefício, não o produto
- CTA natural no final com link na bio
- Português BR coloquial

FORMATO EXATO:
TITULO: [máximo 60 chars]
GANCHO: [1 frase de abertura impactante]
ROTEIRO: [roteiro corrido para narrar]
CTA: [1 frase de chamada]
HASHTAGS: #hashtag1 #hashtag2 #hashtag3 #hashtag4 #hashtag5`;

  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 800,
    temperature: 0.85,
  });

  return completion.choices[0].message.content;
}

// Gera áudio com ElevenLabs
async function gerarAudio(texto, outputPath) {
  const textoLimpo = texto
    .replace(/TITULO:.*\n/i, "")
    .replace(/GANCHO:\s*/i, "")
    .replace(/ROTEIRO:\s*/i, "")
    .replace(/CTA:\s*/i, "")
    .replace(/HASHTAGS:.*/i, "")
    .replace(/\n+/g, " ")
    .trim();

  const response = await axios.post(
    `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
    {
      text: textoLimpo,
      model_id: "eleven_turbo_v2_5",
      language_code: "pt",
      voice_settings: { stability: 0.4, similarity_boost: 0.8, style: 0.2, use_speaker_boost: true },
    },
    {
      headers: {
        "xi-api-key": process.env.ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      responseType: "arraybuffer",
    }
  );

  fs.writeFileSync(outputPath, Buffer.from(response.data));
  return outputPath;
}

// Gera vídeo cinematic com Canvas + FFmpeg
async function gerarVideo(roteiro, audioPath, produto, outputPath) {
  const { createCanvas, loadImage } = require("canvas");
  const https = require("https");
  const http = require("http");

  const W = 1080, H = 1920;
  const titulo = roteiro.match(/TITULO:\s*(.+)/i)?.[1]?.trim() || produto.title;
  const hashtags = roteiro.match(/HASHTAGS:\s*(.+)/i)?.[1]?.trim() || "";

  // Baixa thumbnail do produto
  const imgPath = outputPath.replace(".mp4", "_thumb.jpg");
  await new Promise((resolve) => {
    const proto = produto.thumbnail?.startsWith("https") ? https : http;
    const file = fs.createWriteStream(imgPath);
    proto.get(produto.thumbnail || "", (res) => {
      res.pipe(file);
      file.on("finish", () => { file.close(); resolve(); });
    }).on("error", () => resolve());
  });

  // Cria frame com produto
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");

  // Fundo gradiente escuro
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, "#0a0a0a");
  grad.addColorStop(1, "#1a0a2e");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Tenta carregar imagem do produto
  try {
    const img = await loadImage(imgPath);
    // Imagem do produto centralizada no topo
    const imgH = H * 0.5;
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.drawImage(img, 0, 0, W, imgH);
    ctx.restore();

    // Overlay gradiente sobre a imagem
    const overlay = ctx.createLinearGradient(0, 0, 0, imgH);
    overlay.addColorStop(0, "rgba(10,10,10,0.3)");
    overlay.addColorStop(1, "rgba(10,10,10,0.95)");
    ctx.fillStyle = overlay;
    ctx.fillRect(0, 0, W, imgH);

    // Imagem do produto em destaque (menor, centralizada)
    const pw = 600, ph = 600;
    const px = (W - pw) / 2, py = 100;
    ctx.save();
    ctx.shadowColor = "#FF0050";
    ctx.shadowBlur = 30;
    ctx.drawImage(img, px, py, pw, ph);
    ctx.restore();
  } catch {}

  try { fs.unlinkSync(imgPath); } catch {}

  // Badge OFERTA
  ctx.fillStyle = "#FF0050";
  ctx.beginPath();
  ctx.roundRect(W/2 - 120, 730, 240, 60, 30);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.font = "bold 32px Arial";
  ctx.textAlign = "center";
  ctx.fillText("🔥 OFERTA RELÂMPAGO", W/2, 770);

  // Preço
  ctx.fillStyle = "#00FF88";
  ctx.font = "bold 90px Arial";
  ctx.fillText(`R$ ${produto.price.toFixed(2).replace(".", ",")}`, W/2, 880);

  // Título do produto
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 52px Arial";
  const palavras = titulo.split(" ");
  let linha = "", linhas = [], y = 980;
  for (const p of palavras) {
    const t = linha ? `${linha} ${p}` : p;
    if (ctx.measureText(t).width > W - 120) { linhas.push(linha); linha = p; }
    else linha = t;
  }
  if (linha) linhas.push(linha);
  linhas.slice(0, 3).forEach(l => { ctx.fillText(l, W/2, y); y += 65; });

  // CTA
  ctx.fillStyle = "#FF0050";
  ctx.beginPath();
  ctx.roundRect(80, H - 280, W - 160, 100, 20);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.font = "bold 48px Arial";
  ctx.fillText("👆 LINK NA BIO — COMPRAR AGORA", W/2, H - 218);

  // Hashtags
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.font = "28px Arial";
  ctx.fillText(hashtags.split(" ").slice(0, 5).join(" "), W/2, H - 120);

  // Salva frame
  const framePath = outputPath.replace(".mp4", "_frame.jpg");
  fs.writeFileSync(framePath, canvas.toBuffer("image/jpeg", { quality: 90 }));

  // Monta vídeo com FFmpeg
  const r = spawnSync(FFMPEG, [
    "-y",
    "-loop", "1", "-i", framePath,
    "-i", audioPath,
    "-vf", "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=24",
    "-c:v", "libx264", "-preset", "fast", "-crf", "24",
    "-c:a", "aac", "-b:a", "128k",
    "-shortest", "-movflags", "+faststart",
    outputPath,
  ], { encoding: "utf8", maxBuffer: 10 * 1024 * 1024, timeout: 120000 });

  try { fs.unlinkSync(framePath); } catch {}

  if (r.status !== 0) throw new Error("FFmpeg falhou: " + r.stderr?.slice(-300));
  return outputPath;
}

module.exports = { gerarRoteiro, gerarAudio, gerarVideo };
