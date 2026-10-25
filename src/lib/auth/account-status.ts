export function accountStatusOf(profile: { accountStatus?: "active" | "archived" | "deleted" }) {
  return profile.accountStatus ?? "active";
}
