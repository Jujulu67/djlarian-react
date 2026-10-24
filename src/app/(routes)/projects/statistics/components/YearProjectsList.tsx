'use client';

import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Music2 } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

import { type StatisticsData } from '../types';

interface YearProjectsListProps {
  statistics: StatisticsData;
  selectedYear: number;
}

export function YearProjectsList({ statistics, selectedYear }: YearProjectsListProps) {
  return (
    <Card className="glass border border-purple-500/20 bg-black/30 backdrop-blur-md text-white">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Music2 className="mr-2 h-5 w-5 text-purple-400" />
          Projets terminés en {selectedYear}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {statistics.projectsByYearDetails[selectedYear.toString()].length > 0 ? (
          <div className="space-y-2">
            {statistics.projectsByYearDetails[selectedYear.toString()].map((project) => (
              <div
                key={project.id}
                className="p-3 rounded-lg border border-gray-700/50 bg-gray-800/30 hover:bg-gray-700/30 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-white font-medium">{project.name}</span>
                  <span className="text-sm text-gray-400">
                    {format(new Date(project.releaseDate), 'dd MMMM yyyy', { locale: fr })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-gray-400 py-8">
            Aucun projet terminé en {selectedYear}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
