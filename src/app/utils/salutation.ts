import type { UserProfile } from "../types";

export function getUserSalutation(profile: Pick<UserProfile, "name" | "gender">): string {
  const name = profile.name?.trim();
  const gender = profile.gender?.trim();

  if (!name) return "您好";
  if (/[女]/.test(gender ?? "")) return `${name}女士`;
  if (/[男]/.test(gender ?? "")) return `${name}先生`;
  return name;
}
