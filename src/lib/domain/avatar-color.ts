/** Muted colors that read on both light and dark backgrounds with white text. */
export const AVATAR_PALETTE = [
  "#64748b", // slate
  "#7c6f64", // stone
  "#4f7a6a", // sage
  "#5b6b9a", // indigo
  "#8a5a7a", // plum
  "#9a6b4f", // clay
  "#4f7f8f", // teal
  "#7a7f4f", // olive
];

export function avatarColor(username: string): string {
  let h = 0;
  for (const ch of username) h = (h * 31 + ch.codePointAt(0)!) >>> 0;
  return AVATAR_PALETTE[h % AVATAR_PALETTE.length];
}
