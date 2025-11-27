'use client';

import { Filter, RefreshCw, Users, ChevronDown } from 'lucide-react';
import { useState, useCallback, useEffect } from 'react';

import { ProjectTable, Project, ProjectStatus, PROJECT_STATUSES } from '@/components/projects';

interface User {
  id: string;
  name: string | null;
  email: string | null;
}

interface AdminProjectsClientProps {
  initialProjects: Project[];
  users: User[];
}

export const AdminProjectsClient = ({ initialProjects, users }: AdminProjectsClientProps) => {
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'ALL'>('ALL');
  const [userFilter, setUserFilter] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);

  const fetchProjects = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('all', 'true');

      if (statusFilter !== 'ALL') {
        params.set('status', statusFilter);
      }
      if (userFilter !== 'ALL') {
        params.set('userId', userFilter);
      }

      const response = await fetch(`/api/projects?${params.toString()}`);
      if (response.ok) {
        const result = await response.json();
        // Nouveau format API: { data: [...] }
        const projects = result.data || result;
        setProjects(projects);
      } else {
        const error = await response.json();
        console.error('Erreur lors du chargement:', error.error || error);
      }
    } catch (error) {
      console.error('Erreur lors du chargement:', error);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, userFilter]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleUpdate = async (id: string, field: string, value: string | number | null) => {
    // Admin ne peut pas modifier les projets des autres (géré côté API)
    // Mais on peut afficher une notification
    console.log('Admin view - modification non autorisée');
  };

  const handleDelete = async (id: string) => {
    // Admin ne peut pas supprimer les projets des autres
    console.log('Admin view - suppression non autorisée');
  };

  const handleCreate = async () => {
    // Admin view ne permet pas la création
    console.log('Admin view - création non autorisée');
  };

  const filteredProjects = projects.filter((p) => {
    const statusMatch = statusFilter === 'ALL' || p.status === statusFilter;
    const userMatch = userFilter === 'ALL' || p.userId === userFilter;
    return statusMatch && userMatch;
  });

  // Stats globales
  const stats = {
    total: projects.length,
    users: new Set(projects.map((p) => p.userId)).size,
    enCours: projects.filter((p) => p.status === 'EN_COURS').length,
    termine: projects.filter((p) => p.status === 'TERMINE').length,
  };

  const selectedUser = users.find((u) => u.id === userFilter);

  return (
    <div className="space-y-6">
      {/* Header avec stats globales */}
      <div className="glass-modern rounded-xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
              Vue Admin - Tous les Projets
            </h1>
            <p className="text-gray-400 text-sm">
              Visualisation de tous les projets utilisateurs (lecture seule)
            </p>
          </div>

          {/* Stats globales */}
          <div className="flex items-center gap-4 text-sm">
            <div className="text-center px-4 py-2 bg-white/5 rounded-lg">
              <div className="text-2xl font-bold text-white">{stats.total}</div>
              <div className="text-gray-400 text-xs">Projets</div>
            </div>
            <div className="text-center px-4 py-2 bg-purple-500/10 rounded-lg border border-purple-500/20">
              <div className="text-2xl font-bold text-purple-400">{stats.users}</div>
              <div className="text-gray-400 text-xs">Utilisateurs</div>
            </div>
            <div className="text-center px-4 py-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
              <div className="text-2xl font-bold text-blue-400">{stats.enCours}</div>
              <div className="text-gray-400 text-xs">En cours</div>
            </div>
            <div className="hidden sm:block text-center px-4 py-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
              <div className="text-2xl font-bold text-emerald-400">{stats.termine}</div>
              <div className="text-gray-400 text-xs">Terminés</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Filtre par utilisateur */}
        <div className="relative">
          <button
            onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm transition-all"
          >
            <Users size={16} className="text-purple-400" />
            <span className="text-gray-300">
              {userFilter === 'ALL'
                ? 'Tous les utilisateurs'
                : selectedUser?.name || selectedUser?.email || 'Utilisateur'}
            </span>
            <ChevronDown
              size={16}
              className={`text-gray-400 transition-transform ${isUserDropdownOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {isUserDropdownOpen && (
            <div className="absolute top-full left-0 mt-2 w-64 bg-gray-900 border border-white/10 rounded-lg shadow-xl z-50 max-h-64 overflow-y-auto">
              <button
                onClick={() => {
                  setUserFilter('ALL');
                  setIsUserDropdownOpen(false);
                }}
                className={`w-full px-4 py-2 text-left text-sm hover:bg-white/5 ${
                  userFilter === 'ALL' ? 'text-purple-400 bg-purple-500/10' : 'text-gray-300'
                }`}
              >
                Tous les utilisateurs
              </button>
              {users.map((user) => (
                <button
                  key={user.id}
                  onClick={() => {
                    setUserFilter(user.id);
                    setIsUserDropdownOpen(false);
                  }}
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-white/5 ${
                    userFilter === user.id ? 'text-purple-400 bg-purple-500/10' : 'text-gray-300'
                  }`}
                >
                  {user.name || user.email || 'Sans nom'}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Filtre par statut */}
        <div className="flex items-center gap-2 text-gray-400">
          <Filter size={16} />
          <span className="text-sm">Statut :</span>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              statusFilter === 'ALL'
                ? 'bg-purple-600 text-white'
                : 'bg-white/5 text-gray-300 hover:bg-white/10'
            }`}
          >
            Tous
          </button>
          {PROJECT_STATUSES.map((status) => (
            <button
              key={status.value}
              onClick={() => setStatusFilter(status.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                statusFilter === status.value
                  ? 'bg-purple-600 text-white'
                  : 'bg-white/5 text-gray-300 hover:bg-white/10'
              }`}
            >
              {status.label}
            </button>
          ))}
        </div>

        <button
          onClick={fetchProjects}
          disabled={isLoading}
          className="ml-auto p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all disabled:opacity-50"
          title="Rafraîchir"
          aria-label="Rafraîchir la liste des projets"
        >
          <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} aria-hidden="true" />
        </button>
      </div>

      {/* Tableau en mode admin (lecture seule avec colonne utilisateur) */}
      <ProjectTable
        projects={filteredProjects}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        onCreate={handleCreate}
        isAdmin={true}
      />

      {/* Info */}
      <div className="text-center text-gray-500 text-xs py-4">
        👁️ Vue administrateur en lecture seule • Les utilisateurs gèrent leurs propres projets
      </div>
    </div>
  );
};
