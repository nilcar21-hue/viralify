const { spawnSync } = require("child_process");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

const FFMPEG = process.env.FFMPEG_PATH || "ffmpeg";
const ELEVENLABS_KEY = process.env.ELEVENLABS_API_KEY;
const PEXELS_KEY = process.env.PEXELS_API_KEY;

const VOICE_ID = "pNInz6obpgDQGcFmaJgB";

// Cada segmento tem: texto narrado + keyword para busca de imagem no Pexels
// A imagem será exatamente o que o narrador está dizendo naquele momento
const VSL_SEGMENTS = [
  // GANCHO
  { text: "E se você pudesse ganhar comissões no Mercado Livre todos os dias...", keyword: "money online earning" },
  { text: "sem gravar vídeo, sem aparecer na câmera, e sem saber editar?", keyword: "person relaxing laptop home" },

  // PROVA SOCIAL
  { text: "Isso não é promessa vazia. Mais de três mil pessoas já estão fazendo exatamente isso agora mesmo.", keyword: "crowd people success celebration" },
  { text: "E eu vou te mostrar como em menos de dois minutos.", keyword: "clock time fast" },

  // DOR
  { text: "O problema é que a maioria das pessoas desiste de ser afiliada porque criar conteúdo é difícil demais.", keyword: "frustrated person computer stress" },
  { text: "Roteiro, câmera, iluminação, edição... horas de trabalho pra um vídeo que talvez nem performe.", keyword: "video editing studio camera" },

  // AGITAÇÃO
  { text: "E sem vídeo, você simplesmente não aparece.", keyword: "invisible hidden shadow dark" },
  { text: "O algoritmo do TikTok, do YouTube Shorts, do Instagram... tudo favorece quem posta vídeo.", keyword: "social media tiktok instagram phone" },
  { text: "Quem não posta fica invisível.", keyword: "empty street lonely person" },

  // SOLUÇÃO
  { text: "Apresentando a Viralify.", keyword: "artificial intelligence technology glow" },
  { text: "A inteligência artificial que transforma qualquer link de produto em um vídeo viral completo", keyword: "ai robot automation digital" },
  { text: "com roteiro, narração profissional e edição cinematográfica — em menos de 60 segundos.", keyword: "fast speed technology processing" },

  // COMO FUNCIONA
  { text: "É simples assim: você cola o link do produto do Mercado Livre.", keyword: "ecommerce shopping online marketplace" },
  { text: "A IA cria o roteiro viral em português.", keyword: "writing script artificial intelligence" },
  { text: "A narração soa como um locutor profissional.", keyword: "microphone podcast recording studio" },
  { text: "E o vídeo fica pronto para TikTok, YouTube Shorts e Instagram Reels.", keyword: "smartphone vertical video social media" },

  // PROVA — DEPOIMENTOS
  { text: "O Lucas estava desempregado há seis meses. Com a Viralify, ele publica cinco vídeos por dia sem aparecer na câmera", keyword: "happy man phone content creator" },
  { text: "e hoje faz quatro mil e oitocentos reais por mês de comissão.", keyword: "money cash income success" },
  { text: "A Camila saiu do emprego CLT em noventa dias.", keyword: "woman freedom laptop working home" },
  { text: "O Rafael teve dois milhões de views em três semanas.", keyword: "viral video views analytics chart" },

  // OBJEÇÕES
  { text: "Funciona para Mercado Livre, Shopee, Amazon, qualquer marketplace.", keyword: "ecommerce marketplace multiple platforms" },
  { text: "Você não precisa de câmera, de equipamento caro, de experiência com edição, nem de aparecer em nenhum momento.", keyword: "no camera simple easy smartphone" },

  // OFERTA
  { text: "E o melhor: você começa hoje, de graça. Três vídeos completos sem cartão de crédito.", keyword: "free gift offer green checkmark" },
  { text: "Se não funcionar, não paga absolutamente nada. Sem risco, sem pegadinha.", keyword: "guarantee shield security trust" },

  // CTA
  { text: "Clica no link abaixo agora, cria sua conta grátis e gera seu primeiro vídeo viral em menos de sessenta segundos.", keyword: "click button call to action signup" },
  { text: "Mais de três mil afiliados já começaram — agora é a sua vez.", keyword: "join community success group team" },
];

// Cache de imagens já buscadas nesta execução (evita hits duplicados na API)
const imageCache = {};

async function fetchPexelsImage(keyword, index) {
  const cacheKey = keyword;
  if (imageCache[cacheKey]) return imageCache[cacheKey];

  try {
    const query = encodeURIComponent(keyword);
    const { data } = await axios.get(
      `https://api.pexels.com/v1/search?query=${query}&per_page=5&orientation=landscape`,
      { headers: { Authorization: PEXELS_KEY }, timeout: 10000 }
    );
    if (data.photos && data.photos.length > 0) {
      const photo = data.photos[index % data.photos.length];
      const url = photo.src.original || photo.src.large2x;
      imageCache[cacheKey] = url;
      return url;
    }
  } catch (e) {
    console.warn(`  Pexels falhou para "${keyword}": ${e.message} — usando fallback`);
  }

  // Fallback: imagem genérica de tecnologia
  const fallbacks = [
    "https://images.pexels.com/photos/8386440/pexels-photo-8386440.jpeg",
    "https://images.pexels.com/photos/5632399/pexels-photo-5632399.jpeg",
    "https://images.pexels.com/photos/4386431/pexels-photo-4386431.jpeg",
  ];
  return fallbacks[index % fallbacks.length];
}

async function downloadImage(url, destPath) {
  const finalUrl = url.includes("pexels.com") && !url.includes("?")
    ? `${url}?auto=compress&cs=tinysrgb&w=1920&h=1080&fit=crop`
    : url;

  const resp = await axios.get(finalUrl, {
    responseType: "arraybuffer",
    headers: { "User-Agent": "Mozilla/5.0 (compatible; Viralify/1.0)" },
    timeout: 20000,
  });
  if (!resp.data || resp.data.byteLength < 100) throw new Error(`Imagem vazia: ${url}`);
  fs.writeFileSync(destPath, Buffer.from(resp.data));
}

async function generateAudio(text, outputPath) {
  const resp = await axios.post(
    `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
    {
      text,
      model_id: "eleven_turbo_v2_5",
      language_code: "pt",
      voice_settings: { stability: 0.35, similarity_boost: 0.75, style: 0.4, use_speaker_boost: true },
    },
    {
      headers: { "xi-api-key": ELEVENLABS_KEY, "Content-Type": "application/json", "Accept": "audio/mpeg" },
      responseType: "arraybuffer",
      timeout: 30000,
    }
  );
  const buf = Buffer.from(resp.data);
  if (buf.length < 1000) throw new Error("Áudio muito pequeno — ElevenLabs falhou");
  fs.writeFileSync(outputPath, buf);
}

function getAudioDuration(audPath, fallback = 4) {
  const probe = spawnSync(FFMPEG, ["-i", audPath, "-f", "null", "-"], {
    encoding: "utf8", timeout: 15000,
  });
  const m = (probe.stderr || "").match(/Duration:\s*(\d+):(\d+):(\d+\.\d+)/);
  return m
    ? parseInt(m[1]) * 3600 + parseInt(m[2]) * 60 + parseFloat(m[3])
    : fallback;
}

async function generateVSL(outputDir, outputPath) {
  fs.mkdirSync(outputDir, { recursive: true });

  console.log(`VSL: ${VSL_SEGMENTS.length} segmentos sincronizados — buscando imagens e gerando áudios...`);

  const segments = [];

  for (let i = 0; i < VSL_SEGMENTS.length; i++) {
    const seg = VSL_SEGMENTS[i];
    const imgPath = path.join(outputDir, `seg_${i}.jpg`);
    const audPath = path.join(outputDir, `seg_${i}.mp3`);
    const vidPath = path.join(outputDir, `seg_${i}.mp4`);

    console.log(`  [${i + 1}/${VSL_SEGMENTS.length}] "${seg.keyword}" → baixando imagem...`);
    const imgUrl = await fetchPexelsImage(seg.keyword, i);
    await downloadImage(imgUrl, imgPath);

    console.log(`  [${i + 1}/${VSL_SEGMENTS.length}] gerando áudio: "${seg.text.slice(0, 50)}..."`);
    await generateAudio(seg.text, audPath);

    segments.push({ imgPath, audPath, vidPath });
  }

  console.log("VSL: renderizando segmentos com FFmpeg...");

  for (let i = 0; i < segments.length; i++) {
    const { imgPath, audPath, vidPath } = segments[i];
    const audioDur = getAudioDuration(audPath);
    const segDur = audioDur + 0.3; // 300ms de respiro entre segmentos
    const frames = Math.round(segDur * 25);

    // Ken Burns: alterna direção para criar movimento natural
    const directions = [
      // zoom in centro
      { z: `min(zoom+0.0005,1.05)`, x: `iw/2-(iw/zoom/2)`, y: `ih/2-(ih/zoom/2)` },
      // zoom in canto superior esquerdo → centro
      { z: `min(zoom+0.0005,1.05)`, x: `iw/4-(iw/zoom/2)`, y: `ih/4-(ih/zoom/2)` },
      // zoom out
      { z: `if(eq(on,1),1.05,max(zoom-0.0005,1.0))`, x: `iw/2-(iw/zoom/2)`, y: `ih/2-(ih/zoom/2)` },
      // pan direita
      { z: `1.04`, x: `(iw/2-(iw/zoom/2))*(on/${frames})`, y: `ih/2-(ih/zoom/2)` },
      // pan esquerda
      { z: `1.04`, x: `iw/2-(iw/zoom/2)-(iw/2-(iw/zoom/2))*(on/${frames})`, y: `ih/2-(ih/zoom/2)` },
    ];
    const d = directions[i % directions.length];

    const r = spawnSync(FFMPEG, [
      "-y",
      "-loop", "1", "-t", String(segDur), "-i", imgPath,
      "-i", audPath,
      "-filter_complex",
      `[0:v]scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,` +
      `zoompan=z='${d.z}':d=${frames}:x='${d.x}':y='${d.y}':s=1920x1080:fps=25,` +
      `format=yuv420p[v]`,
      "-map", "[v]", "-map", "1:a",
      "-c:v", "libx264", "-preset", "ultrafast", "-crf", "26",
      "-c:a", "aac", "-b:a", "128k",
      "-shortest", "-r", "25",
      vidPath,
    ], { encoding: "utf8", maxBuffer: 50 * 1024 * 1024, timeout: 180000 });

    if (r.status !== 0) {
      throw new Error(`FFmpeg segmento ${i + 1} falhou: ${(r.stderr || "").slice(-400)}`);
    }

    console.log(`  Segmento ${i + 1} ok (${segDur.toFixed(1)}s)`);
  }

  console.log("VSL: concatenando todos os segmentos...");
  const listPath = path.join(outputDir, "concat.txt");
  fs.writeFileSync(listPath, segments.map(s => `file '${s.vidPath.replace(/\\/g, "/")}'`).join("\n"));

  const concat = spawnSync(FFMPEG, [
    "-y", "-f", "concat", "-safe", "0", "-i", listPath,
    "-c:v", "libx264", "-preset", "medium", "-crf", "23",
    "-c:a", "aac", "-b:a", "192k",
    "-movflags", "+faststart",
    "-pix_fmt", "yuv420p",
    outputPath,
  ], { encoding: "utf8", maxBuffer: 200 * 1024 * 1024, timeout: 600000 });

  if (concat.status !== 0) {
    throw new Error(`FFmpeg concat falhou: ${(concat.stderr || "").slice(-400)}`);
  }

  // Limpeza
  segments.forEach(s => {
    [s.imgPath, s.audPath, s.vidPath].forEach(f => { try { fs.unlinkSync(f); } catch {} });
  });
  try { fs.unlinkSync(listPath); } catch {}

  console.log("VSL gerada com sucesso:", outputPath);
  return outputPath;
}

module.exports = { generateVSL };
