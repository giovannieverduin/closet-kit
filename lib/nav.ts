export type NavLink = { href: string; name: string };
export type NavGroup = { label: string; links: NavLink[] };

// Grouped navigation used by the desktop header — nine destinations consolidated into
// four labelled clusters so the bar stays scannable. Order within each group is daily-use first.
export const NAV_GROUPS: NavGroup[] = [
  { label: "My Closet", links: [
    { href: "/", name: "Closet" },
    { href: "/add", name: "Add" },
    { href: "/import", name: "Import" },
    { href: "/tidy", name: "Tidy" },
  ] },
  { label: "Style", links: [
    { href: "/palette", name: "Palette" },
    { href: "/assess", name: "Assess" },
    { href: "/salon", name: "Salon" },
  ] },
  { label: "Wear", links: [
    { href: "/looks", name: "Looks" },
    { href: "/occasion", name: "Occasion" },
    { href: "/saved", name: "Saved" },
  ] },
  { label: "Shop", links: [
    { href: "/discover", name: "Discover" },
    { href: "/wishlist", name: "Wishlist" },
  ] },
];

// Primary one-handed destinations for the mobile bottom tab bar. Everything else is a
// tap away under "More" (which opens the full grouped menu).
export const PRIMARY_TABS: NavLink[] = [
  { href: "/", name: "Closet" },
  { href: "/looks", name: "Looks" },
  { href: "/discover", name: "Discover" },
  { href: "/add", name: "Add" },
];

// True when `href` is the active route. "/" only matches exactly; others match their subtree.
export function isActiveHref(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
