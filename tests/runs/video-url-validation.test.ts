import { describe, expect, it } from "vitest";

import { validateExternalVideoUrl } from "@/lib/runs/video-url-validation";

describe("validateExternalVideoUrl", () => {
  it("accepts youtube watch urls and normalizes host", () => {
    const result = validateExternalVideoUrl("https://youtube.com/watch?v=abc123_DEF-0&t=42");

    expect(result).toEqual({
      ok: true,
      normalizedUrl: "https://www.youtube.com/watch?v=abc123_DEF-0",
      videoId: "abc123_DEF-0",
      videoHost: "YOUTUBE",
    });
  });

  it("accepts youtu.be urls", () => {
    const result = validateExternalVideoUrl("https://youtu.be/abc123_DEF-0?si=test");

    expect(result).toEqual({
      ok: true,
      normalizedUrl: "https://youtu.be/abc123_DEF-0",
      videoId: "abc123_DEF-0",
      videoHost: "YOUTUBE",
    });
  });

  it("accepts shorts urls", () => {
    const result = validateExternalVideoUrl("https://www.youtube.com/shorts/abc123_DEF-0?feature=share");

    expect(result).toEqual({
      ok: true,
      normalizedUrl: "https://www.youtube.com/shorts/abc123_DEF-0",
      videoId: "abc123_DEF-0",
      videoHost: "YOUTUBE",
    });
  });

  it("rejects non-https urls", () => {
    expect(validateExternalVideoUrl("http://www.youtube.com/watch?v=abc123")).toEqual({
      ok: false,
      error: "INVALID_URL",
    });
  });

  it("rejects unsupported hosts", () => {
    expect(validateExternalVideoUrl("https://vimeo.com/123")).toEqual({
      ok: false,
      error: "UNSUPPORTED_HOST",
    });
  });

  it("rejects unsupported youtube formats", () => {
    expect(validateExternalVideoUrl("https://www.youtube.com/embed/abc123")).toEqual({
      ok: false,
      error: "UNSUPPORTED_FORMAT",
    });
    expect(validateExternalVideoUrl("https://m.youtube.com/watch?v=abc123")).toEqual({
      ok: false,
      error: "UNSUPPORTED_HOST",
    });
    expect(validateExternalVideoUrl("https://www.youtube.com/watch?v=")).toEqual({
      ok: false,
      error: "UNSUPPORTED_FORMAT",
    });
  });
});
