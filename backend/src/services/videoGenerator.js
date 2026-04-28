const Groq = require("groq-sdk");
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const FFMPEG = process.env.FFMPEG_PATH || "ffmpeg";

// Voz masculina jovem brasileira — Liam (multilingual v2 — melhor PT-BR)
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || "TX3LPaxmHKxFdv7VOQHJ";

// Imagens de fundo por categoria de produto
const CATEGORY_IMAGES = {
  MLB1499: [ // Eletrodomésticos
    "https://images.pexels.com/photos/4397899/pexels-photo-4397899.jpeg",
    "https://images.pexels.com/photos/4108715/pexels-photo-4108715.jpeg",
  ],
  MLB1051: [ // Celulares
    "https://images.pexels.com/photos/404280/pexels-photo-404280.jpeg",
    "https://images.pexels.com/photos/1092644/pexels-photo-1092644.jpeg",
  ],
  MLB1648: [ // Computadores
    "https://images.pexels.com/photos/1714208/pexels-photo-1714208.jpeg",
    "https://images.pexels.com/photos/574071/pexels-photo-574071.jpeg",
  ],
  MLB1144: [ // Esporte
    "https://images.pexels.com/photos/841130/pexels-photo-841130.jpeg",
    "https://images.pexels.com/photos/4164512/pexels-photo-4164512.jpeg",
  ],
  MLB1574: [ // Beleza
    "https://images.pexels.com/photos/3785147/pexels-photo-3785147.jpeg",
    "https://images.pexels.com/photos/3373736/pexels-photo-3373736.jpeg",
  ],
  DEFAULT: [
    "https://images.pexels.com/photos/5632399/pexels-photo-5632399.jpeg",
    "https://images.pexels.com/photos/4386431/pexels-photo-4386431.jpeg",
    "https://images.pexels.com/photos/7567434/pexels-photo-7567434.jpeg",
  ],
};

async function gerarRoteiro(produto) {
  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [{
      role: "user",
      content: `Você é um roteirista viral de TikTok brasileiro. Crie um roteiro de vídeo curto para afiliado.

Produto: ${produto.title}
Preço: R$ ${produto.price}
Comissão: ${produto.commission}%

FORMATO OBRIGATÓRIO (exatamente assim):
TITULO: [máximo 60 caracteres, chamativo]
ROTEIRO: [texto para narrar em voz alta, máximo 280 caracteres, português brasileiro coloquial, sem emojis, sem hashtags]
HASHTAGS: #tag1 #tag2 #tag3 #tag4 #tag5

O roteiro deve soar natural como uma pessoa falando, não um robô. Use gírias brasileiras.`,
    }],
    max_tokens: 400,
    temperature: 0.9,
  });
  return completion.choices[0].message.content;
}

async function downloadImage(url, destPath) {
  try {
    const res = await fetch(url + "?auto=compress&cs=tinysrgb&w=1080&h=1920&fit=crop", {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; Viralify/1.0)" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = await res.arrayBuffer();
    fs.writeFileSync(destPath, Buffer.from(buf));
    return true;
  } catch (e) {
    console.error("downloadImage falhou:", e.message);
    return false;
  }
}

async function gerarAudio(texto, outputPath) {
  const textoLimpo = texto
    .replace(/TITULO:.*\n/gi, "")
    .replace(/ROTEIRO:\s*/gi, "")
    .replace(/HASHTAGS:.*/gi, "")
    .replace(/\n+/g, " ")
    .trim()
    .slice(0, 500);

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
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.4,
            similarity_boost: 0.85,
            style: 0.35,
            use_speaker_boost: true,
          },
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
            audioConfig: { audioEncoding: "MP3", speakingRate: 1.05, pitch: -1.0 },
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

  // Fallback final: silêncio 35s
  const r = spawnSync(FFMPEG, [
    "-y", "-f", "lavfi", "-i", "anullsrc=r=44100:cl=mono",
    "-t", "35", "-acodec", "libmp3lame", "-q:a", "9", outputPath,
  ], { timeout: 30000 });
  if (r.status !== 0) fs.writeFileSync(outputPath, Buffer.alloc(0));
  return outputPath;
}

async function gerarVideo(roteiro, audioPath, produto, outputPath) {
  const titulo = roteiro.match(/TITULO:\s*(.+)/i)?.[1]?.trim() || produto.title;
  const hashtags = roteiro.match(/HASHTAGS:\s*(.+)/i)?.[1]?.trim() || "#afiliados #mercadolivre";

  // Escolhe imagens de fundo por categoria
  const categoryImgs = CATEGORY_IMAGES[produto.category] || CATEGORY_IMAGES.DEFAULT;
  const tmpDir = path.dirname(outputPath);
  const imgPaths = [];

  // Baixa até 2 imagens de fundo
  for (let i = 0; i < Math.min(2, categoryImgs.length); i++) {
    const imgPath = path.join(tmpDir, `bg_${path.basename(outputPath, ".mp4")}_${i}.jpg`);
    const ok = await downloadImage(categoryImgs[i], imgPath);
    if (ok) imgPaths.push(imgPath);
  }

  // Tenta baixar thumbnail do produto
  const thumbPath = path.join(tmpDir, `thumb_${path.basename(outputPath, ".mp4")}.jpg`);
  let hasThumbnail = false;
  if (produto.thumbnail && produto.thumbnail.startsWith("http")) {
    hasThumbnail = await downloadImage(produto.thumbnail.split("?")[0] + "?auto=compress&w=400", thumbPath);
  }

  // Pega duração do áudio
  const probe = spawnSync(FFMPEG, ["-i", audioPath, "-f", "null", "-"], {
    encoding: "utf8", timeout: 15000,
  });
  const durMatch = (probe.stderr || "").match(/Duration:\s*(\d+):(\d+):(\d+\.\d+)/);
  const audioDur = durMatch
    ? parseInt(durMatch[1]) * 3600 + parseInt(durMatch[2]) * 60 + parseFloat(durMatch[3])
    : 35;
  const totalDur = Math.ceil(audioDur) + 1;

  // Monta o vídeo com imagens reais + texto sobreposto
  let ffmpegArgs;

  if (imgPaths.length >= 2) {
    // 2 imagens: cada uma dura metade do vídeo com Ken Burns
    const half = Math.ceil(totalDur / 2);
    const tituloSafe = titulo.replace(/'/g, "\\'").replace(/:/g, "\\:").slice(0, 45);
    const precoSafe = `R$ ${produto.price}`;
    const hashSafe = hashtags.replace(/'/g, "\\'").replace(/:/g, "\\:").slice(0, 50);

    ffmpegArgs = [
      "-y",
      "-loop", "1", "-t", String(half), "-i", imgPaths[0],
      "-loop", "1", "-t", String(totalDur - half), "-i", imgPaths[1],
      "-i", audioPath,
      "-filter_complex", [
        // Escala e faz zoom Ken Burns em cada imagem
        `[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,zoompan=z='min(zoom+0.001,1.1)':d=${half*25}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1920:fps=25[v0]`,
        `[1:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,zoompan=z='min(zoom+0.001,1.1)':d=${(totalDur-half)*25}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1920:fps=25[v1]`,
        // Concatena os dois clips
        `[v0][v1]concat=n=2:v=1:a=0[vbase]`,
        // Overlay escuro para legibilidade
        `[vbase]colorchannelmixer=rr=0.4:gg=0.4:bb=0.4[vdark]`,
        // Gradiente no topo e fundo
        `[vdark]drawbox=x=0:y=0:w=1080:h=300:color=black@0.7:t=fill[vtop]`,
        `[vtop]drawbox=x=0:y=1620:w=1080:h=300:color=black@0.7:t=fill[vbox]`,
        // Textos
        `[vbox]drawtext=text='VIRALIFY':fontsize=52:fontcolor=0xc084fc:x=(w-text_w)/2:y=40:font=DejaVu Sans[vt1]`,
        `[vt1]drawtext=text='${tituloSafe}':fontsize=58:fontcolor=white:x=(w-text_w)/2:y=140:font=DejaVu Sans[vt2]`,
        `[vt2]drawtext=text='${precoSafe}':fontsize=72:fontcolor=0x4ade80:x=(w-text_w)/2:y=1660:font=DejaVu Sans[vt3]`,
        `[vt3]drawtext=text='Link na bio - Comissao ${produto.commission}porcento':fontsize=44:fontcolor=0xfbbf24:x=(w-text_w)/2:y=1760:font=DejaVu Sans[vt4]`,
        `[vt4]drawtext=text='${hashSafe}':fontsize=36:fontcolor=0x93c5fd:x=(w-text_w)/2:y=1850:font=DejaVu Sans[vfinal]`,
      ].join(";"),
      "-map", "[vfinal]", "-map", "2:a",
      "-c:v", "libx264", "-preset", "ultrafast", "-crf", "28",
      "-c:a", "aac", "-b:a", "128k",
      "-shortest", "-r", "25",
      "-movflags", "+faststart",
      outputPath,
    ];
  } else {
    // Fallback: fundo gradiente roxo com texto
    const tituloSafe = titulo.replace(/'/g, "\\'").replace(/:/g, "\\:").slice(0, 45);
    ffmpegArgs = [
      "-y",
      "-f", "lavfi", "-i", `color=c=0x1a0a2e:s=1080x1920:r=25`,
      "-i", audioPath,
      "-filter_complex", [
        `[0:v]drawbox=x=0:y=0:w=1080:h=1920:color=0x7c3aed@0.3:t=fill[vbg]`,
        `[vbg]drawtext=text='VIRALIFY':fontsize=80:fontcolor=0xc084fc:x=(w-text_w)/2:y=200:font=DejaVu Sans[vt1]`,
        `[vt1]drawtext=text='${tituloSafe}':fontsize=64:fontcolor=white:x=(w-text_w)/2:y=400:font=DejaVu Sans[vt2]`,
        `[vt2]drawtext=text='R$ ${produto.price}':fontsize=100:fontcolor=0x4ade80:x=(w-text_w)/2:y=900:font=DejaVu Sans[vt3]`,
        `[vt3]drawtext=text='Comissao ${produto.commission}porcento':fontsize=60:fontcolor=0xfbbf24:x=(w-text_w)/2:y=1050:font=DejaVu Sans[vfinal]`,
      ].join(";"),
      "-map", "[vfinal]", "-map", "1:a",
      "-c:v", "libx264", "-preset", "ultrafast", "-crf", "28",
      "-c:a", "aac", "-b:a", "128k",
      "-shortest", "-r", "25",
      "-movflags", "+faststart",
      outputPath,
    ];
  }

  const r = spawnSync(FFMPEG, ffmpegArgs, {
    encoding: "utf8",
    maxBuffer: 50 * 1024 * 1024,
    timeout: 240000,
  });

  // Limpa imagens temporárias
  [...imgPaths, thumbPath].forEach(p => { try { fs.unlinkSync(p); } catch {} });

  if (r.status !== 0) {
    console.error("FFmpeg stderr:", (r.stderr || "").slice(-800));
    // Se falhou com imagens, tenta fallback simples
    const fallback = spawnSync(FFMPEG, [
      "-y",
      "-f", "lavfi", "-i", "color=c=0x1a0a2e:s=1080x1920:r=25",
      "-i", audioPath,
      "-c:v", "libx264", "-preset", "ultrafast", "-crf", "30",
      "-c:a", "aac", "-b:a", "96k",
      "-shortest", "-movflags", "+faststart",
      outputPath,
    ], { encoding: "utf8", maxBuffer: 30 * 1024 * 1024, timeout: 120000 });

    if (fallback.status !== 0) {
      throw new Error("FFmpeg falhou: " + (fallback.stderr || fallback.stdout || "exit " + fallback.status).slice(-400));
    }
  }

  return outputPath;
}

module.exports = { gerarRoteiro, gerarAudio, gerarVideo };
