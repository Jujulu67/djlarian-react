'use client';

import { Calendar, Clock, Database, User } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

/** Cartes d'information (version, base de données, uptime, maintenance). */
export function ConfigInfoCards() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
      <Card className="glass border-purple-500/20 bg-transparent">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center text-gray-400">
            <User className="h-4 w-4 mr-2" />
            Version
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-white">v1.5.2</p>
          <p className="text-xs text-gray-400">Dernière mise à jour: 15/09/2023</p>
        </CardContent>
      </Card>

      <Card className="glass border-purple-500/20 bg-transparent">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center text-gray-400">
            <Database className="h-4 w-4 mr-2" />
            Base de données
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-white">Connectée</p>
          <p className="text-xs text-gray-400">PostgreSQL v14.5</p>
        </CardContent>
      </Card>

      <Card className="glass border-purple-500/20 bg-transparent">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center text-gray-400">
            <Clock className="h-4 w-4 mr-2" />
            Uptime
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-white">99.8%</p>
          <p className="text-xs text-gray-400">Dernier redémarrage: 45 jours</p>
        </CardContent>
      </Card>

      <Card className="glass border-purple-500/20 bg-transparent">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center text-gray-400">
            <Calendar className="h-4 w-4 mr-2" />
            Maintenance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-white">Planifiée</p>
          <p className="text-xs text-gray-400">Prochaine: 28/10/2023</p>
        </CardContent>
      </Card>
    </div>
  );
}
