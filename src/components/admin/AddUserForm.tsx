'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { UserPlus, Loader2, Edit, Star } from 'lucide-react';

// Rétablir l'interface locale
interface User {
  id: string;
  email: string;
  name?: string | null;
  role: string; // Le formulaire gère une string
  isVip: boolean;
}

interface AddUserFormProps {
  onSuccess?: () => void;
  // Utiliser l'interface locale User
  userToEdit?: User;
}

// Ce composant contient uniquement le formulaire et sa logique
export default function AddUserForm({ onSuccess, userToEdit }: AddUserFormProps) {
  const router = useRouter(); // Peut être utile pour rafraîchir après succès
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('USER'); // Rôle par défaut
  const [isVip, setIsVip] = useState(false); // État pour le statut VIP
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditMode = Boolean(userToEdit); // Déterminer si on est en mode édition

  // Pré-remplir le formulaire si userToEdit est fourni
  useEffect(() => {
    if (isEditMode && userToEdit) {
      setEmail(userToEdit.email ?? ''); // Garder la gestion du null pour la robustesse
      setName(userToEdit.name ?? '');
      setRole(userToEdit.role ?? 'USER'); // Le type local attend une string
      setIsVip(userToEdit.isVip);
      setPassword('');
      setError(null); // Réinitialiser l'erreur
    }
    // Réinitialiser si userToEdit devient undefined (par exemple, si la modale est réutilisée)
    // Bien que dans notre cas, la modale se ferme/rouvre, c'est une bonne pratique.
    else {
      setEmail('');
      setName('');
      setPassword('');
      setRole('USER');
      setIsVip(false);
      setError(null);
    }
  }, [userToEdit]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // Déterminer l'URL et la méthode
    let url = '/api/users';
    const method = isEditMode ? 'PUT' : 'POST';

    if (isEditMode) {
      // Vérification explicite pour rassurer TypeScript et gérer un cas improbable
      if (!userToEdit) {
        console.error('Erreur: Mode édition actif mais userToEdit non défini.');
        setError(
          'Une erreur interne est survenue. Impossible de déterminer l&apos;utilisateur à modifier.'
        );
        setIsLoading(false);
        return;
      }
      url = `/api/users/${userToEdit.id}`; // Accès sécurisé ici
    }

    // Préparer le corps de la requête
    const body: any = {
      email,
      name: name || null, // Envoyer null si le nom est vide
      role, // Envoyer la valeur actuelle de l'état `role` (string)
      isVip,
    };

    // N'inclure le mot de passe que s'il est fourni (et en mode création, il est requis)
    // En mode édition, on ne l'envoie que s'il est modifié (non vide)
    if (password) {
      body.password = password;
    }

    // Valider que le mot de passe est fourni en mode création
    if (!isEditMode && !password) {
      setError('Le mot de passe est requis pour créer un utilisateur.');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(url, {
        // Utiliser l'URL et la méthode dynamiques
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body), // Utiliser le corps préparé
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || `Impossible de ${isEditMode ? 'modifier' : 'créer'} l'utilisateur.`
        );
      }

      // Succès
      console.log(`Utilisateur ${isEditMode ? 'modifié' : 'créé'}:`, data);
      if (onSuccess) {
        onSuccess(); // Appeler le callback (ex: pour fermer la modale et rafraîchir)
      }
      // Idéalement, afficher un toast/notification de succès
    } catch (err: any) {
      console.error(`Erreur lors de ${isEditMode ? 'la modification' : "l'ajout"}:`, err);
      setError(err.message || 'Une erreur est survenue.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-2xl font-semibold text-white mb-6 flex items-center">
        {/* Icône et titre dynamiques */}
        {isEditMode ? (
          <>
            <Edit className="h-6 w-6 mr-2 text-purple-400" /> Modifier l&apos;Utilisateur
          </>
        ) : (
          <>
            <UserPlus className="h-6 w-6 mr-2 text-purple-400" /> Ajout d&apos;utilisateur
          </>
        )}
      </h2>
      <div>
        <label
          htmlFor={isEditMode ? `email-edit-${userToEdit?.id}` : 'email-add'}
          className="block text-sm font-medium text-gray-300 mb-1"
        >
          Email <span className="text-red-500">*</span>
        </label>
        <input
          type="email"
          id={isEditMode ? `email-edit-${userToEdit?.id}` : 'email-add'} // Utiliser ?. pour la sécurité
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          placeholder="exemple@domaine.com"
          autoComplete="off" // Garder off pour la création/modif
        />
      </div>

      <div>
        <label
          htmlFor={isEditMode ? `name-edit-${userToEdit?.id}` : 'name-add'}
          className="block text-sm font-medium text-gray-300 mb-1"
        >
          Nom (Optionnel)
        </label>
        <input
          type="text"
          id={isEditMode ? `name-edit-${userToEdit?.id}` : 'name-add'} // Utiliser ?.
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          placeholder="Prénom Nom"
          autoComplete="off" // Garder off pour la création/modif
        />
      </div>

      <div>
        <label
          htmlFor={isEditMode ? `password-edit-${userToEdit?.id}` : 'password-add'}
          className="block text-sm font-medium text-gray-300 mb-1"
        >
          {/* Label dynamique pour le mot de passe */}
          {isEditMode ? 'Nouveau mot de passe (laisser vide pour ne pas changer)' : 'Mot de passe'}
          {!isEditMode && <span className="text-red-500"> *</span>}{' '}
          {/* Requis seulement en création */}
        </label>
        <input
          type="password"
          id={isEditMode ? `password-edit-${userToEdit?.id}` : 'password-add'} // Utiliser ?.
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required={!isEditMode} // Requis seulement si PAS en mode édition
          minLength={6}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          placeholder={isEditMode ? "Laisser vide pour garder l'actuel" : '••••••••'}
          autoComplete="new-password" // Important pour les gestionnaires de mdp
        />
        <p className="text-xs text-gray-400 mt-1">
          {isEditMode
            ? 'Si renseigné, doit contenir au moins 6 caractères.'
            : 'Doit contenir au moins 6 caractères.'}
        </p>
      </div>

      {/* Remplacement du select par des boutons radio */}
      <fieldset>
        <legend className="block text-sm font-medium text-gray-300 mb-1">
          Rôle <span className="text-red-500">*</span>
        </legend>
        {/* Utilisation de Tailwind pour créer des "cartes" sélectionnables */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Option Utilisateur */}
          <div>
            <input
              id={isEditMode ? `role-user-edit-${userToEdit?.id}` : 'role-user-add'} // Utiliser ?.
              type="radio"
              name={isEditMode ? `role-edit-${userToEdit?.id}` : 'role-add'} // Utiliser ?.
              value="USER"
              checked={role === 'USER'}
              onChange={(e) => setRole(e.target.value)}
              required
              className="peer sr-only" // Masque l'input radio mais le garde accessible
              aria-labelledby={
                isEditMode ? `role-user-label-edit-${userToEdit?.id}` : 'role-user-label-add'
              } // Utiliser ?.
            />
            <label
              id={isEditMode ? `role-user-label-edit-${userToEdit?.id}` : 'role-user-label-add'} // Utiliser ?.
              htmlFor={isEditMode ? `role-user-edit-${userToEdit?.id}` : 'role-user-add'} // Utiliser ?.
              className="flex flex-col items-center justify-center rounded-md border border-gray-600 bg-gray-800 px-4 py-3 text-sm font-medium text-white shadow-sm cursor-pointer transition-colors hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-900 peer-checked:border-purple-500 peer-checked:bg-purple-900/30 peer-checked:ring-1 peer-checked:ring-purple-500"
            >
              <span className="text-lg">👤</span> {/* Icône simple */}
              <span className="mt-1">Utilisateur (USER)</span>
            </label>
          </div>
          {/* Option Administrateur */}
          <div>
            <input
              id={isEditMode ? `role-admin-edit-${userToEdit?.id}` : 'role-admin-add'} // Utiliser ?.
              type="radio"
              name={isEditMode ? `role-edit-${userToEdit?.id}` : 'role-add'} // Utiliser ?.
              value="ADMIN"
              checked={role === 'ADMIN'}
              onChange={(e) => setRole(e.target.value)}
              required
              className="peer sr-only" // Masque l'input radio
              aria-labelledby={
                isEditMode ? `role-admin-label-edit-${userToEdit?.id}` : 'role-admin-label-add'
              } // Utiliser ?.
            />
            <label
              id={isEditMode ? `role-admin-label-edit-${userToEdit?.id}` : 'role-admin-label-add'} // Utiliser ?.
              htmlFor={isEditMode ? `role-admin-edit-${userToEdit?.id}` : 'role-admin-add'} // Utiliser ?.
              className="flex flex-col items-center justify-center rounded-md border border-gray-600 bg-gray-800 px-4 py-3 text-sm font-medium text-white shadow-sm cursor-pointer transition-colors hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-900 peer-checked:border-purple-500 peer-checked:bg-purple-900/30 peer-checked:ring-1 peer-checked:ring-purple-500"
            >
              <span className="text-lg">👑</span> {/* Icône simple */}
              <span className="mt-1">Administrateur (ADMIN)</span>
            </label>
          </div>
          {/* Option Modérateur (nouvelle) */}
          <div>
            <input
              id={isEditMode ? `role-moderator-edit-${userToEdit?.id}` : 'role-moderator-add'} // Utiliser ?.
              type="radio"
              name={isEditMode ? `role-edit-${userToEdit?.id}` : 'role-add'} // Utiliser ?.
              value="MODERATOR"
              checked={role === 'MODERATOR'}
              onChange={(e) => setRole(e.target.value)}
              required // Garder required car un rôle doit être choisi
              className="peer sr-only"
              aria-labelledby={
                isEditMode
                  ? `role-moderator-label-edit-${userToEdit?.id}`
                  : 'role-moderator-label-add'
              } // Utiliser ?.
            />
            <label
              id={
                isEditMode
                  ? `role-moderator-label-edit-${userToEdit?.id}`
                  : 'role-moderator-label-add'
              } // Utiliser ?.
              htmlFor={isEditMode ? `role-moderator-edit-${userToEdit?.id}` : 'role-moderator-add'} // Utiliser ?.
              className="flex flex-col items-center justify-center rounded-md border border-gray-600 bg-gray-800 px-4 py-3 text-sm font-medium text-white shadow-sm cursor-pointer transition-colors hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-900 peer-checked:border-purple-500 peer-checked:bg-purple-900/30 peer-checked:ring-1 peer-checked:ring-purple-500"
            >
              <span className="text-lg">🛡️</span> {/* Icône Bouclier */}
              <span className="mt-1">Modérateur (MODERATOR)</span>
            </label>
          </div>
        </div>
      </fieldset>
      {/* Fin du remplacement */}

      {/* Option VIP avec toggle switch moderne */}
      <div className="flex items-center mt-4">
        <label className="inline-flex items-center cursor-pointer">
          <div className="relative">
            <input
              id={isEditMode ? `isVip-edit-${userToEdit?.id}` : 'isVip-add'}
              type="checkbox"
              checked={isVip}
              onChange={(e) => setIsVip(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-700 rounded-full peer peer-focus:ring-2 peer-focus:ring-purple-500 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
          </div>
          <span className="ml-3 text-gray-300 flex items-center">
            <Star className="h-4 w-4 text-amber-400 mr-1" />
            Marquer comme VIP
          </span>
        </label>
      </div>

      {error && (
        <p className="text-red-500 text-sm text-center bg-red-900/30 p-2 rounded-md">{error}</p>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="w-full mt-6 py-2 px-4 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
      >
        {/* Texte et icône dynamiques pour le bouton */}
        {isLoading ? (
          <>
            <Loader2 className="animate-spin h-5 w-5 mr-2" />{' '}
            {isEditMode ? 'Modification...' : 'Création...'}
          </>
        ) : isEditMode ? (
          <>
            <Edit className="h-5 w-5 mr-2" /> Modifier l&apos;Utilisateur
          </>
        ) : (
          <>
            <UserPlus className="h-5 w-5 mr-2" /> Ajouter l&apos;Utilisateur
          </>
        )}
      </button>
    </form>
  );
}
