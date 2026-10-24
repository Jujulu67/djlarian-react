'use client';

import { Activity, Music2, TrendingUp } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

import { MILESTONE_LABELS, type StatisticsData } from '../types';

interface StreamsMetricsProps {
  displayStats: StatisticsData;
}

export function StreamsMetrics({ displayStats }: StreamsMetricsProps) {
  return (
    <>
      <Card className="glass border border-blue-500/20 bg-black/30 backdrop-blur-md text-white">
        <CardHeader>
          <CardTitle className="flex items-center">
            <TrendingUp className="mr-2 h-5 w-5 text-blue-400" />
            Moyennes par jalon
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {MILESTONE_LABELS.map((jalon) => {
              const value = displayStats.metrics.averageStreams[jalon];
              if (value === undefined) return null;
              return (
                <div
                  key={jalon}
                  className="p-4 rounded-lg border border-blue-500/30 bg-blue-500/10"
                >
                  <div className="text-2xl font-bold text-blue-400 mb-1">
                    {value.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-300">{jalon}</div>
                  <div className="text-xs text-gray-400 mt-1">moyenne</div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Autres métriques */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="glass border border-green-500/20 bg-black/30 backdrop-blur-md text-white">
          <CardHeader>
            <CardTitle className="flex items-center text-sm">
              <Activity className="mr-2 h-4 w-4 text-green-400" />
              Total Streams
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-400">
              {displayStats.metrics.totalStreams.toLocaleString()}
            </div>
            <div className="text-xs text-gray-400 mt-1">sur tous les projets</div>
          </CardContent>
        </Card>

        <Card className="glass border border-purple-500/20 bg-black/30 backdrop-blur-md text-white">
          <CardHeader>
            <CardTitle className="flex items-center text-sm">
              <Music2 className="mr-2 h-4 w-4 text-purple-400" />
              Projets avec streams
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-400">
              {displayStats.metrics.projectsWithStreams}
            </div>
            <div className="text-xs text-gray-400 mt-1">projets suivis</div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
