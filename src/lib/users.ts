import type { UserSummary } from "@/lib/data/queries";

export type UserMap = Map<string, string>;

export const userMap = (users: UserSummary[]): UserMap => new Map(users.map((u) => [u.id, u.username]));

export const nameOf = (map: UserMap, id: string) => map.get(id) ?? "unknown";
