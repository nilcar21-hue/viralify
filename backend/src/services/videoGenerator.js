const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const FFMPEG = process.env.FFMPEG_PATH || "ffmpeg";
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || "TX3LPaxmHKxFdv7VOQHJ";
const PEXELS_KEY = process.env.PEXELS_API_KEY || "";
const PIXABAY_KEY = process.env.PIXABAY_API_KEY || "";

// ── ROTEIRO via Claude API (claude-sonnet-4-6) ──────────────────────────────
// Claude gera roteiros de influencer naturais, com persona variada e gancho forte
async function gerarRoteiro(produto) {
  const CLAUDE_KEY = process.env.ANTHROPIC_API_KEY;

  // Personas de influencer variadas para não soar sempre igual
  const personas = [
    { nome: "Lucas", estilo: "jovem entusiasta de tecnologia e gadgets, fala rápido, usa gírias como 'cara', 'demais', 'absurdo'" },
    { nome: "Ana", estilo: "mulher prática que economiza dinheiro, fala de custo-benefício, como se fosse uma dica de amiga próxima" },
    { nome: "Marcos", estilo: "homem de 35 anos que encontrou um negócio incrível, conta como descobriu, tom de quem está revelando segredo" },
    { nome: "Júlia", estilo: "influenciadora de lifestyle, fala de como o produto mudou a rotina dela, tom animado e próximo" },
  ];
  const persona = personas[Math.floor(Math.random() * personas.length)];

  const prompt = `Você é ${persona.nome}, ${persona.estilo}.

Crie um roteiro de vídeo de afiliado para TikTok/Reels que dure entre 28 e 38 segundos narrado em voz alta.

Produto: ${produto.title}
Preço: R$ ${produto.price}
Comissão que o afiliado ganha: ${produto.commission}%

REGRAS OBRIGATÓRIAS:
- GANCHO nos primeiros 3 segundos — uma frase que faz a pessoa parar o scroll (pergunta, revelação ou afirmação chocante)
- Fale o nome do produto de forma NATURAL, como quem já usa
- Mencione o preço de forma que pareça barato ou justo
- Inclua prova social (ex: "mais de X mil compras", "nota X estrelas", "todo mundo comprando")
- NUNCA use linguagem de vendedor — fale como amigo que está compartilhando uma descoberta
- Termine com "link na bio" de forma natural, não robótica
- Tom 100% coloquial, português brasileiro real, sem formalidade

FORMATO EXATO (respeite as labels):
TITULO: [título chamativo, máx 55 caracteres, pode usar número ou emoji]
ROTEIRO: [texto corrido para narrar, sem quebras de linha, entre 380 e 520 caracteres]
HASHTAGS: #tag1 #tag2 #tag3 #tag4 #tag5 #tag6`;

  // Tenta Claude primeiro (melhor qualidade)
  if (CLAUDE_KEY) {
    try {
      const { data } = await axios.post(
        "https://api.anthropic.com/v1/messages",
        {
          model: "claude-sonnet-4-6",
          max_tokens: 800,
          messages: [{ role: "user", content: prompt }],
        },
        {
          headers: {
            "x-api-key": CLAUDE_KEY,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
          },
          timeout: 25000,
        }
      );
      const texto = data.content?.[0]?.text || "";
      if (texto.includes("ROTEIRO:")) {
        console.log("  [Roteiro] Claude API OK");
        return texto;
      }
    } catch (e) {
      console.log("  [Roteiro] Claude falhou, usando Groq:", e.message?.slice(0, 80));
    }
  }

  // Fallback: Groq (llama-3.3-70b)
  const { default: Groq } = await import("groq-sdk").catch(() => ({ default: null }));
  const groqSdk = Groq ? new Groq({ apiKey: process.env.GROQ_API_KEY }) : null;
  if (groqSdk) {
    const completion = await groqSdk.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 800,
      temperature: 0.9,
    });
    return completion.choices[0].message.content;
  }
  throw new Error("Nenhum modelo de roteiro disponível");
}

// ── KEYWORDS para busca de vídeo de fundo ──────────────────────────────────
async function extrairKeywords(produto) {
  // Mapeamento direto por categoria de produto — rápido e preciso
  const t = produto.title.toLowerCase();
  const mapas = [
    [/(fone|headphone|earphone|airpod|earbuds|bluetooth.*audio)/i, ["wireless headphones lifestyle", "music listening person", "earbuds close up"]],
    [/(smartwatch|relógio inteligente|watch.*smart)/i, ["smartwatch wrist person", "fitness tracker running", "digital watch lifestyle"]],
    [/(câmera|camera|segurança.*câmera|cctv)/i, ["home security camera", "surveillance modern house", "smart home technology"]],
    [/(mouse.*gamer|gamer.*mouse|mouse.*rgb)/i, ["gaming mouse rgb desk", "gamer setup computer", "esports player hands"]],
    [/(teclado.*gamer|gamer.*teclado|keyboard.*rgb)/i, ["gaming keyboard rgb", "mechanical keyboard typing", "gamer desk setup"]],
    [/(air fryer|fritadeira.*ar|airfryer)/i, ["air fryer cooking food", "healthy meal preparation", "modern kitchen appliance"]],
    [/(aspirador.*robô|robô.*aspira|robot.*vacuum)/i, ["robot vacuum cleaner floor", "smart home cleaning", "robotic vacuum living room"]],
    [/(projetor|projector|mini.*projetor)/i, ["portable projector cinema", "movie night projection", "home theater projector"]],
    [/(carregador.*turbo|carregador.*rápido|fast.*charg)/i, ["fast charging phone cable", "usb charger technology", "smartphone charging desk"]],
    [/(mochila|backpack|bolsa.*notebook)/i, ["backpack lifestyle outdoor", "laptop bag person walking", "modern backpack student"]],
    [/(camiseta|camisa|roupa|vestuário|moda)/i, ["fashion clothing lifestyle", "model wearing outfit", "clothing style modern"]],
    [/(tênis|sapato|calçado|sneaker)/i, ["sneakers shoes lifestyle", "footwear fashion person", "running shoes close up"]],
    [/(perfume|colônia|fragrância)/i, ["perfume bottle luxury", "fragrance lifestyle", "scent beauty product"]],
    [/(celular|smartphone|iphone|samsung.*galaxy)/i, ["smartphone person using", "mobile phone lifestyle", "modern phone hands"]],
    [/(notebook|laptop|computador)/i, ["laptop working person", "computer desk setup", "laptop lifestyle coffee"]],
    [/(suplemento|whey|proteína|creatina)/i, ["fitness supplement gym", "protein shake workout", "gym muscle training"]],
    [/(livro|curso|treinamento|ebook)/i, ["book reading person", "online course learning", "study success education"]],
  ];

  for (const [regex, keywords] of mapas) {
    if (regex.test(t)) return keywords;
  }

  // Fallback: Groq extrai keywords do título
  try {
    const Groq = require("groq-sdk");
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const resp = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: `Product: "${produto.title}". Give me 3 English search terms for stock video footage showing this product in use. Reply ONLY the 3 terms separated by comma, no explanation.` }],
      max_tokens: 60, temperature: 0.2,
    });
    return resp.choices[0].message.content.trim().split(",").map(k => k.trim()).filter(Boolean).slice(0, 3);
  } catch {
    return ["product showcase lifestyle", "shopping ecommerce modern", "consumer product close up"];
  }
}

// ── BUSCA VÍDEOS DE STOCK ───────────────────────────────────────────────────
async function buscarVideoPexels(query) {
  if (!PEXELS_KEY) return null;
  try {
    const { data } = await axios.get(
      `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&orientation=portrait&size=medium&per_page=10`,
      { headers: { Authorization: PEXELS_KEY }, timeout: 10000 }
    );
    const videos = data.videos || [];
    // Prefere HD, aceita SD
    for (const v of videos) {
      const hd = v.video_files?.find(f => f.quality === "hd" && f.height >= 1080);
      const sd = v.video_files?.find(f => f.quality === "sd");
      const link = hd?.link || sd?.link;
      if (link) return link;
    }
    return null;
  } catch { return null; }
}

async function buscarVideoPixabay(query) {
  if (!PIXABAY_KEY) return null;
  try {
    const { data } = await axios.get(
      `https://pixabay.com/api/videos/?key=${PIXABAY_KEY}&q=${encodeURIComponent(query)}&video_type=film&per_page=5&min_height=720`,
      { timeout: 10000 }
    );
    const hits = data.hits || [];
    if (!hits.length) return null;
    return hits[0].videos?.large?.url || hits[0].videos?.medium?.url || hits[0].videos?.small?.url || null;
  } catch { return null; }
}

// ── DOWNLOAD DE ARQUIVO ─────────────────────────────────────────────────────
async function baixarArquivo(url, destPath) {
  try {
    const resp = await axios.get(url, {
      responseType: "arraybuffer",
      headers: { "User-Agent": "Mozilla/5.0 (compatible; Viralify/1.0)" },
      timeout: 30000,
      maxRedirects: 5,
    });
    const buf = Buffer.from(resp.data);
    if (buf.length < 5000) throw new Error("arquivo muito pequeno");
    fs.writeFileSync(destPath, buf);
    return true;
  } catch (e) {
    console.error("baixarArquivo falhou:", e.message);
    return false;
  }
}

// ── UTILIDADES FFmpeg ───────────────────────────────────────────────────────
function getAudioDuration(audioPath) {
  const probe = spawnSync(FFMPEG, ["-i", audioPath, "-f", "null", "-"], { encoding: "utf8", timeout: 15000 });
  const m = (probe.stderr || "").match(/Duration:\s*(\d+):(\d+):(\d+\.\d+)/);
  return m ? parseInt(m[1]) * 3600 + parseInt(m[2]) * 60 + parseFloat(m[3]) : 35;
}

function prepararClip(inputPath, outputPath, duracao) {
  const r = spawnSync(FFMPEG, [
    "-y", "-i", inputPath,
    "-vf", "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1",
    "-t", String(duracao), "-an",
    "-c:v", "libx264", "-preset", "fast", "-crf", "23", "-r", "30",
    outputPath,
  ], { encoding: "utf8", maxBuffer: 100 * 1024 * 1024, timeout: 120000 });
  return r.status === 0;
}

// Prepara imagem com Ken Burns (zoom in suave) — muito mais profissional que estático
function prepararImagemKenBurns(inputPath, outputPath, duracao) {
  const frames = duracao * 30;
  // Zoom in suave de 1.0 → 1.08 durante toda a duração
  const zoompan = `zoompan=z='min(zoom+0.0008,1.08)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=1080x1920:fps=30`;
  const r = spawnSync(FFMPEG, [
    "-y",
    "-loop", "1", "-t", String(duracao), "-i", inputPath,
    "-vf", `scale=1920:1920:force_original_aspect_ratio=increase,crop=1080:1920,${zoompan},setsar=1,format=yuv420p`,
    "-c:v", "libx264", "-preset", "fast", "-crf", "23", "-r", "30",
    outputPath,
  ], { encoding: "utf8", maxBuffer: 100 * 1024 * 1024, timeout: 180000 });
  if (r.status !== 0) {
    // Fallback sem zoompan se falhar (Railway pode ter limitações de memória)
    const r2 = spawnSync(FFMPEG, [
      "-y",
      "-loop", "1", "-t", String(duracao), "-i", inputPath,
      "-vf", "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,format=yuv420p",
      "-c:v", "libx264", "-preset", "fast", "-crf", "23", "-r", "30",
      outputPath,
    ], { encoding: "utf8", maxBuffer: 50 * 1024 * 1024, timeout: 60000 });
    return r2.status === 0;
  }
  return true;
}

// ── ÁUDIO via ElevenLabs ────────────────────────────────────────────────────
async function gerarAudio(texto, outputPath) {
  // Extrai só o ROTEIRO — remove labels e hashtags
  const textoLimpo = texto
    .replace(/TITULO:.*?\n/gi, "")
    .replace(/ROTEIRO:\s*/gi, "")
    .replace(/HASHTAGS:.*/gi, "")
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 900);

  const elevenKey = process.env.ELEVENLABS_API_KEY;
  if (elevenKey) {
    try {
      // eleven_multilingual_v2 — mais expressivo e emocional que turbo_v2_5, sem custo adicional
      const resp = await axios.post(
        `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
        {
          text: textoLimpo,
          model_id: "eleven_multilingual_v2",
          language_code: "pt",
          voice_settings: {
            stability: 0.35,        // Menos estável = mais expressivo/variado
            similarity_boost: 0.80,
            style: 0.45,            // Mais estilo = mais emoção e entonação
            use_speaker_boost: true,
          },
        },
        {
          headers: { "xi-api-key": elevenKey, "Content-Type": "application/json", "Accept": "audio/mpeg" },
          responseType: "arraybuffer",
          timeout: 40000,
        }
      );
      const buf = Buffer.from(resp.data);
      if (buf.length > 1000) {
        fs.writeFileSync(outputPath, buf);
        console.log(`  [Áudio] ElevenLabs multilingual_v2 OK — ${buf.length} bytes`);
        return outputPath;
      }
    } catch (e) {
      console.error("ElevenLabs multilingual_v2 falhou:", e.message);
      // Fallback para turbo_v2_5
      try {
        const resp2 = await axios.post(
          `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
          {
            text: textoLimpo,
            model_id: "eleven_turbo_v2_5",
            language_code: "pt",
            voice_settings: { stability: 0.4, similarity_boost: 0.85, style: 0.35, use_speaker_boost: true },
          },
          {
            headers: { "xi-api-key": elevenKey, "Content-Type": "application/json", "Accept": "audio/mpeg" },
            responseType: "arraybuffer",
            timeout: 30000,
          }
        );
        const buf2 = Buffer.from(resp2.data);
        if (buf2.length > 1000) {
          fs.writeFileSync(outputPath, buf2);
          console.log(`  [Áudio] ElevenLabs turbo_v2_5 fallback OK`);
          return outputPath;
        }
      } catch (e2) { console.error("ElevenLabs turbo_v2_5 fallback:", e2.message); }
    }
  }

  // Último fallback: silêncio
  spawnSync(FFMPEG, [
    "-y", "-f", "lavfi", "-i", "anullsrc=r=44100:cl=mono",
    "-t", "35", "-acodec", "libmp3lame", "-q:a", "9", outputPath,
  ], { timeout: 30000 });
  return outputPath;
}

// ── GERAÇÃO DE VÍDEO ────────────────────────────────────────────────────────
async function gerarVideo(roteiro, audioPath, produto, outputPath) {
  const titulo = roteiro.match(/TITULO:\s*(.+)/i)?.[1]?.trim() || produto.title;
  const hashtags = roteiro.match(/HASHTAGS:\s*(.+)/i)?.[1]?.trim() || "#afiliados #viral";
  const tmpDir = path.dirname(outputPath);
  const prefix = path.basename(outputPath, ".mp4") + "_tmp";

  const audioDur = getAudioDuration(audioPath);
  const totalDur = Math.ceil(audioDur) + 1;

  // ── ESTRATÉGIA DE VÍDEO ──
  // Se tem imagem do produto (upload do usuário ou thumbnail):
  //   → Imagem do produto ocupa 60% do tempo (com Ken Burns)
  //   → Vídeo de stock ocupa 40% restante como fundo
  // Se não tem imagem:
  //   → 2 vídeos de stock por keywords do produto

  let productImgPath = null;

  // Tenta usar imagem do produto (prioridade: foto enviada pelo usuário via base64 salva, ou thumbnail URL)
  if (produto.thumbnail && produto.thumbnail.startsWith("http")) {
    productImgPath = path.join(tmpDir, `${prefix}_product.jpg`);
    const ok = await baixarArquivo(produto.thumbnail, productImgPath);
    if (!ok) productImgPath = null;
  }

  const keywords = await extrairKeywords(produto);
  console.log(`  Keywords: ${keywords.join(", ")}`);

  const clipPaths = [];

  if (productImgPath) {
    // 60% do tempo = imagem do produto com Ken Burns
    const imgDur = Math.ceil(totalDur * 0.62);
    const imgVideoPath = path.join(tmpDir, `${prefix}_prodimg.mp4`);
    console.log("  Preparando imagem do produto com Ken Burns...");
    const ok = prepararImagemKenBurns(productImgPath, imgVideoPath, imgDur);
    if (ok) clipPaths.push({ path: imgVideoPath, dur: imgDur });

    // 40% restante = 1 vídeo de stock
    const remaining = totalDur - (ok ? imgDur : 0);
    const rawPath = path.join(tmpDir, `${prefix}_raw0.mp4`);
    const clipPath = path.join(tmpDir, `${prefix}_stock0.mp4`);
    let urlVideo = await buscarVideoPexels(keywords[0]);
    if (!urlVideo) urlVideo = await buscarVideoPixabay(keywords[0]);
    if (!urlVideo && keywords[1]) urlVideo = await buscarVideoPexels(keywords[1]);
    if (urlVideo) {
      const downloaded = await baixarArquivo(urlVideo, rawPath);
      if (downloaded) {
        const stockOk = prepararClip(rawPath, clipPath, Math.max(remaining, 5));
        if (stockOk) clipPaths.push({ path: clipPath, dur: Math.max(remaining, 5) });
        try { fs.unlinkSync(rawPath); } catch {}
      }
    }
  } else {
    // Sem imagem do produto: 2 vídeos de stock
    for (let i = 0; i < 2 && i < keywords.length; i++) {
      const rawPath = path.join(tmpDir, `${prefix}_raw${i}.mp4`);
      const clipPath = path.join(tmpDir, `${prefix}_stock${i}.mp4`);
      const remaining = totalDur - clipPaths.reduce((s, c) => s + c.dur, 0);
      const segDur = Math.max(i === 0 ? Math.ceil(totalDur * 0.55) : remaining, 5);

      let urlVideo = await buscarVideoPexels(keywords[i]);
      if (!urlVideo) urlVideo = await buscarVideoPixabay(keywords[i]);
      if (!urlVideo && i > 0) urlVideo = await buscarVideoPexels(keywords[0]);

      if (urlVideo) {
        const downloaded = await baixarArquivo(urlVideo, rawPath);
        if (downloaded) {
          const ok = prepararClip(rawPath, clipPath, segDur);
          if (ok) clipPaths.push({ path: clipPath, dur: segDur });
          try { fs.unlinkSync(rawPath); } catch {}
        }
      }
    }
  }

  // ── OVERLAY DE TEXTO ──
  // Texto seguro para FFmpeg (remove caracteres especiais)
  const safe = (s) => s.replace(/[':[\]\\%]/g, " ").replace(/\s+/g, " ").trim();
  const tituloSafe = safe(titulo).slice(0, 42);
  const hashSafe = safe(hashtags).slice(0, 55);
  const precoSafe = `R$ ${produto.price}`;
  const comissaoSafe = `${produto.commission}% de comissao p/ voce`;

  // Layout profissional:
  // TOPO: faixa escura com logo VIRALIFY + título
  // CENTRO: imagem/vídeo do produto em destaque
  // RODAPÉ: faixa escura com preço em verde + comissão + hashtags
  const overlayFilter = [
    `[vbase]drawbox=x=0:y=0:w=iw:h=220:color=black@0.85:t=fill[vtop]`,
    `[vtop]drawbox=x=0:y=ih-300:w=iw:h=300:color=black@0.85:t=fill[vbox]`,
    `[vbox]drawtext=text='VIRALIFY':fontsize=42:fontcolor=0xc084fc:x=(w-text_w)/2:y=18:font=DejaVu Sans Bold:shadowcolor=black@0.95:shadowx=2:shadowy=2[vl]`,
    `[vl]drawtext=text='${tituloSafe}':fontsize=40:fontcolor=white:x=(w-text_w)/2:y=78:font=DejaVu Sans:shadowcolor=black@0.95:shadowx=2:shadowy=2[vt]`,
    `[vt]drawtext=text='${precoSafe}':fontsize=88:fontcolor=0x4ade80:x=(w-text_w)/2:y=ih-285:font=DejaVu Sans Bold:shadowcolor=black@0.95:shadowx=3:shadowy=3[vp]`,
    `[vp]drawtext=text='${comissaoSafe}':fontsize=36:fontcolor=0xfbbf24:x=(w-text_w)/2:y=ih-185:font=DejaVu Sans:shadowcolor=black@0.9:shadowx=2:shadowy=2[vc]`,
    `[vc]drawtext=text='${hashSafe}':fontsize=28:fontcolor=0x93c5fd:x=(w-text_w)/2:y=ih-138:font=DejaVu Sans:shadowcolor=black@0.8:shadowx=1:shadowy=1[vfinal]`,
  ];

  // Qualidade melhorada: preset "fast" (melhor compressão que "ultrafast") e crf 22
  const encodeArgs = ["-c:v", "libx264", "-preset", "fast", "-crf", "22", "-c:a", "aac", "-b:a", "160k", "-shortest", "-r", "30", "-movflags", "+faststart"];

  let ffmpegArgs;

  if (clipPaths.length >= 2) {
    const inputs = clipPaths.flatMap(c => ["-i", c.path]);
    const concatIn = clipPaths.map((_, i) => `[${i}:v]`).join("");
    ffmpegArgs = [
      "-y", ...inputs, "-i", audioPath,
      "-filter_complex", [`${concatIn}concat=n=${clipPaths.length}:v=1:a=0[vbase]`, ...overlayFilter].join(";"),
      "-map", "[vfinal]", "-map", `${clipPaths.length}:a`,
      ...encodeArgs, outputPath,
    ];
  } else if (clipPaths.length === 1) {
    ffmpegArgs = [
      "-y", "-stream_loop", "-1", "-i", clipPaths[0].path, "-i", audioPath,
      "-filter_complex", [`[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1[vbase]`, ...overlayFilter].join(";"),
      "-map", "[vfinal]", "-map", "1:a",
      ...encodeArgs, outputPath,
    ];
  } else {
    // Fallback: gradiente animado (mais bonito que cor sólida)
    ffmpegArgs = [
      "-y",
      "-f", "lavfi", "-i", "color=c=0x0f0628:s=1080x1920:r=30",
      "-i", audioPath,
      "-filter_complex", [
        `[0:v]drawbox=x=0:y=0:w=1080:h=1920:color=0x7c3aed@0.25:t=fill[vbase]`,
        ...overlayFilter,
      ].join(";"),
      "-map", "[vfinal]", "-map", "1:a",
      ...encodeArgs, outputPath,
    ];
  }

  console.log(`  FFmpeg: ${clipPaths.length} clips | produto_img=${!!productImgPath} | dur=${totalDur}s`);
  console.log(`  Áudio: ${fs.existsSync(audioPath) ? fs.statSync(audioPath).size : 0} bytes`);

  const r = spawnSync(FFMPEG, ffmpegArgs, {
    encoding: "utf8", maxBuffer: 150 * 1024 * 1024, timeout: 360000,
  });

  clipPaths.forEach(c => { try { fs.unlinkSync(c.path); } catch {} });
  if (productImgPath) { try { fs.unlinkSync(productImgPath); } catch {} }

  console.log(`  FFmpeg status: ${r.status} | error: ${r.error?.message || "none"}`);
  if (r.stderr && r.status !== 0) console.error("FFmpeg stderr:", r.stderr.slice(-800));

  if (r.status !== 0 || r.error) {
    // Fallback limpo: só fundo + áudio + overlays básicos
    const fb = spawnSync(FFMPEG, [
      "-y", "-f", "lavfi", "-i", "color=c=0x0f0628:s=1080x1920:r=30",
      "-i", audioPath,
      "-filter_complex",
      `[0:v]drawbox=x=0:y=0:w=1080:h=1920:color=0x7c3aed@0.2:t=fill,drawtext=text='${tituloSafe}':fontsize=52:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2:font=DejaVu Sans:shadowcolor=black@0.9:shadowx=2:shadowy=2[vfinal]`,
      "-map", "[vfinal]", "-map", "1:a",
      "-c:v", "libx264", "-preset", "ultrafast", "-crf", "28",
      "-c:a", "aac", "-b:a", "128k", "-shortest", "-movflags", "+faststart", outputPath,
    ], { encoding: "utf8", maxBuffer: 50 * 1024 * 1024, timeout: 120000 });

    if (fb.status !== 0 || fb.error) {
      throw new Error(`FFmpeg falhou: ${r.error?.message || r.stderr?.slice(-200) || "erro desconhecido"}`);
    }
    console.log("  FFmpeg fallback OK");
  }

  return outputPath;
}

module.exports = { gerarRoteiro, gerarAudio, gerarVideo };
