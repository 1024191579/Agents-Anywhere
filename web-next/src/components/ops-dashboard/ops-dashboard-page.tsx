"use client"

import * as React from "react"
import { Activity, Gauge, Laptop, LineChart, RefreshCw, Users } from "lucide-react"
import { useTranslations } from "next-intl"

import { useAuth } from "@/components/auth/auth-context"
import { DevicesTab } from "@/components/ops-dashboard/devices-tab"
import { OverviewTab } from "@/components/ops-dashboard/overview-tab"
import { QualityTab } from "@/components/ops-dashboard/quality-tab"
import { UsageTab } from "@/components/ops-dashboard/usage-tab"
import { UsersTab } from "@/components/ops-dashboard/users-tab"
import { PageHeader } from "@/components/pages/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { useWorkspace } from "@/components/workspace-context"
import { dashboardApi } from "@/features/dashboard/api"
import type { UsageLiveResponse, UsageReportResponse } from "@/features/dashboard/types"
import {
  browserTimeZone,
  clampRange,
  formatNumber,
  localToday,
  presetRange,
  type UsageDateRange,
  type UsageRangePreset,
} from "@/features/admin-usage/report-helpers"
import { cn } from "@/lib/utils"

type DashboardTab = "overview" | "users" | "usage" | "devices" | "quality"

const PRESETS: UsageRangePreset[] = ["7d", "30d", "90d", "custom"]
const LIVE_REFRESH_MS = 30_000

const TABS: { id: DashboardTab; icon: typeof LineChart }[] = [
  { id: "overview", icon: LineChart },
  { id: "users", icon: Users },
  { id: "usage", icon: Gauge },
  { id: "devices", icon: Laptop },
  { id: "quality", icon: Activity },
]

export function OpsDashboardPage() {
  const { navigate } = useWorkspace()
  const { session } = useAuth()
  const t = useTranslations("pages.opsDashboard")
  const token = session?.accessToken
  const timeZone = React.useMemo(() => browserTimeZone(), [])

  const [tab, setTab] = React.useState<DashboardTab>("overview")
  const [preset, setPreset] = React.useState<UsageRangePreset>("30d")
  const [range, setRange] = React.useState<UsageDateRange>(() => presetRange("30d", localToday(timeZone)))
  const [draft, setDraft] = React.useState<UsageDateRange>(range)
  const [draftError, setDraftError] = React.useState(false)
  const [report, setReport] = React.useState<UsageReportResponse | null>(null)
  const [live, setLive] = React.useState<UsageLiveResponse | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [reloadKey, setReloadKey] = React.useState(0)

  React.useEffect(() => {
    if (!token) return
    let cancelled = false
    setLoading(true)
    setError(null)
    dashboardApi
      .getAdminUsageReport(token, { from: range.from, to: range.to, tz: timeZone })
      .then((data) => {
        if (cancelled) return
        setReport(data)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : t("loadFailed"))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [range.from, range.to, reloadKey, t, timeZone, token])

  React.useEffect(() => {
    if (!token) return
    let cancelled = false
    const poll = async () => {
      try {
        const data = await dashboardApi.getAdminUsageLive(token)
        if (!cancelled) setLive(data)
      } catch {
        // The live strip is best-effort; the report carries the real numbers.
      }
    }
    void poll()
    const timer = window.setInterval(() => void poll(), LIVE_REFRESH_MS)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [reloadKey, token])

  const choosePreset = (next: UsageRangePreset) => {
    setPreset(next)
    if (next === "custom") {
      setDraft(range)
      setDraftError(false)
      return
    }
    setRange(presetRange(next, localToday(timeZone)))
  }

  const applyDraft = () => {
    const next = clampRange(draft)
    if (!next) {
      setDraftError(true)
      return
    }
    setDraftError(false)
    setRange(next)
  }

  const refresh = () => setReloadKey((value) => value + 1)
  const dataSince = report?.range.dataSince ?? null

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="px-5 pb-0 pt-14 sm:px-8">
        <PageHeader title={t("title")} description={t("description")} onBack={() => navigate("home")}>
          <Button type="button" variant="outline" size="sm" onClick={refresh} disabled={loading}>
            {loading ? <Spinner /> : <RefreshCw data-icon="inline-start" />}
            {t("refresh")}
          </Button>
        </PageHeader>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            value={preset}
            onValueChange={(value) => {
              if (value) choosePreset(value as UsageRangePreset)
            }}
          >
            {PRESETS.map((item) => (
              <ToggleGroupItem key={item} value={item} aria-label={t(`range.${item}`)}>
                {t(`range.${item}`)}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          {preset === "custom" ? (
            <div className="flex flex-wrap items-center gap-2">
              <Input
                type="date"
                aria-label={t("range.from")}
                value={draft.from}
                max={draft.to}
                onChange={(event) => setDraft((current) => ({ ...current, from: event.currentTarget.value }))}
                className={cn("h-8 w-36", draftError && "border-destructive")}
              />
              <span className="text-xs text-muted-foreground">–</span>
              <Input
                type="date"
                aria-label={t("range.to")}
                value={draft.to}
                min={draft.from}
                onChange={(event) => setDraft((current) => ({ ...current, to: event.currentTarget.value }))}
                className={cn("h-8 w-36", draftError && "border-destructive")}
              />
              <Button type="button" size="sm" onClick={applyDraft}>
                {t("range.apply")}
              </Button>
              {draftError ? <span className="text-xs text-destructive">{t("range.invalid")}</span> : null}
            </div>
          ) : (
            <span className="text-xs tabular-nums text-muted-foreground">
              {range.from} – {range.to}
            </span>
          )}
          <Badge variant="outline" className="font-normal text-muted-foreground">
            {timeZone}
          </Badge>
        </div>

        <LiveStrip live={live} />

        <p className="mt-3 text-xs text-muted-foreground">
          {dataSince ? t("dataSince", { date: dataSince }) : report ? t("noDataYet") : ""}
        </p>

        <Tabs value={tab} onValueChange={(value) => setTab(value as DashboardTab)} className="mt-4">
          <TabsList className="w-full justify-start overflow-x-auto">
            {TABS.map((item) => {
              const Icon = item.icon
              return (
                <TabsTrigger key={item.id} value={item.id} className="gap-1.5">
                  <Icon className="size-3.5" />
                  {t(`tabs.${item.id}`)}
                </TabsTrigger>
              )
            })}
          </TabsList>
        </Tabs>
      </div>

      <main className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-8 sm:py-6">
        {error ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-5 py-4 text-sm text-destructive">
            <span>{error}</span>
            <Button type="button" variant="outline" size="sm" onClick={refresh}>
              {t("retry")}
            </Button>
          </div>
        ) : report ? (
          <div className={cn("transition-opacity", loading && "pointer-events-none opacity-60")}>
            <DashboardContent tab={tab} report={report} />
          </div>
        ) : (
          <ReportSkeleton />
        )}
      </main>
    </div>
  )
}

function DashboardContent({ tab, report }: { tab: DashboardTab; report: UsageReportResponse }) {
  if (tab === "users") return <UsersTab report={report} />
  if (tab === "usage") return <UsageTab report={report} />
  if (tab === "devices") return <DevicesTab report={report} />
  if (tab === "quality") return <QualityTab report={report} />
  return <OverviewTab report={report} />
}

function LiveStrip({ live }: { live: UsageLiveResponse | null }) {
  const t = useTranslations("pages.opsDashboard")
  const items: { key: string; value: string }[] = [
    {
      key: "onlineConnectors",
      value: live ? `${formatNumber(live.onlineConnectors)} / ${formatNumber(live.totalConnectors)}` : "—",
    },
    { key: "runningTurns", value: live ? formatNumber(live.runningTurns) : "—" },
    { key: "activeUsers15m", value: live ? formatNumber(live.activeUsers15m) : "—" },
  ]
  return (
    <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm">
      <span className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <span className="relative flex size-2">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-chart-2 opacity-60" />
          <span className="relative inline-flex size-2 rounded-full bg-chart-2" />
        </span>
        {t("live.title")}
      </span>
      {items.map((item) => (
        <span key={item.key} className="flex items-baseline gap-1.5">
          <span className="text-xs text-muted-foreground">{t(`live.${item.key}`)}</span>
          <span className="font-semibold tabular-nums">{item.value}</span>
        </span>
      ))}
    </div>
  )
}

function ReportSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-24 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Skeleton className="h-80 rounded-xl" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
    </div>
  )
}
