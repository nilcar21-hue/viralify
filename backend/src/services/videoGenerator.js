const Groq = require("groq-sdk");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const FFMPEG = process.env.FFMPEG_PATH || "ffmpeg";
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || "TX3LPaxmHKxFdv7VOQHJ";

async function gerarRoteiro(produto) {
  const prompt = `Você é um roteirista especialista em vídeos virais de afiliados para TikTok/YouTube Brasil.

Crie um roteiro de Short de 45-60 segundos para divulgar esse produto:
Nome: ${produto.title}
Preço: R$ ${produto.price}
Comissão: ${produto.commission}%

REGRAS:
- Começo chocante que PARA O DEDO de dar scroll (primeiros 3 segundos)
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

async function gerarAudio(texto, outputPath) {
  const textoLimpo = texto
    .replace(/TITULO:.*\n/gi, "")
    .replace(/GANCHO:\s*/gi, "")
    .replace(/ROTEIRO:\s*/gi, "")
    .replace(/CTA:\s*/gi, "")
    .replace(/HASHTAGS:.*/gi, "")
    .replace(/\n+/g, " ")
    .trim()
    .slice(0, 2000);

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
      timeout: 30000,
    }
  );

  fs.writeFileSync(outputPath, Buffer.from(response.data));
  return outputPath;
}

async function gerarVideo(roteiro, audioPath, produto, outputPath) {
  const titulo = (roteiro.match(/TITULO:\s*(.+)/i)?.[1]?.trim() || produto.title).slice(0, 55);
  const preco = `R$ ${produto.price.toFixed(2).replace(".", ",")}`;

  // Baixa thumbnail
  const thumbPath = outputPath.replace(".mp4", "_thumb.jpg");
  try {
    const r = await axios.get(produto.thumbnail, { responseType: "arraybuffer", timeout: 10000 });
    fs.writeFileSync(thumbPath, Buffer.from(r.data));
  } catch {
    // Cria imagem preta de fallback via FFmpeg
    spawnSync(FFMPEG, ["-y", "-f", "lavfi", "-i", "color=c=black:s=1080x1920:d=1", "-frames:v", "1", thumbPath]);
  }

  // Escapa texto para filtro FFmpeg drawtext
  const esc = (s) => s.replace(/[\\:']/g, "\\$&").replace(/[^\x20-\x7E]/g, "");
  const tituloEsc = esc(titulo);
  const precoEsc = esc(preco);
  const ctaEsc = esc("LINK NA BIO — COMPRAR AGORA");

  // Filtro FFmpeg puro: escala imagem + overlay de texto cinematic
  const vf = [
    // Escala e corta para 9:16
    "scale=1080:1920:force_original_aspect_ratio=increase",
    "crop=1080:1920",
    // Escurece fundo
    "colorchannelmixer=rr=0.3:gg=0.3:bb=0.4",
    // Badge OFERTA
    "drawbox=x=340:y=740:w=400:h=70:color=0xFF0050@0.9:t=fill",
    `drawtext=text='OFERTA RELAMPAGO':x=(w-text_w)/2:y=785:fontsize=34:fontcolor=white:fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:shadowx=2:shadowy=2`,
    // Preço
    `drawtext=text='${precoEsc}':x=(w-text_w)/2:y=870:fontsize=95:fontcolor=0x00FF88:fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:shadowx=3:shadowy=3`,
    // Título
    `drawtext=text='${tituloEsc}':x=(w-text_w)/2:y=1000:fontsize=50:fontcolor=white:fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:shadowx=2:shadowy=2`,
    // CTA
    "drawbox=x=80:y=1620:w=920:h=100:color=0xFF0050@0.95:t=fill",
    `drawtext=text='${ctaEsc}':x=(w-text_w)/2:y=1680:fontsize=38:fontcolor=white:fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf`,
  ].join(",");

  const r = spawnSync(FFMPEG, [
    "-y",
    "-loop", "1", "-i", thumbPath,
    "-i", audioPath,
    "-vf", vf,
    "-c:v", "libx264", "-preset", "fast", "-crf", "26",
    "-c:a", "aac", "-b:a", "128k",
    "-shortest", "-movflags", "+faststart",
    outputPath,
  ], { encoding: "utf8", maxBuffer: 20 * 1024 * 1024, timeout: 180000 });

  try { fs.unlinkSync(thumbPath); } catch {}

  if (r.status !== 0) throw new Error("FFmpeg: " + (r.stderr || r.stdout || "").slice(-500));
  return outputPath;
}

module.exports = { gerarRoteiro, gerarAudio, gerarVideo };
