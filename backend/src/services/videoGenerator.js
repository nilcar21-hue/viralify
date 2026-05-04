const Groq = require("groq-sdk");
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const FFMPEG = process.env.FFMPEG_PATH || "ffmpeg";
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || "TX3LPaxmHKxFdv7VOQHJ";
const PEXELS_KEY = process.env.PEXELS_API_KEY || "";
const PIXABAY_KEY = process.env.PIXABAY_API_KEY || "";

// Extrai keywords em inglês do título do produto para busca de vídeo
async function extrairKeywords(produto) {
  try {
    const resp = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{
        role: "user",
        content: `Produto: "${produto.title}" (R$ ${produto.price})
Retorne APENAS 3 termos de busca em inglês, separados por vírgula, para encontrar vídeos de stock relevantes ao produto.
Seja específico ao produto. Exemplos:
- "Fritadeira Air Fryer" → "air fryer cooking, healthy frying, kitchen appliance"
- "Fone Bluetooth JBL" → "wireless headphones music, bluetooth earbuds, audio listening"
- "Mouse Gamer" → "gaming mouse computer, gamer setup desk, esports gaming"
- "Câmera de Segurança" → "security camera home, surveillance system, smart home security"
- "Smartwatch" → "smartwatch fitness, digital watch wrist, wearable technology"
Responda APENAS os termos, sem explicação.`,
      }],
      max_tokens: 60,
      temperature: 0.3,
    });
    const raw = resp.choices[0].message.content.trim();
    return raw.split(",").map(k => k.trim()).filter(Boolean).slice(0, 3);
  } catch {
    // Fallback baseado no título
    const title = produto.title.toLowerCase();
    if (title.includes("fone") || title.includes("headphone") || title.includes("earphone")) return ["wireless headphones music", "bluetooth audio"];
    if (title.includes("smartwatch") || title.includes("relógio")) return ["smartwatch wrist fitness", "digital watch lifestyle"];
    if (title.includes("câmera") || title.includes("camera")) return ["security camera home", "surveillance technology"];
    if (title.includes("mouse") || title.includes("teclado")) return ["gaming setup desk computer", "esports gamer"];
    if (title.includes("air fryer") || title.includes("fritadeira")) return ["air fryer cooking healthy", "kitchen appliance food"];
    if (title.includes("aspirador") || title.includes("robô")) return ["robot vacuum cleaner home", "smart home cleaning"];
    if (title.includes("projetor")) return ["portable projector cinema", "movie projection screen"];
    if (title.includes("carregador")) return ["usb charger phone technology", "fast charging device"];
    if (title.includes("mochila")) return ["backpack laptop bag", "school bag lifestyle"];
    return ["product showcase ecommerce", "online shopping lifestyle"];
  }
}

async function buscarVideoPexels(query) {
  if (!PEXELS_KEY) return null;
  try {
    const url = `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&orientation=portrait&size=medium&per_page=8`;
    const res = await fetch(url, { headers: { Authorization: PEXELS_KEY } });
    if (!res.ok) return null;
    const data = await res.json();
    const videos = data.videos || [];
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
    return hits[0].videos?.medium?.url || hits[0].videos?.small?.url || null;
  } catch { return null; }
}

async function baixarArquivo(url, destPath) {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; Viralify/1.0)" },
      redirect: "follow",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = await res.arrayBuffer();
    if (buf.byteLength < 5000) throw new Error("arquivo muito pequeno");
    fs.writeFileSync(destPath, Buffer.from(buf));
    return true;
  } catch (e) {
    console.error("baixarArquivo falhou:", e.message);
    return false;
  }
}

function getAudioDuration(audioPath) {
  const probe = spawnSync(FFMPEG, ["-i", audioPath, "-f", "null", "-"], {
    encoding: "utf8", timeout: 15000,
  });
  const m = (probe.stderr || "").match(/Duration:\s*(\d+):(\d+):(\d+\.\d+)/);
  return m ? parseInt(m[1]) * 3600 + parseInt(m[2]) * 60 + parseFloat(m[3]) : 35;
}

function prepararClip(inputPath, outputPath, duracao) {
  const r = spawnSync(FFMPEG, [
    "-y", "-i", inputPath,
    "-vf", "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1",
    "-t", String(duracao),
    "-an",
    "-c:v", "libx264", "-preset", "ultrafast", "-crf", "26", "-r", "25",
    outputPath,
  ], { encoding: "utf8", maxBuffer: 100 * 1024 * 1024, timeout: 120000 });
  return r.status === 0;
}

function prepararImagem(inputPath, outputPath, duracao) {
  const r = spawnSync(FFMPEG, [
    "-y",
    "-loop", "1", "-t", String(duracao), "-i", inputPath,
    "-vf", "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,format=yuv420p",
    "-c:v", "libx264", "-preset", "ultrafast", "-crf", "26", "-r", "25",
    outputPath,
  ], { encoding: "utf8", maxBuffer: 50 * 1024 * 1024, timeout: 60000 });
  return r.status === 0;
}

async function gerarRoteiro(produto) {
  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [{
      role: "user",
      content: `Você é um roteirista viral de TikTok e Reels brasileiro experiente. Crie um roteiro de vídeo de afiliado que dure entre 25 e 35 segundos quando narrado em voz alta.

Produto: ${produto.title}
Preço: R$ ${produto.price}
Comissão: ${produto.commission}%

FORMATO OBRIGATÓRIO (siga exatamente):
TITULO: [máximo 60 caracteres, chamativo, use números ou pergunta]
ROTEIRO: [texto corrido para narrar, entre 400 e 550 caracteres, português brasileiro coloquial, sem emojis, sem hashtags — inclua: gancho de abertura, benefício principal, prova social ou dado, preço, chamada para ação com "link na bio"]
HASHTAGS: #tag1 #tag2 #tag3 #tag4 #tag5

Regras do roteiro:
- Comece com gancho forte (ex: "Cara, descobri um negócio absurdo...")
- Fale o nome exato do produto e o preço de forma natural
- Termine com "pega o link na bio antes de acabar o estoque"
- Tom: amigo empolgado falando pro outro, não vendedor robô`,
    }],
    max_tokens: 700,
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
          voice_settings: { stability: 0.4, similarity_boost: 0.85, style: 0.35, use_speaker_boost: true },
        }),
      });
      if (res.ok) {
        const buf = await res.arrayBuffer();
        if (buf.byteLength > 1000) {
          fs.writeFileSync(outputPath, Buffer.from(buf));
          return outputPath;
        }
      }
    } catch (e) { console.error("ElevenLabs:", e.message); }
  }

  // Fallback: silêncio 35s
  spawnSync(FFMPEG, [
    "-y", "-f", "lavfi", "-i", "anullsrc=r=44100:cl=mono",
    "-t", "35", "-acodec", "libmp3lame", "-q:a", "9", outputPath,
  ], { timeout: 30000 });
  return outputPath;
}

async function gerarVideo(roteiro, audioPath, produto, outputPath) {
  const titulo = roteiro.match(/TITULO:\s*(.+)/i)?.[1]?.trim() || produto.title;
  const hashtags = roteiro.match(/HASHTAGS:\s*(.+)/i)?.[1]?.trim() || "#afiliados #mercadolivre";
  const tmpDir = path.dirname(outputPath);
  const prefix = path.basename(outputPath, ".mp4") + "_tmp";

  const audioDur = getAudioDuration(audioPath);
  const totalDur = Math.ceil(audioDur) + 1;

  // PASSO 1: Baixar thumbnail do produto (sempre o primeiro segmento)
  let productImgPath = null;
  if (produto.thumbnail) {
    productImgPath = path.join(tmpDir, `${prefix}_product.jpg`);
    const ok = await baixarArquivo(produto.thumbnail, productImgPath);
    if (!ok) productImgPath = null;
  }

  // PASSO 2: Extrair keywords específicas do produto via Groq
  console.log(`  Extraindo keywords para: ${produto.title}`);
  const keywords = await extrairKeywords(produto);
  console.log(`  Keywords: ${keywords.join(", ")}`);

  // PASSO 3: Buscar vídeos de fundo relevantes ao produto
  const clipPaths = [];

  // Primeira metade: imagem do produto (se disponível) ou vídeo
  if (productImgPath) {
    const imgVideoPath = path.join(tmpDir, `${prefix}_seg0.mp4`);
    const half = Math.ceil(totalDur / 2);
    const ok = prepararImagem(productImgPath, imgVideoPath, half);
    if (ok) clipPaths.push({ path: imgVideoPath, dur: half });
  }

  // Restante: vídeos de fundo por keyword do produto
  const videosNeeded = productImgPath ? 1 : 2;
  for (let i = 0; i < videosNeeded && i < keywords.length; i++) {
    const query = keywords[i];
    const rawPath = path.join(tmpDir, `${prefix}_raw${i}.mp4`);
    const clipPath = path.join(tmpDir, `${prefix}_seg${clipPaths.length}.mp4`);
    const remaining = totalDur - clipPaths.reduce((s, c) => s + c.dur, 0);
    const segDur = Math.max(remaining, 5);

    let urlVideo = await buscarVideoPexels(query);
    if (!urlVideo) urlVideo = await buscarVideoPixabay(query);
    if (!urlVideo) urlVideo = await buscarVideoPixabay(keywords[0]); // retry com keyword principal

    if (urlVideo) {
      const downloaded = await baixarArquivo(urlVideo, rawPath);
      if (downloaded) {
        const ok = prepararClip(rawPath, clipPath, segDur);
        if (ok) clipPaths.push({ path: clipPath, dur: segDur });
        try { fs.unlinkSync(rawPath); } catch {}
      }
    }
  }

  // PASSO 4: Montar vídeo final com overlay de texto
  const tituloSafe = titulo.replace(/[':[\]\\]/g, " ").slice(0, 45);
  const hashSafe = hashtags.replace(/[':[\]\\]/g, " ").slice(0, 50);
  const precoSafe = `R$ ${produto.price}`;

  let ffmpegArgs;

  const overlayFilter = [
    // Gradiente topo (logo)
    `[vbase]drawbox=x=0:y=0:w=1080:h=280:color=black@0.80:t=fill[vtop]`,
    // Gradiente rodapé (preço + hashtags)
    `[vtop]drawbox=x=0:y=1580:w=1080:h=340:color=black@0.80:t=fill[vbox]`,
    // Logo VIRALIFY
    `[vbox]drawtext=text='VIRALIFY':fontsize=52:fontcolor=0xc084fc:x=(w-text_w)/2:y=30:font=DejaVu Sans:shadowcolor=black@0.9:shadowx=2:shadowy=2[vt1]`,
    // Título do produto
    `[vt1]drawtext=text='${tituloSafe}':fontsize=46:fontcolor=white:x=(w-text_w)/2:y=110:font=DejaVu Sans:shadowcolor=black@0.9:shadowx=2:shadowy=2[vt2]`,
    // Preço em verde destaque
    `[vt2]drawtext=text='${precoSafe}':fontsize=90:fontcolor=0x4ade80:x=(w-text_w)/2:y=1595:font=DejaVu Sans:shadowcolor=black@0.9:shadowx=3:shadowy=3[vt3]`,
    // Comissão
    `[vt3]drawtext=text='Comissao ${produto.commission}porcento p/ voce':fontsize=40:fontcolor=0xfbbf24:x=(w-text_w)/2:y=1720:font=DejaVu Sans:shadowcolor=black@0.8:shadowx=2:shadowy=2[vt4]`,
    // Hashtags
    `[vt4]drawtext=text='${hashSafe}':fontsize=32:fontcolor=0x93c5fd:x=(w-text_w)/2:y=1830:font=DejaVu Sans:shadowcolor=black@0.7:shadowx=1:shadowy=1[vfinal]`,
  ];

  if (clipPaths.length >= 2) {
    const inputs = clipPaths.flatMap(c => ["-i", c.path]);
    const concatIn = clipPaths.map((_, i) => `[${i}:v]`).join("");
    ffmpegArgs = [
      "-y",
      ...inputs,
      "-i", audioPath,
      "-filter_complex", [
        `${concatIn}concat=n=${clipPaths.length}:v=1:a=0[vbase]`,
        ...overlayFilter,
      ].join(";"),
      "-map", "[vfinal]", "-map", `${clipPaths.length}:a`,
      "-c:v", "libx264", "-preset", "ultrafast", "-crf", "26",
      "-c:a", "aac", "-b:a", "128k",
      "-shortest", "-r", "25", "-movflags", "+faststart",
      outputPath,
    ];
  } else if (clipPaths.length === 1) {
    ffmpegArgs = [
      "-y",
      "-stream_loop", "-1", "-i", clipPaths[0].path,
      "-i", audioPath,
      "-filter_complex", [
        `[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1[vbase]`,
        ...overlayFilter,
      ].join(";"),
      "-map", "[vfinal]", "-map", "1:a",
      "-c:v", "libx264", "-preset", "ultrafast", "-crf", "26",
      "-c:a", "aac", "-b:a", "128k",
      "-shortest", "-r", "25", "-movflags", "+faststart",
      outputPath,
    ];
  } else {
    // Fallback: fundo roxo sólido
    ffmpegArgs = [
      "-y",
      "-f", "lavfi", "-i", `color=c=0x1a0a2e:s=1080x1920:r=25`,
      "-i", audioPath,
      "-filter_complex", [
        `[0:v]drawbox=x=0:y=0:w=1080:h=1920:color=0x7c3aed@0.3:t=fill[vbase]`,
        ...overlayFilter,
      ].join(";"),
      "-map", "[vfinal]", "-map", "1:a",
      "-c:v", "libx264", "-preset", "ultrafast", "-crf", "28",
      "-c:a", "aac", "-b:a", "128k",
      "-shortest", "-r", "25", "-movflags", "+faststart",
      outputPath,
    ];
  }

  const r = spawnSync(FFMPEG, ffmpegArgs, {
    encoding: "utf8", maxBuffer: 100 * 1024 * 1024, timeout: 300000,
  });

  // Limpeza
  clipPaths.forEach(c => { try { fs.unlinkSync(c.path); } catch {} });
  if (productImgPath) { try { fs.unlinkSync(productImgPath); } catch {} }

  if (r.status !== 0) {
    console.error("FFmpeg stderr:", (r.stderr || "").slice(-800));
    // Fallback mínimo
    const fb = spawnSync(FFMPEG, [
      "-y", "-f", "lavfi", "-i", "color=c=0x1a0a2e:s=1080x1920:r=25",
      "-i", audioPath,
      "-c:v", "libx264", "-preset", "ultrafast", "-crf", "30",
      "-c:a", "aac", "-b:a", "96k",
      "-shortest", "-movflags", "+faststart", outputPath,
    ], { encoding: "utf8", maxBuffer: 30 * 1024 * 1024, timeout: 120000 });
    if (fb.status !== 0) throw new Error("FFmpeg falhou: " + (fb.stderr || "").slice(-400));
  }

  return outputPath;
}

module.exports = { gerarRoteiro, gerarAudio, gerarVideo };
