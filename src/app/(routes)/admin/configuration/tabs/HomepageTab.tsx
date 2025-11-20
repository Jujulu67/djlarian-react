'use client';

import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Home, Music, Eye, CalendarDays, Video, GripVertical } from 'lucide-react';

import NumberInput from '@/components/config/NumberInput';
import ToggleRow from '@/components/config/ToggleRow';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useConfigs } from '@/stores/useConfigs';
import { AllConfigs, HomepageConfig } from '@/types/config';

export default function HomepageTab() {
  const { homepage, update } = useConfigs();

  // Gérer le drag and drop pour l'ordre des sections
  const handleDragEnd = (result: {
    destination?: { index: number } | null;
    source: { index: number };
  }) => {
    if (!result.destination) return;

    const sections = homepage.sectionsOrder.split(',').filter(Boolean);
    const [reorderedItem] = sections.splice(result.source.index, 1);
    sections.splice(result.destination.index, 0, reorderedItem);

    update('homepage', 'sectionsOrder', sections.join(','));
  };

  const getSectionInfo = (id: string) => {
    switch (id) {
      case 'hero':
        return { icon: <Home className="h-4 w-4" />, name: 'Héro' };
      case 'releases':
        return { icon: <Music className="h-4 w-4" />, name: 'Sorties' };
      case 'visualizer':
        return { icon: <Eye className="h-4 w-4" />, name: 'Visualiseur' };
      case 'events':
        return { icon: <CalendarDays className="h-4 w-4" />, name: 'Événements' };
      case 'stream':
        return { icon: <Video className="h-4 w-4" />, name: 'Stream' };
      default:
        return { icon: <div className="h-4 w-4" />, name: id };
    }
  };

  return (
    <div className="p-6 relative z-10">
      <h2 className="text-2xl font-audiowide text-white mb-6 pb-2 border-b border-purple-500/20">
        Configuration de la page d&apos;accueil
      </h2>

      <Tabs defaultValue="hero" className="w-full">
        <TabsList className="flex mb-6 p-1 bg-black/30 border border-purple-500/20 rounded-xl overflow-hidden">
          <TabsTrigger value="hero" className="flex-1 tab-trigger">
            <Home className="w-4 h-4 mr-2" /> Héro
          </TabsTrigger>
          <TabsTrigger value="releases" className="flex-1 tab-trigger">
            <Music className="w-4 h-4 mr-2" /> Sorties
          </TabsTrigger>
          <TabsTrigger value="visualizer" className="flex-1 tab-trigger">
            <Eye className="w-4 h-4 mr-2" /> Visualiseur
          </TabsTrigger>
          <TabsTrigger value="events" className="flex-1 tab-trigger">
            <CalendarDays className="w-4 h-4 mr-2" /> Événements
          </TabsTrigger>
          <TabsTrigger value="stream" className="flex-1 tab-trigger">
            <Video className="w-4 h-4 mr-2" /> Stream
          </TabsTrigger>
        </TabsList>

        {/* --- Onglet Héro --- */}
        <TabsContent value="hero" className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="heroTitle">Titre principal</Label>
            <Input
              id="heroTitle"
              value={homepage.heroTitle}
              onChange={(e) => update('homepage', 'heroTitle', e.target.value)}
              className="input-style"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="heroSubtitle">Sous-titre</Label>
            <Input
              id="heroSubtitle"
              value={homepage.heroSubtitle}
              onChange={(e) => update('homepage', 'heroSubtitle', e.target.value)}
              className="input-style"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="heroExploreButtonText">Texte du bouton Explorer</Label>
              <Input
                id="heroExploreButtonText"
                value={homepage.heroExploreButtonText}
                onChange={(e) => update('homepage', 'heroExploreButtonText', e.target.value)}
                className="input-style"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="heroExploreButtonUrl">URL du bouton Explorer</Label>
              <Input
                id="heroExploreButtonUrl"
                value={homepage.heroExploreButtonUrl}
                onChange={(e) => update('homepage', 'heroExploreButtonUrl', e.target.value)}
                className="input-style"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="heroEventsButtonText">Texte du bouton Événements</Label>
              <Input
                id="heroEventsButtonText"
                value={homepage.heroEventsButtonText}
                onChange={(e) => update('homepage', 'heroEventsButtonText', e.target.value)}
                className="input-style"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="heroEventsButtonUrl">URL du bouton Événements</Label>
              <Input
                id="heroEventsButtonUrl"
                value={homepage.heroEventsButtonUrl}
                onChange={(e) => update('homepage', 'heroEventsButtonUrl', e.target.value)}
                className="input-style"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="heroBackgroundVideo">URL de la vidéo d&apos;arrière-plan</Label>
            <Input
              id="heroBackgroundVideo"
              value={homepage.heroBackgroundVideo}
              onChange={(e) => update('homepage', 'heroBackgroundVideo', e.target.value)}
              className="input-style"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="heroPosterImage">URL de l&apos;image poster (fallback vidéo)</Label>
            <Input
              id="heroPosterImage"
              value={homepage.heroPosterImage}
              onChange={(e) => update('homepage', 'heroPosterImage', e.target.value)}
              className="input-style"
            />
          </div>
        </TabsContent>

        {/* --- Onglet Sorties --- */}
        <TabsContent value="releases" className="space-y-6">
          <ToggleRow
            label="Section Sorties"
            desc="Afficher la section des dernières sorties"
            value={homepage.releasesEnabled}
            onChange={(checked) => update('homepage', 'releasesEnabled', checked)}
          />
          <div className="space-y-2">
            <Label htmlFor="releasesTitle">Titre de la section</Label>
            <Input
              id="releasesTitle"
              value={homepage.releasesTitle}
              onChange={(e) => update('homepage', 'releasesTitle', e.target.value)}
              className="input-style"
              disabled={!homepage.releasesEnabled}
            />
          </div>
          <NumberInput
            id="releasesCount"
            label="Nombre de sorties à afficher"
            value={homepage.releasesCount}
            onChange={(v) => update('homepage', 'releasesCount', v)}
            min={1}
            max={6}
            className="input-style"
            disabled={!homepage.releasesEnabled}
          />
        </TabsContent>

        {/* --- Onglet Visualiseur --- */}
        <TabsContent value="visualizer" className="space-y-6">
          <ToggleRow
            label="Section Visualiseur"
            desc="Afficher la section du visualiseur audio"
            value={homepage.visualizerEnabled}
            onChange={(checked) => update('homepage', 'visualizerEnabled', checked)}
          />
          <div className="space-y-2">
            <Label htmlFor="visualizerTitle">Titre de la section</Label>
            <Input
              id="visualizerTitle"
              value={homepage.visualizerTitle}
              onChange={(e) => update('homepage', 'visualizerTitle', e.target.value)}
              className="input-style"
              disabled={!homepage.visualizerEnabled}
            />
          </div>
        </TabsContent>

        {/* --- Onglet Événements --- */}
        <TabsContent value="events" className="space-y-6">
          <ToggleRow
            label="Section Événements"
            desc="Afficher la section des événements à venir"
            value={homepage.eventsEnabled}
            onChange={(checked) => update('homepage', 'eventsEnabled', checked)}
          />
          <div className="space-y-2">
            <Label htmlFor="eventsTitle">Titre de la section</Label>
            <Input
              id="eventsTitle"
              value={homepage.eventsTitle}
              onChange={(e) => update('homepage', 'eventsTitle', e.target.value)}
              className="input-style"
              disabled={!homepage.eventsEnabled}
            />
          </div>
          <NumberInput
            id="eventsCount"
            label="Nombre d'événements à afficher"
            value={homepage.eventsCount}
            onChange={(v) => update('homepage', 'eventsCount', v)}
            min={1}
            max={10}
            className="input-style"
            disabled={!homepage.eventsEnabled}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="eventsViewAllText">Texte du lien &quot;Voir tout&quot;</Label>
              <Input
                id="eventsViewAllText"
                value={homepage.eventsViewAllText}
                onChange={(e) => update('homepage', 'eventsViewAllText', e.target.value)}
                className="input-style"
                disabled={!homepage.eventsEnabled}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="eventsViewAllUrl">URL du lien &quot;Voir tout&quot;</Label>
              <Input
                id="eventsViewAllUrl"
                value={homepage.eventsViewAllUrl}
                onChange={(e) => update('homepage', 'eventsViewAllUrl', e.target.value)}
                className="input-style"
                disabled={!homepage.eventsEnabled}
              />
            </div>
          </div>
        </TabsContent>

        {/* --- Onglet Stream --- */}
        <TabsContent value="stream" className="space-y-6">
          <ToggleRow
            label="Section Stream"
            desc="Afficher la section de diffusion en direct"
            value={homepage.streamEnabled}
            onChange={(checked) => update('homepage', 'streamEnabled', checked)}
          />
          <div className="space-y-2">
            <Label htmlFor="streamTitle">Titre de la section</Label>
            <Input
              id="streamTitle"
              value={homepage.streamTitle}
              onChange={(e) => update('homepage', 'streamTitle', e.target.value)}
              className="input-style"
              disabled={!homepage.streamEnabled}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="streamSubtitle">Sous-titre</Label>
            <Input
              id="streamSubtitle"
              value={homepage.streamSubtitle}
              onChange={(e) => update('homepage', 'streamSubtitle', e.target.value)}
              className="input-style"
              disabled={!homepage.streamEnabled}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="streamDescription">Description</Label>
            <Textarea
              id="streamDescription"
              value={homepage.streamDescription}
              onChange={(e) => update('homepage', 'streamDescription', e.target.value)}
              className="input-style"
              rows={3}
              disabled={!homepage.streamEnabled}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="twitchUsername">Nom d&apos;utilisateur Twitch</Label>
            <Input
              id="twitchUsername"
              value={homepage.twitchUsername}
              onChange={(e) => update('homepage', 'twitchUsername', e.target.value)}
              className="input-style"
              disabled={!homepage.streamEnabled}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="twitchFollowButtonText">Texte du bouton Suivre</Label>
              <Input
                id="twitchFollowButtonText"
                value={homepage.twitchFollowButtonText}
                onChange={(e) => update('homepage', 'twitchFollowButtonText', e.target.value)}
                className="input-style"
                disabled={!homepage.streamEnabled}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="twitchFollowButtonUrl">URL du bouton Suivre</Label>
              <Input
                id="twitchFollowButtonUrl"
                value={homepage.twitchFollowButtonUrl}
                onChange={(e) => update('homepage', 'twitchFollowButtonUrl', e.target.value)}
                className="input-style"
                disabled={!homepage.streamEnabled}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="streamNotifyButtonText">Texte du bouton de notification</Label>
            <Input
              id="streamNotifyButtonText"
              value={homepage.streamNotifyButtonText}
              onChange={(e) => update('homepage', 'streamNotifyButtonText', e.target.value)}
              className="input-style"
              disabled={!homepage.streamEnabled}
            />
          </div>
          <ToggleRow
            label="Statistiques de stream"
            desc="Afficher les statistiques de diffusion"
            value={homepage.streamStatsEnabled}
            onChange={(checked) => update('homepage', 'streamStatsEnabled', checked)}
            disabled={!homepage.streamEnabled}
          />
          {homepage.streamStatsEnabled && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="streamFollowers">Nombre de followers</Label>
                <Input
                  id="streamFollowers"
                  value={homepage.streamFollowers}
                  onChange={(e) => update('homepage', 'streamFollowers', e.target.value)}
                  className="input-style"
                  disabled={!homepage.streamEnabled}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="streamHoursStreamed">Heures de stream</Label>
                <Input
                  id="streamHoursStreamed"
                  value={homepage.streamHoursStreamed}
                  onChange={(e) => update('homepage', 'streamHoursStreamed', e.target.value)}
                  className="input-style"
                  disabled={!homepage.streamEnabled}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="streamTracksPlayed">Pistes jouées</Label>
                <Input
                  id="streamTracksPlayed"
                  value={homepage.streamTracksPlayed}
                  onChange={(e) => update('homepage', 'streamTracksPlayed', e.target.value)}
                  className="input-style"
                  disabled={!homepage.streamEnabled}
                />
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* --- Ordre des sections (Drag and Drop) --- */}
      <div className="mt-8 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="sectionsOrder" className="flex items-center justify-between">
            <span>Ordre des sections</span>
            <span className="text-xs text-gray-400">Glissez-déposez pour réorganiser</span>
          </Label>
          <div className="bg-black/30 p-1 rounded-lg border border-purple-500/20">
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="sections-list" direction="vertical">
                {(provided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="space-y-2 p-2 min-h-[100px] rounded-md overflow-hidden bg-purple-500/5"
                  >
                    {homepage.sectionsOrder
                      .split(',')
                      .filter(Boolean)
                      .map((section, index) => {
                        const { icon, name } = getSectionInfo(section);
                        const isEnabled =
                          section === 'hero' ||
                          homepage[`${section}Enabled` as keyof HomepageConfig];

                        return (
                          <Draggable key={section} draggableId={section} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`draggable-item ${snapshot.isDragging ? 'dragging' : ''}`}
                                style={provided.draggableProps.style}
                              >
                                <div
                                  className={`handle ${snapshot.isDragging ? 'text-cyan-300' : 'text-gray-500'} hover:text-gray-300`}
                                >
                                  <GripVertical className="h-5 w-5" />
                                </div>
                                <div className="flex items-center text-white">
                                  <span
                                    className={`mr-2 ${snapshot.isDragging ? 'text-cyan-300' : 'text-purple-400'}`}
                                  >
                                    {icon}
                                  </span>
                                  <span
                                    className={snapshot.isDragging ? 'font-medium text-white' : ''}
                                  >
                                    {name}
                                  </span>
                                </div>
                                <div
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (section !== 'hero') {
                                      const prop = `${section}Enabled` as keyof HomepageConfig;
                                      update('homepage', prop, !homepage[prop]);
                                    }
                                  }}
                                  className={`ml-auto status-badge ${section === 'hero' ? 'always-active' : isEnabled ? 'active' : 'inactive'}`}
                                >
                                  {section === 'hero'
                                    ? 'Toujours actif'
                                    : isEnabled
                                      ? 'Actif'
                                      : 'Inactif'}
                                </div>
                              </div>
                            )}
                          </Draggable>
                        );
                      })}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          </div>
          <p className="text-xs text-gray-400">
            L&apos;ordre des sections détermine leur position sur la page d&apos;accueil. Les
            sections désactivées ne seront pas affichées.
          </p>
        </div>
      </div>

      {/* Styles CSS spécifiques pour les éléments (à déplacer potentiellement) */}
      <style jsx>{`
        .tab-trigger {
          flex: 1;
          padding: 0.75rem 1rem; /* py-3 px-4 */
          border-radius: 0.5rem; /* rounded-lg */
          transition: all 0.2s;
        }
        .tab-trigger[data-state='active'] {
          background-color: rgba(139, 92, 246, 0.2); /* bg-purple-600/20 */
          color: white;
          box-shadow: 0 0 10px rgba(139, 92, 246, 0.3);
        }
        .tab-trigger[data-state='inactive'] {
          color: #9ca3af; /* text-gray-400 */
        }
        .tab-trigger[data-state='inactive']:hover {
          color: #c4b5fd; /* hover:text-purple-300 */
        }
        .input-style {
          background-color: rgba(139, 92, 246, 0.1); /* bg-purple-500/10 */
          border: 1px solid rgba(139, 92, 246, 0.2); /* border-purple-500/20 */
        }
        .input-style:focus {
          border-color: rgba(139, 92, 246, 0.5); /* focus:border-purple-500/50 */
        }
        .input-style:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .draggable-item {
          background-color: rgba(139, 92, 246, 0.1); /* bg-purple-500/10 */
          border-radius: 0.375rem; /* rounded-md */
          border: 1px solid rgba(139, 92, 246, 0.2); /* border-purple-500/20 */
          display: flex;
          align-items: center;
          padding: 0.75rem; /* p-3 */
          transition:
            background-color 0.2s,
            border-color 0.2s;
        }
        .draggable-item:hover {
          background-color: rgba(139, 92, 246, 0.2); /* hover:bg-purple-500/20 */
        }
        .draggable-item.dragging {
          border-color: #22d3ee; /* border-cyan-400 */
          box-shadow:
            0 4px 6px -1px rgb(0 0 0 / 0.1),
            0 2px 4px -2px rgb(0 0 0 / 0.1); /* shadow-lg */
          background-color: rgba(88, 28, 135, 0.3); /* bg-purple-800/30 - Approximation */
          z-index: 50;
        }
        .handle {
          margin-right: 0.75rem; /* mr-3 */
          cursor: grab;
        }
        .draggable-item.dragging .handle {
          cursor: grabbing;
        }
        .status-badge {
          margin-left: auto; /* ml-auto */
          padding: 0.25rem 0.5rem; /* px-2 py-1 */
          font-size: 0.75rem; /* text-xs */
          border-radius: 9999px; /* rounded-full */
          cursor: pointer;
        }
        .status-badge.always-active {
          background-color: rgba(59, 130, 246, 0.2); /* bg-blue-500/20 */
          color: #93c5fd; /* text-blue-300 */
          cursor: default;
        }
        .status-badge.active {
          background-color: rgba(34, 197, 94, 0.2); /* bg-green-500/20 */
          color: #86efac; /* text-green-300 */
        }
        .status-badge.active:hover {
          background-color: rgba(34, 197, 94, 0.4); /* hover:bg-green-500/40 */
        }
        .status-badge.inactive {
          background-color: rgba(239, 68, 68, 0.2); /* bg-red-500/20 */
          color: #fca5a5; /* text-red-300 */
        }
        .status-badge.inactive:hover {
          background-color: rgba(239, 68, 68, 0.4); /* hover:bg-red-500/40 */
        }
        .toggle-row:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .toggle-row label span:first-child {
          /* Assurer que le label ne soit pas affecté par disabled */
          opacity: 1 !important;
        }
      `}</style>
    </div>
  );
}
