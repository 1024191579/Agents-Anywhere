"use client"

import { Activity, Gauge, Laptop, LineChart, Megaphone, Server, UserCog, Users } from "lucide-react"
import { useTranslations } from "next-intl"

import { WorkspaceSectionSidebar } from "@/components/workspace-section-sidebar"
import { useWorkspace } from "@/components/workspace-context"
import { adminNavigation, type AdminSection } from "@/features/admin/navigation"

const ICONS = {
  overview: LineChart,
  users: Users,
  usage: Gauge,
  devices: Laptop,
  quality: Activity,
  team: UserCog,
  announcements: Megaphone,
  service: Server,
} satisfies Record<AdminSection, typeof LineChart>

export function AdminSidebar({ contained = false }: { contained?: boolean }) {
  const t = useTranslations("admin")
  const tTabs = useTranslations("pages.opsDashboard.tabs")
  const tTeam = useTranslations("pages.team")
  const tService = useTranslations("pages.service")
  const tAnnouncement = useTranslations("announcement.admin")
  const { adminSection, navigate } = useWorkspace()

  const label = (section: AdminSection): string => {
    switch (section) {
      case "team":
        return tTeam("title")
      case "announcements":
        return tAnnouncement("title")
      case "service":
        return tService("title")
      default:
        return tTabs(section)
    }
  }

  return (
    <WorkspaceSectionSidebar<AdminSection>
      contained={contained}
      title={t("title")}
      activeId={adminSection}
      onNavigate={(section) => navigate("admin", section)}
      groups={adminNavigation.map(({ group, sections }) => ({
        id: group,
        label: t(`groups.${group}`),
        items: sections.map((section) => ({ id: section, label: label(section), icon: ICONS[section] })),
      }))}
    />
  )
}
