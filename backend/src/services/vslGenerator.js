const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const FFMPEG = process.env.FFMPEG_PATH || "ffmpeg";
const ELEVENLABS_KEY = process.env.ELEVENLABS_API_KEY;

// Voz masculina jovem — Adam (ElevenLabs)
const VOICE_ID = "pNInz6obpgDQGcFmaJgB";

// Roteiro VSL Viralify — ~2 minutos, 10 cenas, alta conversão
// Estrutura: Gancho → Dor → Agitação → Solução → Prova → Oferta → Urgência → CTA
const VSL_SCENES = [
  {
    text: "E se você pudesse ganhar comissões no Mercado Livre todos os dias... sem gravar vídeo, sem aparecer na câmera, e sem saber editar?",
    image: "https://images.pexels.com/photos/4386431/pexels-photo-4386431.jpeg",
    duration: 8,
  },
  {
    text: "Isso não é promessa vazia. Mais de três mil pessoas já estão fazendo exatamente isso agora mesmo. E eu vou te mostrar como em menos de dois minutos.",
    image: "https://images.pexels.com/photos/7567434/pexels-photo-7567434.jpeg",
    duration: 9,
  },
  {
    text: "O problema é que a maioria das pessoas desiste de ser afiliada porque criar conteúdo é difícil demais. Roteiro, câmera, iluminação, edição... horas de trabalho pra um vídeo que talvez nem performe.",
    image: "https://images.pexels.com/photos/3758105/pexels-photo-3758105.jpeg",
    duration: 12,
  },
  {
    text: "E sem vídeo, você simplesmente não aparece. O algoritmo do TikTok, do YouTube Shorts, do Instagram... tudo favorece quem posta vídeo. Quem não posta fica invisível.",
    image: "https://images.pexels.com/photos/6476808/pexels-photo-6476808.jpeg",
    duration: 11,
  },
  {
    text: "Apresentando a Viralify. A inteligência artificial que transforma qualquer link de produto em um vídeo viral completo — com roteiro, narração profissional e edição cinematográfica — em menos de 60 segundos.",
    image: "https://images.pexels.com/photos/8386440/pexels-photo-8386440.jpeg",
    duration: 14,
  },
  {
    text: "É simples assim: você cola o link do produto do Mercado Livre. A IA cria o roteiro viral em português. A narração soa como um locutor profissional. E o vídeo fica pronto para TikTok, YouTube Shorts e Instagram Reels.",
    image: "https://images.pexels.com/photos/5632399/pexels-photo-5632399.jpeg",
    duration: 14,
  },
  {
    text: "O Lucas estava desempregado há seis meses. Com a Viralify, ele publica cinco vídeos por dia sem aparecer na câmera e hoje faz quatro mil e oitocentos reais por mês de comissão. A Camila saiu do emprego CLT em noventa dias. O Rafael teve dois milhões de views em três semanas.",
    image: "https://images.pexels.com/photos/4386373/pexels-photo-4386373.jpeg",
    duration: 16,
  },
  {
    text: "Funciona para Mercado Livre, Shopee, Amazon, qualquer marketplace. Você não precisa de câmera, de equipamento caro, de experiência com edição, nem de aparecer em nenhum momento.",
    image: "https://images.pexels.com/photos/6347888/pexels-photo-6347888.jpeg",
    duration: 12,
  },
  {
    text: "E o melhor: você começa hoje, de graça. Três vídeos completos sem cartão de crédito. Se não funcionar, não paga absolutamente nada. Sem risco, sem pegadinha.",
    image: "https://images.pexels.com/photos/4386442/pexels-photo-4386442.jpeg",
    duration: 11,
  },
  {
    text: "Clica no link abaixo agora, cria sua conta grátis e gera seu primeiro vídeo viral em menos de sessenta segundos. Mais de três mil afiliados já começaram — agora é a sua vez.",
    image: "https://images.pexels.com/photos/4050315/pexels-photo-4050315.jpeg",
    duration: 11,
  },
];

async function downloadImage(url, destPath) {
  const res = await fetch(url + "?auto=compress&cs=tinysrgb&w=1920&h=1080&fit=crop", {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; Viralify/1.0)" },
  });
  if (!res.ok) throw new Error(`Imagem falhou: ${url} — ${res.status}`);
  const buf = await res.arrayBuffer();
  fs.writeFileSync(destPath, Buffer.from(buf));
}

async function generateAudio(text, outputPath) {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
    method: "POST",
    headers: {
      "xi-api-key": ELEVENLABS_KEY,
      "Content-Type": "application/json",
      "Accept": "audio/mpeg",
    },
    body: JSON.stringify({
      text,
      model_id: "eleven_turbo_v2_5",
      language_code: "pt",
      voice_settings: { stability: 0.35, similarity_boost: 0.75, style: 0.4, use_speaker_boost: true },
    }),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`ElevenLabs erro ${res.status}: ${err.slice(0, 200)}`);
  }
  const buf = await res.arrayBuffer();
  if (buf.byteLength < 1000) throw new Error("Áudio muito pequeno — ElevenLabs falhou");
  fs.writeFileSync(outputPath, Buffer.from(buf));
}

function getAudioDuration(audPath, fallback) {
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

  console.log("VSL: baixando imagens e gerando áudios...");

  const scenes = [];
  for (let i = 0; i < VSL_SCENES.length; i++) {
    const scene = VSL_SCENES[i];
    const imgPath = path.join(outputDir, `scene_${i}.jpg`);
    const audPath = path.join(outputDir, `scene_${i}.mp3`);
    const vidPath = path.join(outputDir, `scene_${i}.mp4`);

    console.log(`  Cena ${i + 1}/${VSL_SCENES.length}: baixando imagem...`);
    await downloadImage(scene.image, imgPath);

    console.log(`  Cena ${i + 1}/${VSL_SCENES.length}: gerando áudio...`);
    await generateAudio(scene.text, audPath);

    scenes.push({ imgPath, audPath, vidPath, duration: scene.duration });
  }

  console.log("VSL: montando cenas com FFmpeg (16:9, 1920x1080)...");
  for (let i = 0; i < scenes.length; i++) {
    const { imgPath, audPath, vidPath, duration } = scenes[i];
    console.log(`  Renderizando cena ${i + 1}...`);

    const audioDur = getAudioDuration(audPath, duration);
    const sceneDur = Math.ceil(audioDur) + 0.5;
    const frames = Math.round(sceneDur * 25);

    // Ken Burns suave: zoom in nas cenas pares, zoom out nas ímpares
    const zoomExpr = i % 2 === 0
      ? `min(zoom+0.0006,1.06)`
      : `if(eq(on,1),1.06,max(zoom-0.0006,1.0))`;

    const r = spawnSync(FFMPEG, [
      "-y",
      "-loop", "1", "-t", String(sceneDur), "-i", imgPath,
      "-i", audPath,
      "-filter_complex",
      `[0:v]scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,` +
      `zoompan=z='${zoomExpr}':d=${frames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1920x1080:fps=25,` +
      `format=yuv420p[v]`,
      "-map", "[v]", "-map", "1:a",
      "-c:v", "libx264", "-preset", "ultrafast", "-crf", "26",
      "-c:a", "aac", "-b:a", "128k",
      "-shortest", "-r", "25",
      vidPath,
    ], { encoding: "utf8", maxBuffer: 50 * 1024 * 1024, timeout: 180000 });

    if (r.status !== 0) {
      throw new Error(`FFmpeg cena ${i + 1} falhou: ${(r.stderr || "").slice(-400)}`);
    }
  }

  console.log("VSL: concatenando cenas...");
  const listPath = path.join(outputDir, "concat.txt");
  fs.writeFileSync(listPath, scenes.map(s => `file '${s.vidPath.replace(/\\/g, "/")}'`).join("\n"));

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

  scenes.forEach(s => {
    [s.imgPath, s.audPath, s.vidPath].forEach(f => {
      try { fs.unlinkSync(f); } catch {}
    });
  });
  try { fs.unlinkSync(listPath); } catch {}

  console.log("VSL gerada com sucesso:", outputPath);
  return outputPath;
}

module.exports = { generateVSL };
