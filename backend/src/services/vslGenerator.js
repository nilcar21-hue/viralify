const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const FFMPEG = process.env.FFMPEG_PATH || "ffmpeg";
const ELEVENLABS_KEY = process.env.ELEVENLABS_API_KEY;

// Voz masculina jovem — Adam (ElevenLabs)
const VOICE_ID = "pNInz6obpgDQGcFmaJgB"; // Adam — jovem, masculino, energético

// Roteiro VSL Viralify — 90 segundos, 7 cenas
const VSL_SCENES = [
  {
    text: "E se eu te dissesse que dá pra ganhar comissão no Mercado Livre... sem gravar vídeo, sem aparecer na câmera, e sem saber editar nada?",
    image: "https://images.pexels.com/photos/4386431/pexels-photo-4386431.jpeg", // pessoa no celular vendo dinheiro
    duration: 8,
  },
  {
    text: "A maioria das pessoas desiste de ser afiliada porque criar conteúdo dá muito trabalho. Roteiro, gravação, edição... horas perdidas pra um vídeo só.",
    image: "https://images.pexels.com/photos/3758105/pexels-photo-3758105.jpeg", // pessoa frustrada no computador
    duration: 10,
  },
  {
    text: "Apresentando a Viralify. Você cola o link do produto. A inteligência artificial cria o roteiro viral em português.",
    image: "https://images.pexels.com/photos/8386440/pexels-photo-8386440.jpeg", // tela de IA / tecnologia
    duration: 9,
  },
  {
    text: "A narração fica incrível — parece locutor profissional. E o vídeo fica pronto para TikTok, YouTube e Shopee em menos de 60 segundos.",
    image: "https://images.pexels.com/photos/6476808/pexels-photo-6476808.jpeg", // pessoa assistindo tiktok
    duration: 10,
  },
  {
    text: "Criadores como o Lucas estão fazendo quatro mil e oitocentos reais por mês. A Camila publica cinco vídeos por dia sem aparecer. O Rafael teve dois milhões de views em três semanas.",
    image: "https://images.pexels.com/photos/7567434/pexels-photo-7567434.jpeg", // pessoa feliz com celular / sucesso
    duration: 14,
  },
  {
    text: "Funciona para Mercado Livre, Shopee, Amazon, qualquer marketplace. Você não precisa de câmera, de equipamento, nem de experiência.",
    image: "https://images.pexels.com/photos/5632399/pexels-photo-5632399.jpeg", // produtos e-commerce
    duration: 10,
  },
  {
    text: "Você começa grátis hoje. Três vídeos sem cartão de crédito. Se não funcionar, não paga nada. Clica no link abaixo e gera seu primeiro vídeo agora.",
    image: "https://images.pexels.com/photos/4386373/pexels-photo-4386373.jpeg", // celular com app / call to action
    duration: 10,
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

async function generateVSL(outputDir, outputPath) {
  fs.mkdirSync(outputDir, { recursive: true });

  console.log("VSL: baixando imagens e gerando áudios...");

  // 1. Baixar imagens e gerar áudios em paralelo
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

  // 2. Montar cada cena: imagem + áudio + zoom lento (Ken Burns effect)
  console.log("VSL: montando cenas com FFmpeg...");
  for (let i = 0; i < scenes.length; i++) {
    const { imgPath, audPath, vidPath, duration } = scenes[i];
    console.log(`  Renderizando cena ${i + 1}...`);

    // Pega duração real do áudio
    const probe = spawnSync(FFMPEG, [
      "-i", audPath, "-f", "null", "-"
    ], { encoding: "utf8", timeout: 15000 });
    const durMatch = (probe.stderr || "").match(/Duration:\s*(\d+):(\d+):(\d+\.\d+)/);
    const audioDur = durMatch
      ? parseInt(durMatch[1]) * 3600 + parseInt(durMatch[2]) * 60 + parseFloat(durMatch[3])
      : duration;
    const sceneDur = Math.ceil(audioDur) + 0.5;

    const r = spawnSync(FFMPEG, [
      "-y",
      "-loop", "1", "-t", String(sceneDur), "-i", imgPath,
      "-i", audPath,
      "-filter_complex",
      `[0:v]scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,zoompan=z='min(zoom+0.0008,1.08)':d=${Math.round(sceneDur * 25)}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1920x1080:fps=25[v]`,
      "-map", "[v]", "-map", "1:a",
      "-c:v", "libx264", "-preset", "ultrafast", "-crf", "28",
      "-c:a", "aac", "-b:a", "128k",
      "-shortest", "-r", "25",
      vidPath,
    ], { encoding: "utf8", maxBuffer: 50 * 1024 * 1024, timeout: 120000 });

    if (r.status !== 0) {
      throw new Error(`FFmpeg cena ${i + 1} falhou: ${(r.stderr || "").slice(-400)}`);
    }
  }

  // 3. Concatenar todas as cenas
  console.log("VSL: concatenando cenas...");
  const listPath = path.join(outputDir, "concat.txt");
  fs.writeFileSync(listPath, scenes.map(s => `file '${s.vidPath.replace(/\\/g, "/")}'`).join("\n"));

  const concat = spawnSync(FFMPEG, [
    "-y", "-f", "concat", "-safe", "0", "-i", listPath,
    "-c:v", "libx264", "-preset", "ultrafast", "-crf", "26",
    "-c:a", "aac", "-b:a", "128k",
    "-movflags", "+faststart",
    outputPath,
  ], { encoding: "utf8", maxBuffer: 100 * 1024 * 1024, timeout: 300000 });

  if (concat.status !== 0) {
    throw new Error(`FFmpeg concat falhou: ${(concat.stderr || "").slice(-400)}`);
  }

  // 4. Limpeza dos arquivos temporários
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
