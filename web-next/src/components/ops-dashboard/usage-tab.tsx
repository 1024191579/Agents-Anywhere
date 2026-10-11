"use client"

import { useTranslations } from "next-intl"

import { BarsChart, SERIES_COLORS } from "@/components/ops-dashboard/charts"
import { ChartCard, EmptyNote, StatGrid, StatTile } from "@/components/ops-dashboard/stat-tile"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { UsageReportResponse } from "@/features/dashboard/types"
import {
  formatDurationMs,
  formatHour,
  formatNumber,
} from "@/features/admin-usage/report-helpers"

export function UsageTab({ report }: { report: UsageReportResponse }) {
  const t = useTranslations("pages.opsDashboard")
  const summary = report.summary
  const perUser = summary.activeUsers > 0 ? (summary.messages / summary.activeUsers).toFixed(1) : "—"
  const hours = report.hourOfDay.map((point) => ({ hour: formatHour(point.hour), messages: point.messages }))
  const runtimeBars = report.runtimes
    .filter((row) => row.messages > 0)
    .map((row) => ({ runtime: row.displayName, messages: row.messages }))

  return (
    <div className="flex flex-col gap-4">
      <StatGrid className="xl:grid-cols-4 2xl:grid-cols-4">
        <StatTile label={t("metrics.messages")} value={formatNumber(summary.messages)} />
        <StatTile label={t("metrics.sessions")} value={formatNumber(summary.sessions)} />
        <StatTile label={t("metrics.turns")} value={formatNumber(summary.turns)} />
        <StatTile label={t("metrics.messagesPerActiveUser")} value={perUser} />
      </StatGrid>

      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCard title={t("charts.messagesDaily")}>
          <BarsChart
            data={report.daily}
            series={[{ key: "messages", label: t("series.messages"), color: SERIES_COLORS[0] }]}
          />
        </ChartCard>
        <ChartCard title={t("charts.hourOfDay")} hint={t("charts.hourOfDayHint", { timezone: report.range.timezone })}>
          <BarsChart
            data={hours}
            xKey="hour"
            tickFormatter={(value) => String(value)}
            series={[{ key: "messages", label: t("series.messages"), color: SERIES_COLORS[0] }]}
          />
        </ChartCard>
      </div>

      <ChartCard title={t("charts.runtimeMessages")}>
        {runtimeBars.length === 0 ? (
          <EmptyNote>{t("runtimes.empty")}</EmptyNote>
        ) : (
          <BarsChart
            data={runtimeBars}
            xKey="runtime"
            tickFormatter={(value) => String(value)}
            series={[{ key: "messages", label: t("series.messages"), color: SERIES_COLORS[0] }]}
            className="h-56"
          />
        )}
      </ChartCard>

      <ChartCard title={t("runtimes.title")} hint={t("runtimes.hint")}>
        {report.runtimes.length === 0 ? (
          <EmptyNote>{t("runtimes.empty")}</EmptyNote>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("runtimes.runtime")}</TableHead>
                <TableHead className="text-right">{t("runtimes.messages")}</TableHead>
                <TableHead className="text-right">{t("runtimes.sessions")}</TableHead>
                <TableHead className="text-right">{t("runtimes.activeUsers")}</TableHead>
                <TableHead className="text-right">{t("runtimes.turns")}</TableHead>
                <TableHead className="text-right">{t("runtimes.failed")}</TableHead>
                <TableHead className="text-right">{t("runtimes.p50")}</TableHead>
                <TableHead className="text-right">{t("runtimes.errors")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.runtimes.map((row) => (
                <TableRow key={row.runtimeType}>
                  <TableCell>
                    <div className="font-medium">{row.displayName}</div>
                    {row.displayName !== row.runtimeType ? (
                      <div className="text-xs text-muted-foreground">{row.runtimeType}</div>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatNumber(row.messages)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatNumber(row.sessions)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatNumber(row.activeUsers)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatNumber(row.turns)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatNumber(row.turnsFailed)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatDurationMs(row.turnDurationP50Ms)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatNumber(row.runtimeErrors)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </ChartCard>
    </div>
  )
}
