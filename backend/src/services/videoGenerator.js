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
    .slice(0, 1500);

  // Tenta ElevenLabs primeiro, fallback para Google TTS
  const elevenKey = process.env.ELEVENLABS_API_KEY;
  if (elevenKey) {
    try {
      const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
        method: "POST",
        headers: {
          "xi-api-key": elevenKey,
          "Content-Type": "application/json",
          "Accept": "audio/mpeg",
        },
        body: JSON.stringify({
          text: textoLimpo,
          model_id: "eleven_turbo_v2_5",
          language_code: "pt",
          voice_settings: { stability: 0.4, similarity_boost: 0.8, style: 0.2, use_speaker_boost: true },
        }),
      });
      if (res.ok) {
        const buffer = await res.arrayBuffer();
        if (buffer.byteLength > 1000) {
          fs.writeFileSync(outputPath, Buffer.from(buffer));
          return outputPath;
        }
      }
    } catch {}
  }

  // Fallback: Google TTS (gratuito, sem restrição de IP)
  const googleKey = process.env.GOOGLE_TTS_KEY;
  if (googleKey) {
    const res = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${googleKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: { text: textoLimpo },
          voice: { languageCode: "pt-BR", name: "pt-BR-Wavenet-B", ssmlGender: "MALE" },
          audioConfig: { audioEncoding: "MP3", speakingRate: 1.1, pitch: 0 },
        }),
      }
    );
    if (res.ok) {
      const data = await res.json();
      fs.writeFileSync(outputPath, Buffer.from(data.audioContent, "base64"));
      return outputPath;
    }
  }

  // Fallback final: FFmpeg gera silêncio de 30s (vídeo ainda fica com imagem)
  spawnSync(FFMPEG, [
    "-y", "-f", "lavfi", "-i", "anullsrc=r=44100:cl=mono",
    "-t", "30", "-q:a", "9", "-acodec", "libmp3lame", outputPath,
  ]);
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

  // Detectar fonte disponível no sistema
  const fontes = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    "/usr/share/fonts/truetype/freefont/FreeSansBold.ttf",
    "/usr/share/fonts/TTF/DejaVuSans-Bold.ttf",
  ];
  let fontfile = "";
  for (const f of fontes) {
    try { if (fs.existsSync(f)) { fontfile = `:fontfile=${f}`; break; } } catch {}
  }

  // Filtro FFmpeg puro: escala imagem + overlay de texto cinematic
  const vf = [
    "scale=1080:1920:force_original_aspect_ratio=increase",
    "crop=1080:1920",
    "colorchannelmixer=rr=0.3:gg=0.3:bb=0.4",
    "drawbox=x=340:y=740:w=400:h=70:color=0xFF0050@0.9:t=fill",
    `drawtext=text='OFERTA':x=(w-text_w)/2:y=785:fontsize=40:fontcolor=white${fontfile}:shadowx=2:shadowy=2`,
    `drawtext=text='${precoEsc}':x=(w-text_w)/2:y=870:fontsize=95:fontcolor=0x00FF88${fontfile}:shadowx=3:shadowy=3`,
    `drawtext=text='${tituloEsc}':x=(w-text_w)/2:y=1000:fontsize=48:fontcolor=white${fontfile}:shadowx=2:shadowy=2`,
    "drawbox=x=80:y=1620:w=920:h=100:color=0xFF0050@0.95:t=fill",
    `drawtext=text='LINK NA BIO':x=(w-text_w)/2:y=1680:fontsize=42:fontcolor=white${fontfile}`,
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
