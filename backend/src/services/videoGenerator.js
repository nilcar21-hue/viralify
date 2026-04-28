const Groq = require("groq-sdk");
const fs = require("fs");
const path = require("path");
const { spawnSync, execFileSync } = require("child_process");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const FFMPEG = process.env.FFMPEG_PATH || "ffmpeg";

const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || "TX3LPaxmHKxFdv7VOQHJ";

const PEXELS_KEY = process.env.PEXELS_API_KEY || "";
const PIXABAY_KEY = process.env.PIXABAY_API_KEY || "";

// Termos de busca de vídeo por categoria — mistura PT + EN para mais resultados
const CATEGORY_QUERIES = {
  MLB1499: ["kitchen appliances", "home appliances modern", "washing machine", "blender cooking"],
  MLB1051: ["smartphone modern", "mobile phone technology", "phone screen", "cellphone lifestyle"],
  MLB1648: ["laptop computer", "computer setup gaming", "notebook desk", "technology office"],
  MLB1144: ["sport fitness", "gym workout", "running athlete", "sports equipment"],
  MLB1574: ["beauty cosmetics", "skincare routine", "makeup beauty", "perfume luxury"],
  MLB1182: ["fashion clothes", "clothing store", "style outfit", "shoes fashion"],
  MLB1000: ["ecommerce shopping", "online store", "product unboxing", "delivery package"],
  DEFAULT: ["product showcase", "online shopping lifestyle", "ecommerce modern", "buy online success"],
};

// Fallback: vídeos Pexels hardcoded por categoria (IDs públicos verificados)
const FALLBACK_VIDEOS = {
  MLB1051: [
    "https://www.pexels.com/video/person-using-a-smartphone-while-seated-5473954/",
    "https://cdn.pixabay.com/video/2022/11/03/137016-768835451_tiny.mp4",
  ],
  MLB1648: [
    "https://cdn.pixabay.com/video/2021/10/13/91836-634281615_tiny.mp4",
  ],
  DEFAULT: [
    "https://cdn.pixabay.com/video/2021/08/03/82788-581649651_tiny.mp4",
    "https://cdn.pixabay.com/video/2020/07/28/45986-444960192_tiny.mp4",
  ],
};

async function buscarVideoPexels(query) {
  if (!PEXELS_KEY) return null;
  try {
    const url = `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&orientation=portrait&size=medium&per_page=5`;
    const res = await fetch(url, { headers: { Authorization: PEXELS_KEY } });
    if (!res.ok) return null;
    const data = await res.json();
    const videos = data.videos || [];
    if (!videos.length) return null;
    // Pega o primeiro com arquivo HD disponível
    for (const v of videos) {
      const file = v.video_files?.find(f => f.quality === "hd" || f.quality === "sd");
      if (file?.link) return file.link;
    }
    return null;
  } catch { return null; }
}

async function buscarVideoPixabay(query) {
  if (!PIXABAY_KEY) return null;
  try {
    const url = `https://pixabay.com/api/videos/?key=${PIXABAY_KEY}&q=${encodeURIComponent(query)}&video_type=film&per_page=5`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const hits = data.hits || [];
    if (!hits.length) return null;
    const hit = hits[0];
    return hit.videos?.medium?.url || hit.videos?.small?.url || null;
  } catch { return null; }
}

// Pixabay CN — mesmo endpoint, retorna conteúdo de produtores asiáticos
async function buscarVideoPixabayCN(query) {
  if (!PIXABAY_KEY) return null;
  try {
    const queryCN = query + " china product";
    const url = `https://pixabay.com/api/videos/?key=${PIXABAY_KEY}&q=${encodeURIComponent(queryCN)}&video_type=film&per_page=5&lang=zh`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const hits = data.hits || [];
    if (!hits.length) return null;
    return hits[0].videos?.medium?.url || hits[0].videos?.small?.url || null;
  } catch { return null; }
}

// Coverr (licença comercial gratuita, sem chave)
async function buscarVideoCoverr(query) {
  try {
    const url = `https://coverr.co/api/videos/search?query=${encodeURIComponent(query)}&per_page=3`;
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!res.ok) return null;
    const data = await res.json();
    const items = data.hits || data.videos || [];
    if (!items.length) return null;
    return items[0].urls?.mp4_1080p || items[0].urls?.mp4_720p || null;
  } catch { return null; }
}

async function baixarVideo(urlVideo, destPath) {
  try {
    const res = await fetch(urlVideo, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; Viralify/1.0)" },
      redirect: "follow",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = await res.arrayBuffer();
    if (buf.byteLength < 10000) throw new Error("arquivo muito pequeno");
    fs.writeFileSync(destPath, Buffer.from(buf));
    return true;
  } catch (e) {
    console.error("baixarVideo falhou:", e.message);
    return false;
  }
}

async function obterVideosParaCategoria(categoria, tmpDir, prefix) {
  const queries = CATEGORY_QUERIES[categoria] || CATEGORY_QUERIES.DEFAULT;
  const videoPaths = [];

  for (let i = 0; i < 2; i++) {
    const query = queries[i] || queries[0];
    const destPath = path.join(tmpDir, `${prefix}_clip${i}.mp4`);

    // Tenta em ordem: Pexels → Pixabay → Pixabay CN → Coverr
    let urlVideo = await buscarVideoPexels(query);
    if (!urlVideo) urlVideo = await buscarVideoPixabay(query);
    if (!urlVideo) urlVideo = await buscarVideoPixabayCN(query);
    if (!urlVideo) urlVideo = await buscarVideoCoverr(query);

    // Fallback hardcoded
    if (!urlVideo) {
      const fallbacks = FALLBACK_VIDEOS[categoria] || FALLBACK_VIDEOS.DEFAULT;
      urlVideo = fallbacks[i] || fallbacks[0];
    }

    const ok = await baixarVideo(urlVideo, destPath);
    if (ok) videoPaths.push(destPath);
  }

  return videoPaths;
}

// Prepara clip de vídeo: recorta para 1080x1920, normaliza duração
function prepararClip(inputPath, outputPath, duracao, tmpDir) {
  const r = spawnSync(FFMPEG, [
    "-y", "-i", inputPath,
    "-vf", [
      "scale=1080:1920:force_original_aspect_ratio=increase",
      "crop=1080:1920",
      "setsar=1",
    ].join(","),
    "-t", String(duracao),
    "-an",
    "-c:v", "libx264", "-preset", "ultrafast", "-crf", "26",
    "-r", "25",
    outputPath,
  ], { encoding: "utf8", maxBuffer: 100 * 1024 * 1024, timeout: 120000 });

  return r.status === 0;
}

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
      console.error("ElevenLabs erro:", res.status);
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

  const tmpDir = path.dirname(outputPath);
  const prefix = path.basename(outputPath, ".mp4");

  // Pega duração do áudio
  const probe = spawnSync(FFMPEG, ["-i", audioPath, "-f", "null", "-"], {
    encoding: "utf8", timeout: 15000,
  });
  const durMatch = (probe.stderr || "").match(/Duration:\s*(\d+):(\d+):(\d+\.\d+)/);
  const audioDur = durMatch
    ? parseInt(durMatch[1]) * 3600 + parseInt(durMatch[2]) * 60 + parseFloat(durMatch[3])
    : 35;
  const totalDur = Math.ceil(audioDur) + 1;
  const half = Math.ceil(totalDur / 2);

  // Baixa vídeos de fundo reais (Pexels + Pixabay + Pixabay CN + Coverr)
  const rawVideos = await obterVideosParaCategoria(produto.category, tmpDir, prefix);

  // Prepara clips (recorta para 1080x1920, duração certa)
  const clipPaths = [];
  const duracoes = [half, totalDur - half];
  for (let i = 0; i < rawVideos.length; i++) {
    const clipPath = path.join(tmpDir, `${prefix}_prepared${i}.mp4`);
    const ok = prepararClip(rawVideos[i], clipPath, duracoes[i] || half, tmpDir);
    if (ok) clipPaths.push(clipPath);
    try { fs.unlinkSync(rawVideos[i]); } catch {}
  }

  const tituloSafe = titulo.replace(/'/g, "\\'").replace(/:/g, "\\:").replace(/\[/g, "\\[").replace(/\]/g, "\\]").slice(0, 45);
  const precoSafe = `R$ ${produto.price}`;
  const hashSafe = hashtags.replace(/'/g, "\\'").replace(/:/g, "\\:").slice(0, 50);

  let ffmpegArgs;

  if (clipPaths.length >= 2) {
    // 2 vídeos reais concatenados com overlay de texto
    ffmpegArgs = [
      "-y",
      "-i", clipPaths[0],
      "-i", clipPaths[1],
      "-i", audioPath,
      "-filter_complex", [
        // Concatena os 2 clips de vídeo
        `[0:v][1:v]concat=n=2:v=1:a=0[vbase]`,
        // Overlay escuro para legibilidade
        `[vbase]colorchannelmixer=rr=0.5:gg=0.5:bb=0.5[vdark]`,
        // Gradiente no topo e rodapé
        `[vdark]drawbox=x=0:y=0:w=1080:h=320:color=black@0.75:t=fill[vtop]`,
        `[vtop]drawbox=x=0:y=1600:w=1080:h=320:color=black@0.75:t=fill[vbox]`,
        // Logo Viralify
        `[vbox]drawtext=text='VIRALIFY':fontsize=54:fontcolor=0xc084fc:x=(w-text_w)/2:y=38:font=DejaVu Sans:shadowcolor=black@0.8:shadowx=2:shadowy=2[vt1]`,
        // Título do produto
        `[vt1]drawtext=text='${tituloSafe}':fontsize=52:fontcolor=white:x=(w-text_w)/2:y=120:font=DejaVu Sans:shadowcolor=black@0.9:shadowx=2:shadowy=2[vt2]`,
        // Preço em destaque
        `[vt2]drawtext=text='${precoSafe}':fontsize=80:fontcolor=0x4ade80:x=(w-text_w)/2:y=1620:font=DejaVu Sans:shadowcolor=black@0.9:shadowx=3:shadowy=3[vt3]`,
        // Comissão
        `[vt3]drawtext=text='Comissao ${produto.commission}porcento para voce':fontsize=42:fontcolor=0xfbbf24:x=(w-text_w)/2:y=1730:font=DejaVu Sans:shadowcolor=black@0.8:shadowx=2:shadowy=2[vt4]`,
        // Hashtags
        `[vt4]drawtext=text='${hashSafe}':fontsize=34:fontcolor=0x93c5fd:x=(w-text_w)/2:y=1840:font=DejaVu Sans:shadowcolor=black@0.8:shadowx=1:shadowy=1[vfinal]`,
      ].join(";"),
      "-map", "[vfinal]", "-map", "2:a",
      "-c:v", "libx264", "-preset", "ultrafast", "-crf", "26",
      "-c:a", "aac", "-b:a", "128k",
      "-shortest", "-r", "25",
      "-movflags", "+faststart",
      outputPath,
    ];
  } else if (clipPaths.length === 1) {
    // 1 vídeo real em loop
    ffmpegArgs = [
      "-y",
      "-stream_loop", "-1", "-i", clipPaths[0],
      "-i", audioPath,
      "-filter_complex", [
        `[0:v]colorchannelmixer=rr=0.5:gg=0.5:bb=0.5[vdark]`,
        `[vdark]drawbox=x=0:y=0:w=1080:h=320:color=black@0.75:t=fill[vtop]`,
        `[vtop]drawbox=x=0:y=1600:w=1080:h=320:color=black@0.75:t=fill[vbox]`,
        `[vbox]drawtext=text='VIRALIFY':fontsize=54:fontcolor=0xc084fc:x=(w-text_w)/2:y=38:font=DejaVu Sans:shadowcolor=black@0.8:shadowx=2:shadowy=2[vt1]`,
        `[vt1]drawtext=text='${tituloSafe}':fontsize=52:fontcolor=white:x=(w-text_w)/2:y=120:font=DejaVu Sans:shadowcolor=black@0.9:shadowx=2:shadowy=2[vt2]`,
        `[vt2]drawtext=text='${precoSafe}':fontsize=80:fontcolor=0x4ade80:x=(w-text_w)/2:y=1620:font=DejaVu Sans:shadowcolor=black@0.9:shadowx=3:shadowy=3[vt3]`,
        `[vt3]drawtext=text='Comissao ${produto.commission}porcento para voce':fontsize=42:fontcolor=0xfbbf24:x=(w-text_w)/2:y=1730:font=DejaVu Sans:shadowcolor=black@0.8:shadowx=2:shadowy=2[vt4]`,
        `[vt4]drawtext=text='${hashSafe}':fontsize=34:fontcolor=0x93c5fd:x=(w-text_w)/2:y=1840:font=DejaVu Sans:shadowcolor=black@0.8:shadowx=1:shadowy=1[vfinal]`,
      ].join(";"),
      "-map", "[vfinal]", "-map", "1:a",
      "-c:v", "libx264", "-preset", "ultrafast", "-crf", "26",
      "-c:a", "aac", "-b:a", "128k",
      "-shortest", "-r", "25",
      "-movflags", "+faststart",
      outputPath,
    ];
  } else {
    // Fallback: fundo gradiente com Ken Burns em cor sólida
    ffmpegArgs = [
      "-y",
      "-f", "lavfi", "-i", "color=c=0x1a0a2e:s=1080x1920:r=25",
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
    maxBuffer: 100 * 1024 * 1024,
    timeout: 300000,
  });

  // Limpa clips temporários
  clipPaths.forEach(p => { try { fs.unlinkSync(p); } catch {} });

  if (r.status !== 0) {
    console.error("FFmpeg stderr:", (r.stderr || "").slice(-1000));
    // Fallback simples sem texto
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
      throw new Error("FFmpeg falhou: " + (fallback.stderr || "").slice(-400));
    }
  }

  return outputPath;
}

module.exports = { gerarRoteiro, gerarAudio, gerarVideo };
