import { ImageResponse } from "next/og";

/** Monochrome app mark rendered to PNG (no external emoji fetch). */
export function iconImage(size: number) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0a0a",
          color: "#fafafa",
          fontSize: size * 0.36,
          fontWeight: 700,
          letterSpacing: -size * 0.02,
        }}
      >
        UFC
      </div>
    ),
    { width: size, height: size },
  );
}
