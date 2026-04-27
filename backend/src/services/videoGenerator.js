const Groq = require("groq-sdk");
const axios = require("axios");
const fs = require("fs");
const { spawnSync } = require("child_process");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const FFMPEG = process.env.FFMPEG_PATH || "ffmpeg";
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || "TX3LPaxmHKxFdv7VOQHJ";

async function gerarRoteiro(produto) {
  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [{
      role: "user",
      content: `Roteirista viral de TikTok/YouTube Brasil. Crie um roteiro de 40 segundos para afiliado:
Produto: ${produto.title}
Preço: R$ ${produto.price}
Comissão: ${produto.commission}%

FORMATO EXATO:
TITULO: [max 60 chars]
ROTEIRO: [texto para narrar, max 300 chars, PT-BR coloquial]
HASHTAGS: #tag1 #tag2 #tag3`,
    }],
    max_tokens: 400,
    temperature: 0.85,
  });
  return completion.choices[0].message.content;
}

async function gerarAudio(texto, outputPath) {
  const textoLimpo = texto
    .replace(/TITULO:.*\n/gi, "")
    .replace(/ROTEIRO:\s*/gi, "")
    .replace(/HASHTAGS:.*/gi, "")
    .replace(/\n+/g, " ")
    .trim()
    .slice(0, 800);

  // Tenta ElevenLabs
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
          voice_settings: { stability: 0.4, similarity_boost: 0.8 },
        }),
      });
      if (res.ok) {
        const buf = await res.arrayBuffer();
        if (buf.byteLength > 1000) {
          fs.writeFileSync(outputPath, Buffer.from(buf));
          return outputPath;
        }
      }
      const errText = await res.text().catch(() => "");
      console.error("ElevenLabs erro:", res.status, errText.slice(0, 200));
    } catch (e) {
      console.error("ElevenLabs exception:", e.message);
    }
  }

  // Fallback: Google TTS
  const googleKey = process.env.GOOGLE_TTS_KEY;
  if (googleKey) {
    try {
      const res = await fetch(
        `https://texttospeech.googleapis.com/v1/text:synthesize?key=${googleKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            input: { text: textoLimpo },
            voice: { languageCode: "pt-BR", name: "pt-BR-Wavenet-B", ssmlGender: "MALE" },
            audioConfig: { audioEncoding: "MP3", speakingRate: 1.1 },
          }),
        }
      );
      if (res.ok) {
        const data = await res.json();
        fs.writeFileSync(outputPath, Buffer.from(data.audioContent, "base64"));
        return outputPath;
      }
    } catch {}
  }

  // Fallback final: silêncio de 35s
  const r = spawnSync(FFMPEG, [
    "-y", "-f", "lavfi", "-i", "anullsrc=r=44100:cl=mono",
    "-t", "35", "-acodec", "libmp3lame", "-q:a", "9", outputPath,
  ], { timeout: 30000 });
  if (r.status !== 0) fs.writeFileSync(outputPath, Buffer.alloc(0));
  return outputPath;
}

async function gerarVideo(roteiro, audioPath, produto, outputPath) {
  // FFmpeg minimalista: fundo roxo + áudio. Funciona em qualquer ambiente.
  const r = spawnSync(FFMPEG, [
    "-y",
    "-f", "lavfi", "-i", "color=c=0x1a0a2e:s=1080x1920:r=24",
    "-i", audioPath,
    "-c:v", "libx264", "-preset", "ultrafast", "-crf", "30",
    "-c:a", "aac", "-b:a", "96k",
    "-shortest",
    "-movflags", "+faststart",
    outputPath,
  ], { encoding: "utf8", maxBuffer: 30 * 1024 * 1024, timeout: 180000 });

  if (r.status !== 0) {
    throw new Error("FFmpeg falhou: " + (r.stderr || r.stdout || "exit " + r.status).slice(-600));
  }
  return outputPath;
}

module.exports = { gerarRoteiro, gerarAudio, gerarVideo };
