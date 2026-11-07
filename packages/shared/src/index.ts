/** Reserved for stable cross-platform contracts; no credentials belong here. */
export const PLATFORM_NAME = "PlayNex";
export const INITIAL_BETA_MINIMUM_AGE = 18;
export type Availability = "available" | "development" | "disabled";
export type Entitlement = { productId: string; expiresAt: string | null };
export function hasEntitlement(
  items: readonly Entitlement[],
  productId: string,
  now = Date.now(),
): boolean {
  return items.some(
    (item) =>
      item.productId === productId &&
      (item.expiresAt === null || Date.parse(item.expiresAt) > now),
  );
}
