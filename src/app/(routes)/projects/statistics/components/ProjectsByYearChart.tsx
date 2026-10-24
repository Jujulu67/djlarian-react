'use client';

import { BarChart3 } from 'lucide-react';
import type { Dispatch, SetStateAction } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { type Project } from '@/components/projects/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

import {
  ProjectsByYearTooltip,
  createSegmentLabelRenderer,
  createTotalLabelRenderer,
} from '../chartLabels';
import { getStatusBarColors } from '../statusColors';
import { type StatisticsData } from '../types';

interface ProjectsByYearChartProps {
  statistics: StatisticsData;
  hiddenStatuses: Set<string>;
  setHiddenStatuses: Dispatch<SetStateAction<Set<string>>>;
  displayStats: StatisticsData;
  initialProjects: Project[];
}

export function ProjectsByYearChart({
  statistics,
  hiddenStatuses,
  setHiddenStatuses,
  displayStats,
  initialProjects,
}: ProjectsByYearChartProps) {
  const renderTotalLabel = createTotalLabelRenderer(hiddenStatuses);
  const renderTermineLabel = createSegmentLabelRenderer('TERMINE');
  const renderGhostProdLabel = createSegmentLabelRenderer('GHOST_PRODUCTION');

  return (
    <Card className="glass border border-purple-500/20 bg-black/30 backdrop-blur-md text-white">
      <CardHeader>
        <CardTitle className="flex items-center">
          <BarChart3 className="mr-2 h-5 w-5 text-purple-400" />
          Projets terminés par année
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={displayStats.projectsByYear}
              margin={{ top: 30, right: 30, left: 30, bottom: 5 }}
              barGap={0}
              barCategoryGap="20%"
              barSize={60}
              style={{ cursor: 'default' }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
              <XAxis
                dataKey="year"
                type="category"
                stroke="rgba(255, 255, 255, 0.5)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tick={{ fill: 'rgba(255, 255, 255, 0.7)' }}
                interval={0}
                tickMargin={10}
                padding={{ left: 100, right: 100 }}
              />
              <YAxis
                stroke="rgba(255, 255, 255, 0.5)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
                tick={{ fill: 'rgba(255, 255, 255, 0.7)' }}
              />
              <Tooltip
                content={
                  <ProjectsByYearTooltip
                    projectsByYearDetails={statistics.projectsByYearDetails}
                    projects={initialProjects}
                  />
                }
                cursor={{ fill: 'transparent' }}
                wrapperStyle={{ outline: 'none' }}
              />
              {!hiddenStatuses.has('TERMINE') &&
                (() => {
                  const colors = getStatusBarColors('TERMINE');
                  const isTopBar = hiddenStatuses.has('GHOST_PRODUCTION');
                  return (
                    <Bar
                      dataKey="TERMINE"
                      stackId="a"
                      fill={colors.fill}
                      stroke={colors.stroke}
                      strokeWidth={2}
                      radius={isTopBar ? [8, 8, 0, 0] : [0, 0, 0, 0]}
                      isAnimationActive={false}
                      activeBar={{
                        fill: colors.fill,
                        stroke: colors.stroke,
                        strokeWidth: 2,
                        opacity: 1,
                      }}
                    >
                      <LabelList
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        content={renderTermineLabel as any}
                        position="center"
                        dataKey="TERMINE"
                      />
                      {isTopBar && (
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        <LabelList content={renderTotalLabel as any} position="top" />
                      )}
                    </Bar>
                  );
                })()}
              {!hiddenStatuses.has('GHOST_PRODUCTION') &&
                (() => {
                  const colors = getStatusBarColors('GHOST_PRODUCTION');
                  return (
                    <Bar
                      dataKey="GHOST_PRODUCTION"
                      stackId="a"
                      fill={colors.fill}
                      stroke={colors.stroke}
                      strokeWidth={2}
                      radius={hiddenStatuses.has('TERMINE') ? [8, 8, 0, 0] : [8, 8, 0, 0]}
                      isAnimationActive={false}
                      activeBar={{
                        fill: colors.fill,
                        stroke: colors.stroke,
                        strokeWidth: 2,
                        opacity: 1,
                      }}
                    >
                      <LabelList
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        content={renderGhostProdLabel as any}
                        position="center"
                        dataKey="GHOST_PRODUCTION"
                      />
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      <LabelList content={renderTotalLabel as any} position="top" />
                    </Bar>
                  );
                })()}
            </BarChart>
          </ResponsiveContainer>
        </div>
        {/* Légende cliquable centrée par rapport au graphique */}
        <div className="flex items-center justify-center gap-6 flex-wrap">
          {[
            { key: 'TERMINE', label: 'Terminé', color: getStatusBarColors('TERMINE').text },
            {
              key: 'GHOST_PRODUCTION',
              label: 'Ghost Prod',
              color: getStatusBarColors('GHOST_PRODUCTION').text,
            },
          ].map((item) => {
            const isHidden = hiddenStatuses.has(item.key);
            return (
              <button
                key={item.key}
                onClick={() => {
                  const newHidden = new Set(hiddenStatuses);
                  if (isHidden) {
                    newHidden.delete(item.key);
                  } else {
                    newHidden.add(item.key);
                  }
                  setHiddenStatuses(newHidden);
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                  isHidden ? 'opacity-40 hover:opacity-60' : 'hover:bg-gray-700/30'
                }`}
              >
                <div className="w-4 h-4 rounded" style={{ backgroundColor: item.color }} />
                <span className="text-sm text-gray-300">{item.label}</span>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
