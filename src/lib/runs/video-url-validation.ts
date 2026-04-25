const ACCEPTED_HOSTS = new Set(["www.youtube.com", "youtube.com", "youtu.be"]);

export const YOUTUBE_VIDEO_HOST = "YOUTUBE";

export type VideoUrlValidationResult =
  | {
      ok: true;
      normalizedUrl: string;
      videoId: string;
      videoHost: typeof YOUTUBE_VIDEO_HOST;
    }
  | { ok: false; error: "INVALID_URL" | "UNSUPPORTED_HOST" | "UNSUPPORTED_FORMAT" };

function isValidVideoId(videoId: string) {
  return /^[A-Za-z0-9_-]{3,}$/.test(videoId);
}

function getPathSegments(pathname: string) {
  return pathname
    .split("/")
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);
}

export function validateExternalVideoUrl(rawValue: string): VideoUrlValidationResult {
  const value = rawValue.trim();

  if (!value) {
    return { ok: false, error: "INVALID_URL" };
  }

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(value);
  } catch {
    return { ok: false, error: "INVALID_URL" };
  }

  if (parsedUrl.protocol !== "https:") {
    return { ok: false, error: "INVALID_URL" };
  }

  const host = parsedUrl.hostname.toLowerCase();

  if (!ACCEPTED_HOSTS.has(host)) {
    return { ok: false, error: "UNSUPPORTED_HOST" };
  }

  if (host === "youtu.be") {
    const segments = getPathSegments(parsedUrl.pathname);

    if (segments.length !== 1 || !isValidVideoId(segments[0])) {
      return { ok: false, error: "UNSUPPORTED_FORMAT" };
    }

    const videoId = segments[0];

    return {
      ok: true,
      normalizedUrl: `https://youtu.be/${videoId}`,
      videoId,
      videoHost: YOUTUBE_VIDEO_HOST,
    };
  }

  const segments = getPathSegments(parsedUrl.pathname);

  if (segments.length === 1 && segments[0] === "watch") {
    const videoId = parsedUrl.searchParams.get("v")?.trim() ?? "";

    if (!isValidVideoId(videoId)) {
      return { ok: false, error: "UNSUPPORTED_FORMAT" };
    }

    return {
      ok: true,
      normalizedUrl: `https://www.youtube.com/watch?v=${videoId}`,
      videoId,
      videoHost: YOUTUBE_VIDEO_HOST,
    };
  }

  if (segments.length === 2 && segments[0] === "shorts") {
    const videoId = segments[1];

    if (!isValidVideoId(videoId)) {
      return { ok: false, error: "UNSUPPORTED_FORMAT" };
    }

    return {
      ok: true,
      normalizedUrl: `https://www.youtube.com/shorts/${videoId}`,
      videoId,
      videoHost: YOUTUBE_VIDEO_HOST,
    };
  }

  return { ok: false, error: "UNSUPPORTED_FORMAT" };
}
