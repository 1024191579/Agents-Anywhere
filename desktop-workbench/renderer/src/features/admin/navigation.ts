/**
 * Administration sections and how they map onto `#/admin/<section>`.
 *
 * The "data" group re-exposes the usage dashboard tabs so the sidebar drives
 * them; the "management" group holds the pages that edit the instance.
 */
export const adminDataSections = ["overview", "users", "usage", "devices", "quality"] as const
export const adminManagementSections = ["team", "announcements", "service"] as const
export const adminSections = [...adminDataSections, ...adminManagementSections] as const

export type AdminDataSection = (typeof adminDataSections)[number]
export type AdminManagementSection = (typeof adminManagementSections)[number]
export type AdminSection = (typeof adminSections)[number]

export const DEFAULT_ADMIN_SECTION: AdminSection = "overview"

export function isAdminSection(value: unknown): value is AdminSection {
  return typeof value === "string" && (adminSections as readonly string[]).includes(value)
}

export function parseAdminSection(value: string | undefined): AdminSection {
  return isAdminSection(value) ? value : DEFAULT_ADMIN_SECTION
}

export function isAdminDataSection(section: AdminSection): section is AdminDataSection {
  return (adminDataSections as readonly string[]).includes(section)
}

/** Routes that predate `#/admin/*` and still open the matching section. */
export const legacyAdminRoutes: Record<string, AdminSection> = {
  dashboard: "overview",
  team: "team",
  service: "service",
}

export const adminNavigation = [
  { group: "data", sections: adminDataSections },
  { group: "management", sections: adminManagementSections },
] as const
