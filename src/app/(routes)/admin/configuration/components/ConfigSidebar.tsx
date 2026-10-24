'use client';

import { Globe, Home, Bell, Layout, Settings, Shield, Image as ImageIcon, Zap } from 'lucide-react';

import type { ConfigSection } from '@/types/config';

interface ConfigSidebarProps {
  activeSection: ConfigSection;
  handleSectionClick: (section: ConfigSection) => void;
}

export function ConfigSidebar({ activeSection, handleSectionClick }: ConfigSidebarProps) {
  return (
    <div className="col-span-12 lg:col-span-3">
      <div className="glass p-6 rounded-xl backdrop-blur-md border border-purple-500/20">
        <h2 className="text-xl font-semibold mb-4 text-purple-300">Sections</h2>
        <nav className="space-y-1">
          <button
            onClick={() => handleSectionClick('general')}
            className={`w-full flex items-center p-3 rounded-lg transition-all ${activeSection === 'general' ? 'bg-purple-500/20 text-purple-300' : 'hover:bg-purple-500/10 text-gray-300'}`}
          >
            <Settings className="h-5 w-5 mr-3" />
            Général
          </button>
          <button
            onClick={() => handleSectionClick('appearance')}
            className={`w-full flex items-center p-3 rounded-lg transition-all ${activeSection === 'appearance' ? 'bg-purple-500/20 text-purple-300' : 'hover:bg-purple-500/10 text-gray-300'}`}
          >
            <Layout className="h-5 w-5 mr-3" />
            Apparence
          </button>

          <button
            onClick={() => handleSectionClick('homepage')}
            className={`w-full flex items-center p-3 rounded-lg transition-all ${activeSection === 'homepage' ? 'bg-purple-500/20 text-purple-300' : 'hover:bg-purple-500/10 text-gray-300'}`}
          >
            <Home className="h-5 w-5 mr-3" />
            Page d&apos;accueil
          </button>

          <button
            onClick={() => handleSectionClick('notifications')}
            className={`w-full flex items-center p-3 rounded-lg transition-all ${activeSection === 'notifications' ? 'bg-purple-500/20 text-purple-300' : 'hover:bg-purple-500/10 text-gray-300'}`}
          >
            <Bell className="h-5 w-5 mr-3" />
            Notifications
          </button>

          <button
            onClick={() => handleSectionClick('security')}
            className={`w-full flex items-center p-3 rounded-lg transition-all ${activeSection === 'security' ? 'bg-purple-500/20 text-purple-300' : 'hover:bg-purple-500/10 text-gray-300'}`}
          >
            <Shield className="h-5 w-5 mr-3" />
            Sécurité
          </button>

          <button
            onClick={() => handleSectionClick('api')}
            className={`w-full flex items-center p-3 rounded-lg transition-all ${activeSection === 'api' ? 'bg-purple-500/20 text-purple-300' : 'hover:bg-purple-500/10 text-gray-300'}`}
          >
            <Globe className="h-5 w-5 mr-3" />
            API & Intégrations
          </button>

          <button
            onClick={() => handleSectionClick('images')}
            className={`w-full flex items-center p-3 rounded-lg transition-all ${activeSection === 'images' ? 'bg-purple-500/20 text-purple-300' : 'hover:bg-purple-500/10 text-gray-300'}`}
          >
            <ImageIcon className="h-5 w-5 mr-3" />
            Gérer les images
          </button>
        </nav>

        <div className="mt-8 p-4 bg-purple-900/20 rounded-lg border border-purple-500/20">
          <h3 className="text-purple-300 font-semibold mb-2 flex items-center">
            <Zap className="h-4 w-4 mr-2" />
            Info
          </h3>
          <p className="text-xs text-gray-400">
            Les modifications apportées aux configurations seront appliquées immédiatement après la
            sauvegarde. Certains changements peuvent nécessiter un redémarrage du serveur.
          </p>
        </div>
      </div>
    </div>
  );
}
