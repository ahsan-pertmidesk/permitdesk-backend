import axios from "axios";

/**
 * Download a Twilio media URL as a proper File.
 * Do NOT open media URLs in the browser (they require Basic Auth).
 */
export async function downloadTwilioMediaAsFile(
  url: string,
  declaredType?: string,
  fallbackName = "voice.ogg"
): Promise<File> {
  // optional: some environments need the explicit download flag
  const dlUrl = url.includes("?") ? url : `${url}?Download=1`;

  const resp = await axios.get<ArrayBuffer>(dlUrl, {
    responseType: "arraybuffer",
    auth: {
      username: process.env.TWILIO_ACCOUNT_SID as string,
      password: process.env.TWILIO_AUTH_TOKEN as string,
    },
    // avoid compression issues
    decompress: true,
    headers: {
      // Twilio will set the right content-type; declaredType is our fallback
      Accept: "*/*",
    },
    // follow redirects to Twilio’s CDN
    maxRedirects: 5,
    validateStatus: (s) => s >= 200 && s < 400, // allow 302s
  });

  const type =
    (declaredType || (resp.headers["content-type"] as string) || "audio/ogg")
      .split(";")[0]
      .trim();

  const buf = Buffer.from(resp.data as any);
  if (process.env.NODE_ENV !== "production") {
    console.log("[media] axios bytes:", buf.length, "ctype:", type);
  }

  const name =
    fallbackName.endsWith(".ogg") || type.includes("ogg")
      ? "voice.ogg"
      : type.includes("mpeg")
      ? "voice.mp3"
      : type.includes("wav")
      ? "voice.wav"
      : "voice.bin";

  return new File([new Uint8Array(buf)], name, { type });
}
