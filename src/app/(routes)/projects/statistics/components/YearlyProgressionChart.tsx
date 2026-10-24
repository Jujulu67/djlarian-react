'use client';

import { TrendingUp } from 'lucide-react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart as RechartsLineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

import { type buildYearlyProgressionData } from '../chartData';

interface YearlyProgressionChartProps {
  yearlyProgressionData: ReturnType<typeof buildYearlyProgressionData>;
}

export function YearlyProgressionChart({ yearlyProgressionData }: YearlyProgressionChartProps) {
  return (
    <Card className="glass border border-purple-500/20 bg-black/30 backdrop-blur-md text-white">
      <CardHeader>
        <CardTitle className="flex items-center">
          <TrendingUp className="mr-2 h-5 w-5 text-purple-400" />
          Évolution annuelle des performances
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <RechartsLineChart data={yearlyProgressionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
              <XAxis
                dataKey="year"
                stroke="rgba(255, 255, 255, 0.5)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tick={{ fill: 'rgba(255, 255, 255, 0.7)' }}
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
                contentStyle={{
                  backgroundColor: 'rgba(0, 0, 0, 0.9)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '8px',
                  color: '#fff',
                }}
                formatter={(value: number | undefined, name: string | undefined) => {
                  const v = value ?? 0;
                  const numValue = Number(v);
                  if (!Number.isFinite(numValue) || numValue < 0) {
                    return [
                      '0',
                      name === 'totalStreams'
                        ? 'Total'
                        : name === 'averageStreams'
                          ? 'Moyenne'
                          : name,
                    ];
                  }
                  if (name === 'totalStreams') {
                    return [`${numValue.toLocaleString()} streams`, 'Total'];
                  }
                  if (name === 'averageStreams') {
                    return [`${numValue.toLocaleString()} streams`, 'Moyenne'];
                  }
                  return [numValue.toString(), name];
                }}
                labelFormatter={(label) => `Année ${label}`}
              />
              <Legend
                formatter={(value) => {
                  if (value === 'totalStreams') return 'Total streams';
                  if (value === 'averageStreams') return 'Moyenne streams';
                  return value;
                }}
              />
              <Line
                type="monotone"
                dataKey="totalStreams"
                stroke="#a855f7"
                strokeWidth={2}
                dot={{ r: 4, fill: '#a855f7' }}
                activeDot={{ r: 6, strokeWidth: 2, fill: '#a855f7' }}
                name="totalStreams"
              />
              <Line
                type="monotone"
                dataKey="averageStreams"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ r: 4, fill: '#3b82f6' }}
                activeDot={{ r: 6, strokeWidth: 2, fill: '#3b82f6' }}
                name="averageStreams"
              />
            </RechartsLineChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {yearlyProgressionData.map((data) => (
            <div
              key={data.year}
              className="p-3 rounded-lg border border-gray-700/50 bg-gray-800/30"
            >
              <div className="text-sm text-gray-400 mb-1">{data.year}</div>
              <div className="text-lg font-bold text-purple-400">
                {Number.isFinite(data.totalStreams) ? data.totalStreams.toLocaleString() : '0'}
              </div>
              <div className="text-xs text-gray-500">
                Moyenne:{' '}
                {Number.isFinite(data.averageStreams) ? data.averageStreams.toLocaleString() : '0'}{' '}
                ({data.projectCount} projet{data.projectCount > 1 ? 's' : ''})
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
