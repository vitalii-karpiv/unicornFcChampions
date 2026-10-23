import { iconImage } from "@/lib/icon-image";

const SIZES = new Set([192, 512]);

export async function GET(_req: Request, ctx: RouteContext<"/icons/[size]">) {
  const size = Number((await ctx.params).size);
  if (!SIZES.has(size)) return new Response("Not found", { status: 404 });
  return iconImage(size);
}
