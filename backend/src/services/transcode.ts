import { promises as fs } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { randomUUID } from "crypto";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";

if (ffmpegPath) ffmpeg.setFfmpegPath(ffmpegPath as string);

export async function oggFileToWav(file: File): Promise<File> {
  // write input to temp
  const inPath = join(tmpdir(), `${randomUUID()}.ogg`);
  const outPath = join(tmpdir(), `${randomUUID()}.wav`);

  const inBuf = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(inPath, inBuf);

  await new Promise<void>((resolve, reject) => {
    ffmpeg(inPath)
      .noVideo()
      // robust, whisper-friendly settings
      .audioCodec("pcm_s16le")
      .audioChannels(1)
      .audioFrequency(16000)    
      .format("wav")
      .on("end", () => resolve())
      .on("error", (err) => reject(err))
      .save(outPath);
  });

  const outBuf = await fs.readFile(outPath);

  // cleanup best-effort
  fs.unlink(inPath).catch(() => {});
  fs.unlink(outPath).catch(() => {});

  // File expects BlobParts; wrap Buffer
  return new File([new Uint8Array(outBuf)], "voice.wav", { type: "audio/wav" });
}
