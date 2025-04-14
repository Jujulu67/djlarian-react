'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Settings,
  Globe,
  Layout,
  Bell,
  Shield,
  Mail,
  Save,
  RotateCcw,
  Zap,
  Clock,
  Calendar,
  User,
  Database,
  RefreshCcw,
  Lock,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

type ConfigSection = 'general' | 'appearance' | 'notifications' | 'security' | 'api';

export default function ConfigurationPage() {
  const [activeSection, setActiveSection] = useState<ConfigSection>('general');
  const [loading, setLoading] = useState(false);

  // États pour stocker les configurations
  const [generalConfig, setGeneralConfig] = useState({
    siteName: 'DJ Larian',
    siteDescription: 'Site officiel de DJ Larian - Musique électronique et événements.',
    contactEmail: 'contact@djlarian.com',
    timeZone: 'Europe/Paris',
    dateFormat: 'DD/MM/YYYY',
  });

  const [appearanceConfig, setAppearanceConfig] = useState({
    primaryColor: '#8B5CF6',
    secondaryColor: '#3B82F6',
    darkMode: true,
    animationsEnabled: true,
    logoUrl: '/images/logo.png',
    faviconUrl: '/favicon.ico',
  });

  const [notificationsConfig, setNotificationsConfig] = useState({
    emailNotifications: true,
    adminAlerts: true,
    newUserNotifications: true,
    eventReminders: true,
    marketingEmails: false,
  });

  const [securityConfig, setSecurityConfig] = useState({
    twoFactorAuth: false,
    passwordExpiration: 90,
    ipRestriction: false,
    failedLoginLimit: 5,
    sessionTimeout: 60,
  });

  const [apiConfig, setApiConfig] = useState({
    apiEnabled: true,
    rateLimit: 100,
    webhookUrl: '',
    umamiEnabled: true,
    umamiSiteId: 'your-umami-site-id',
  });

  // Simuler un chargement initial
  useEffect(() => {
    setLoading(true);
    // Simulation d'un appel API pour charger les configurations
    setTimeout(() => {
      setLoading(false);
    }, 800);
  }, []);

  // Fonction pour sauvegarder les configurations
  const saveConfigurations = () => {
    setLoading(true);
    // Simuler un appel API pour enregistrer les configurations
    setTimeout(() => {
      setLoading(false);
      // Afficher une notification de succès
      alert('Configurations sauvegardées avec succès !');
    }, 1000);
  };

  // Fonction pour réinitialiser les configurations
  const resetConfigurations = () => {
    if (confirm('Êtes-vous sûr de vouloir réinitialiser les configurations ?')) {
      setLoading(true);
      // Simuler un appel API pour réinitialiser les configurations
      setTimeout(() => {
        // Réinitialiser les états
        setGeneralConfig({
          siteName: 'DJ Larian',
          siteDescription: 'Site officiel de DJ Larian - Musique électronique et événements.',
          contactEmail: 'contact@djlarian.com',
          timeZone: 'Europe/Paris',
          dateFormat: 'DD/MM/YYYY',
        });

        setAppearanceConfig({
          primaryColor: '#8B5CF6',
          secondaryColor: '#3B82F6',
          darkMode: true,
          animationsEnabled: true,
          logoUrl: '/images/logo.png',
          faviconUrl: '/favicon.ico',
        });

        setNotificationsConfig({
          emailNotifications: true,
          adminAlerts: true,
          newUserNotifications: true,
          eventReminders: true,
          marketingEmails: false,
        });

        setSecurityConfig({
          twoFactorAuth: false,
          passwordExpiration: 90,
          ipRestriction: false,
          failedLoginLimit: 5,
          sessionTimeout: 60,
        });

        setApiConfig({
          apiEnabled: true,
          rateLimit: 100,
          webhookUrl: '',
          umamiEnabled: true,
          umamiSiteId: 'your-umami-site-id',
        });

        setLoading(false);
        // Afficher une notification de succès
        alert('Configurations réinitialisées avec succès !');
      }, 1000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-[#0c0117] to-black">
        <p className="text-white text-xl">Chargement des configurations...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-[#0c0117] to-black text-white">
      <div className="container mx-auto px-4 py-12">
        <div className="mb-8">
          <Link
            href="/admin"
            className="flex items-center text-purple-400 hover:text-purple-300 transition-colors mb-6"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour au panel admin
          </Link>

          <div className="flex justify-between items-center mb-4">
            <h1 className="text-4xl font-audiowide text-white">
              <span className="text-gradient">Configuration</span>
            </h1>

            <div className="flex space-x-3">
              <Button
                variant="outline"
                className="flex items-center border border-red-500/30 text-red-400 hover:bg-red-500/10"
                onClick={resetConfigurations}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Réinitialiser
              </Button>

              <Button
                className="flex items-center bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500"
                onClick={saveConfigurations}
              >
                <Save className="mr-2 h-4 w-4" />
                Sauvegarder
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Sidebar de navigation */}
          <div className="col-span-12 lg:col-span-3">
            <div className="glass p-6 rounded-xl backdrop-blur-md border border-purple-500/20">
              <h2 className="text-xl font-semibold mb-4 text-purple-300">Sections</h2>
              <nav className="space-y-1">
                <button
                  onClick={() => setActiveSection('general')}
                  className={`w-full flex items-center p-3 rounded-lg transition-all ${
                    activeSection === 'general'
                      ? 'bg-purple-500/20 text-purple-300'
                      : 'hover:bg-purple-500/10 text-gray-300'
                  }`}
                >
                  <Settings className="h-5 w-5 mr-3" />
                  Général
                </button>

                <button
                  onClick={() => setActiveSection('appearance')}
                  className={`w-full flex items-center p-3 rounded-lg transition-all ${
                    activeSection === 'appearance'
                      ? 'bg-purple-500/20 text-purple-300'
                      : 'hover:bg-purple-500/10 text-gray-300'
                  }`}
                >
                  <Layout className="h-5 w-5 mr-3" />
                  Apparence
                </button>

                <button
                  onClick={() => setActiveSection('notifications')}
                  className={`w-full flex items-center p-3 rounded-lg transition-all ${
                    activeSection === 'notifications'
                      ? 'bg-purple-500/20 text-purple-300'
                      : 'hover:bg-purple-500/10 text-gray-300'
                  }`}
                >
                  <Bell className="h-5 w-5 mr-3" />
                  Notifications
                </button>

                <button
                  onClick={() => setActiveSection('security')}
                  className={`w-full flex items-center p-3 rounded-lg transition-all ${
                    activeSection === 'security'
                      ? 'bg-purple-500/20 text-purple-300'
                      : 'hover:bg-purple-500/10 text-gray-300'
                  }`}
                >
                  <Shield className="h-5 w-5 mr-3" />
                  Sécurité
                </button>

                <button
                  onClick={() => setActiveSection('api')}
                  className={`w-full flex items-center p-3 rounded-lg transition-all ${
                    activeSection === 'api'
                      ? 'bg-purple-500/20 text-purple-300'
                      : 'hover:bg-purple-500/10 text-gray-300'
                  }`}
                >
                  <Globe className="h-5 w-5 mr-3" />
                  API & Intégrations
                </button>
              </nav>

              <div className="mt-8 p-4 bg-purple-900/20 rounded-lg border border-purple-500/20">
                <h3 className="text-purple-300 font-semibold mb-2 flex items-center">
                  <Zap className="h-4 w-4 mr-2" />
                  Info
                </h3>
                <p className="text-xs text-gray-400">
                  Les modifications apportées aux configurations seront appliquées immédiatement
                  après la sauvegarde. Certains changements peuvent nécessiter un redémarrage du
                  serveur.
                </p>
              </div>
            </div>
          </div>

          {/* Zone de contenu principal */}
          <div className="col-span-12 lg:col-span-9">
            <div className="glass rounded-xl backdrop-blur-md overflow-hidden border border-purple-500/20">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-600/5 via-indigo-600/5 to-blue-600/5 opacity-70 transition-opacity"></div>

              {activeSection === 'general' && (
                <div className="p-6 relative z-10">
                  <h2 className="text-2xl font-audiowide text-white mb-6 pb-2 border-b border-purple-500/20">
                    Configuration Générale
                  </h2>

                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="siteName">Nom du site</Label>
                        <Input
                          id="siteName"
                          value={generalConfig.siteName}
                          onChange={(e) =>
                            setGeneralConfig({ ...generalConfig, siteName: e.target.value })
                          }
                          className="bg-purple-500/10 border-purple-500/20 focus:border-purple-500/50"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="contactEmail">Email de contact</Label>
                        <Input
                          id="contactEmail"
                          type="email"
                          value={generalConfig.contactEmail}
                          onChange={(e) =>
                            setGeneralConfig({ ...generalConfig, contactEmail: e.target.value })
                          }
                          className="bg-purple-500/10 border-purple-500/20 focus:border-purple-500/50"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="siteDescription">Description du site</Label>
                      <Textarea
                        id="siteDescription"
                        value={generalConfig.siteDescription}
                        onChange={(e) =>
                          setGeneralConfig({ ...generalConfig, siteDescription: e.target.value })
                        }
                        className="bg-purple-500/10 border-purple-500/20 focus:border-purple-500/50"
                        rows={3}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="timeZone">Fuseau horaire</Label>
                        <select
                          id="timeZone"
                          value={generalConfig.timeZone}
                          onChange={(e) =>
                            setGeneralConfig({ ...generalConfig, timeZone: e.target.value })
                          }
                          className="w-full bg-purple-500/10 border border-purple-500/20 focus:border-purple-500/50 rounded-md p-2 text-white"
                        >
                          <option value="Europe/Paris">Europe/Paris</option>
                          <option value="America/New_York">America/New_York</option>
                          <option value="Asia/Tokyo">Asia/Tokyo</option>
                          <option value="Australia/Sydney">Australia/Sydney</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="dateFormat">Format de date</Label>
                        <select
                          id="dateFormat"
                          value={generalConfig.dateFormat}
                          onChange={(e) =>
                            setGeneralConfig({ ...generalConfig, dateFormat: e.target.value })
                          }
                          className="w-full bg-purple-500/10 border border-purple-500/20 focus:border-purple-500/50 rounded-md p-2 text-white"
                        >
                          <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                          <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                          <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'appearance' && (
                <div className="p-6 relative z-10">
                  <h2 className="text-2xl font-audiowide text-white mb-6 pb-2 border-b border-purple-500/20">
                    Apparence
                  </h2>

                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="primaryColor">Couleur primaire</Label>
                        <div className="flex items-center space-x-2">
                          <Input
                            id="primaryColor"
                            type="color"
                            value={appearanceConfig.primaryColor}
                            onChange={(e) =>
                              setAppearanceConfig({
                                ...appearanceConfig,
                                primaryColor: e.target.value,
                              })
                            }
                            className="w-16 h-10 p-1 bg-transparent border border-purple-500/20"
                          />
                          <Input
                            type="text"
                            value={appearanceConfig.primaryColor}
                            onChange={(e) =>
                              setAppearanceConfig({
                                ...appearanceConfig,
                                primaryColor: e.target.value,
                              })
                            }
                            className="bg-purple-500/10 border-purple-500/20 focus:border-purple-500/50"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="secondaryColor">Couleur secondaire</Label>
                        <div className="flex items-center space-x-2">
                          <Input
                            id="secondaryColor"
                            type="color"
                            value={appearanceConfig.secondaryColor}
                            onChange={(e) =>
                              setAppearanceConfig({
                                ...appearanceConfig,
                                secondaryColor: e.target.value,
                              })
                            }
                            className="w-16 h-10 p-1 bg-transparent border border-purple-500/20"
                          />
                          <Input
                            type="text"
                            value={appearanceConfig.secondaryColor}
                            onChange={(e) =>
                              setAppearanceConfig({
                                ...appearanceConfig,
                                secondaryColor: e.target.value,
                              })
                            }
                            className="bg-purple-500/10 border-purple-500/20 focus:border-purple-500/50"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="logoUrl">URL du logo</Label>
                        <Input
                          id="logoUrl"
                          value={appearanceConfig.logoUrl}
                          onChange={(e) =>
                            setAppearanceConfig({ ...appearanceConfig, logoUrl: e.target.value })
                          }
                          className="bg-purple-500/10 border-purple-500/20 focus:border-purple-500/50"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="faviconUrl">URL du favicon</Label>
                        <Input
                          id="faviconUrl"
                          value={appearanceConfig.faviconUrl}
                          onChange={(e) =>
                            setAppearanceConfig({ ...appearanceConfig, faviconUrl: e.target.value })
                          }
                          className="bg-purple-500/10 border-purple-500/20 focus:border-purple-500/50"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-purple-500/10 rounded-lg border border-purple-500/20">
                      <div className="flex items-center">
                        <span className="text-white mr-3">Mode sombre</span>
                        <span className="text-xs text-gray-400">
                          Activer le thème sombre par défaut
                        </span>
                      </div>
                      <Switch
                        checked={appearanceConfig.darkMode}
                        onCheckedChange={(checked) =>
                          setAppearanceConfig({ ...appearanceConfig, darkMode: checked })
                        }
                        className="data-[state=checked]:bg-purple-600"
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-purple-500/10 rounded-lg border border-purple-500/20">
                      <div className="flex items-center">
                        <span className="text-white mr-3">Animations</span>
                        <span className="text-xs text-gray-400">
                          Activer les animations de l'interface
                        </span>
                      </div>
                      <Switch
                        checked={appearanceConfig.animationsEnabled}
                        onCheckedChange={(checked) =>
                          setAppearanceConfig({ ...appearanceConfig, animationsEnabled: checked })
                        }
                        className="data-[state=checked]:bg-purple-600"
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'notifications' && (
                <div className="p-6 relative z-10">
                  <h2 className="text-2xl font-audiowide text-white mb-6 pb-2 border-b border-purple-500/20">
                    Notifications
                  </h2>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-purple-500/10 rounded-lg border border-purple-500/20">
                      <div className="flex flex-col">
                        <span className="text-white font-medium">Notifications par email</span>
                        <span className="text-xs text-gray-400">
                          Envoyer des notifications par email
                        </span>
                      </div>
                      <Switch
                        checked={notificationsConfig.emailNotifications}
                        onCheckedChange={(checked) =>
                          setNotificationsConfig({
                            ...notificationsConfig,
                            emailNotifications: checked,
                          })
                        }
                        className="data-[state=checked]:bg-purple-600"
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-purple-500/10 rounded-lg border border-purple-500/20">
                      <div className="flex flex-col">
                        <span className="text-white font-medium">Alertes administrateur</span>
                        <span className="text-xs text-gray-400">
                          Recevoir des alertes pour les actions administratives
                        </span>
                      </div>
                      <Switch
                        checked={notificationsConfig.adminAlerts}
                        onCheckedChange={(checked) =>
                          setNotificationsConfig({ ...notificationsConfig, adminAlerts: checked })
                        }
                        className="data-[state=checked]:bg-purple-600"
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-purple-500/10 rounded-lg border border-purple-500/20">
                      <div className="flex flex-col">
                        <span className="text-white font-medium">Nouveaux utilisateurs</span>
                        <span className="text-xs text-gray-400">
                          Notifications lors de l'inscription de nouveaux utilisateurs
                        </span>
                      </div>
                      <Switch
                        checked={notificationsConfig.newUserNotifications}
                        onCheckedChange={(checked) =>
                          setNotificationsConfig({
                            ...notificationsConfig,
                            newUserNotifications: checked,
                          })
                        }
                        className="data-[state=checked]:bg-purple-600"
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-purple-500/10 rounded-lg border border-purple-500/20">
                      <div className="flex flex-col">
                        <span className="text-white font-medium">Rappels d'événements</span>
                        <span className="text-xs text-gray-400">
                          Rappels automatiques avant les événements
                        </span>
                      </div>
                      <Switch
                        checked={notificationsConfig.eventReminders}
                        onCheckedChange={(checked) =>
                          setNotificationsConfig({
                            ...notificationsConfig,
                            eventReminders: checked,
                          })
                        }
                        className="data-[state=checked]:bg-purple-600"
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-purple-500/10 rounded-lg border border-purple-500/20">
                      <div className="flex flex-col">
                        <span className="text-white font-medium">Emails marketing</span>
                        <span className="text-xs text-gray-400">
                          Envoyer des emails promotionnels aux utilisateurs
                        </span>
                      </div>
                      <Switch
                        checked={notificationsConfig.marketingEmails}
                        onCheckedChange={(checked) =>
                          setNotificationsConfig({
                            ...notificationsConfig,
                            marketingEmails: checked,
                          })
                        }
                        className="data-[state=checked]:bg-purple-600"
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'security' && (
                <div className="p-6 relative z-10">
                  <h2 className="text-2xl font-audiowide text-white mb-6 pb-2 border-b border-purple-500/20">
                    Sécurité
                  </h2>

                  <div className="space-y-6">
                    <div className="flex items-center justify-between p-4 bg-purple-500/10 rounded-lg border border-purple-500/20">
                      <div className="flex flex-col">
                        <span className="text-white font-medium">
                          Authentification à deux facteurs
                        </span>
                        <span className="text-xs text-gray-400">
                          Exiger la 2FA pour les comptes administrateurs
                        </span>
                      </div>
                      <Switch
                        checked={securityConfig.twoFactorAuth}
                        onCheckedChange={(checked) =>
                          setSecurityConfig({ ...securityConfig, twoFactorAuth: checked })
                        }
                        className="data-[state=checked]:bg-purple-600"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="passwordExpiration">
                          Expiration du mot de passe (jours)
                        </Label>
                        <Input
                          id="passwordExpiration"
                          type="number"
                          value={securityConfig.passwordExpiration}
                          onChange={(e) =>
                            setSecurityConfig({
                              ...securityConfig,
                              passwordExpiration: parseInt(e.target.value),
                            })
                          }
                          min="0"
                          className="bg-purple-500/10 border-purple-500/20 focus:border-purple-500/50"
                        />
                        <p className="text-xs text-gray-400">0 = pas d'expiration</p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="failedLoginLimit">Limite de tentatives de connexion</Label>
                        <Input
                          id="failedLoginLimit"
                          type="number"
                          value={securityConfig.failedLoginLimit}
                          onChange={(e) =>
                            setSecurityConfig({
                              ...securityConfig,
                              failedLoginLimit: parseInt(e.target.value),
                            })
                          }
                          min="1"
                          className="bg-purple-500/10 border-purple-500/20 focus:border-purple-500/50"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="sessionTimeout">Timeout de session (minutes)</Label>
                      <Input
                        id="sessionTimeout"
                        type="number"
                        value={securityConfig.sessionTimeout}
                        onChange={(e) =>
                          setSecurityConfig({
                            ...securityConfig,
                            sessionTimeout: parseInt(e.target.value),
                          })
                        }
                        min="5"
                        className="bg-purple-500/10 border-purple-500/20 focus:border-purple-500/50"
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-purple-500/10 rounded-lg border border-purple-500/20">
                      <div className="flex flex-col">
                        <span className="text-white font-medium">Restriction IP</span>
                        <span className="text-xs text-gray-400">
                          Limiter l'accès admin à certaines adresses IP
                        </span>
                      </div>
                      <Switch
                        checked={securityConfig.ipRestriction}
                        onCheckedChange={(checked) =>
                          setSecurityConfig({ ...securityConfig, ipRestriction: checked })
                        }
                        className="data-[state=checked]:bg-purple-600"
                      />
                    </div>

                    <div className="p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                      <div className="flex items-start">
                        <Lock className="h-5 w-5 text-yellow-400 mr-3 mt-0.5" />
                        <p className="text-sm text-gray-300">
                          Les paramètres de sécurité avancés tels que les politiques de mot de passe
                          et les journaux d'audit peuvent être configurés via le panneau de sécurité
                          dédié.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'api' && (
                <div className="p-6 relative z-10">
                  <h2 className="text-2xl font-audiowide text-white mb-6 pb-2 border-b border-purple-500/20">
                    API & Intégrations
                  </h2>

                  <div className="space-y-6">
                    <div className="flex items-center justify-between p-4 bg-purple-500/10 rounded-lg border border-purple-500/20">
                      <div className="flex flex-col">
                        <span className="text-white font-medium">API activée</span>
                        <span className="text-xs text-gray-400">Activer l'accès API</span>
                      </div>
                      <Switch
                        checked={apiConfig.apiEnabled}
                        onCheckedChange={(checked) =>
                          setApiConfig({ ...apiConfig, apiEnabled: checked })
                        }
                        className="data-[state=checked]:bg-purple-600"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="rateLimit">Limite de requêtes API (par minute)</Label>
                      <Input
                        id="rateLimit"
                        type="number"
                        value={apiConfig.rateLimit}
                        onChange={(e) =>
                          setApiConfig({ ...apiConfig, rateLimit: parseInt(e.target.value) })
                        }
                        min="10"
                        className="bg-purple-500/10 border-purple-500/20 focus:border-purple-500/50"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="webhookUrl">URL de Webhook</Label>
                      <Input
                        id="webhookUrl"
                        type="url"
                        value={apiConfig.webhookUrl}
                        onChange={(e) => setApiConfig({ ...apiConfig, webhookUrl: e.target.value })}
                        placeholder="https://example.com/webhook"
                        className="bg-purple-500/10 border-purple-500/20 focus:border-purple-500/50"
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-purple-500/10 rounded-lg border border-purple-500/20">
                      <div className="flex flex-col">
                        <span className="text-white font-medium">Umami Analytics</span>
                        <span className="text-xs text-gray-400">Activer le suivi Umami</span>
                      </div>
                      <Switch
                        checked={apiConfig.umamiEnabled}
                        onCheckedChange={(checked) =>
                          setApiConfig({ ...apiConfig, umamiEnabled: checked })
                        }
                        className="data-[state=checked]:bg-purple-600"
                      />
                    </div>

                    {apiConfig.umamiEnabled && (
                      <div className="space-y-2">
                        <Label htmlFor="umamiSiteId">ID du site Umami</Label>
                        <Input
                          id="umamiSiteId"
                          value={apiConfig.umamiSiteId}
                          onChange={(e) =>
                            setApiConfig({ ...apiConfig, umamiSiteId: e.target.value })
                          }
                          className="bg-purple-500/10 border-purple-500/20 focus:border-purple-500/50"
                        />
                      </div>
                    )}

                    <div className="p-4 bg-purple-900/20 rounded-lg border border-purple-500/20">
                      <div className="flex items-start">
                        <RefreshCcw className="h-5 w-5 text-purple-400 mr-3 mt-0.5" />
                        <div>
                          <h3 className="text-purple-300 font-semibold mb-1">
                            Régénérer les clés API
                          </h3>
                          <p className="text-xs text-gray-400 mb-3">
                            Vous pouvez régénérer vos clés API si nécessaire. Toutes les
                            applications utilisant actuellement ces clés devront être mises à jour.
                          </p>
                          <Button
                            variant="outline"
                            className="border border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
                          >
                            Régénérer les clés API
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Cartes d'informations système */}
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
      </div>
    </div>
  );
}
