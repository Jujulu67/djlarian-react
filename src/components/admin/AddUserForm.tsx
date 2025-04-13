'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserPlus, Loader2 } from 'lucide-react';

interface AddUserFormProps {
  onSuccess?: () => void; // Callback optionnel en cas de succès
}

// Ce composant contient uniquement le formulaire et sa logique
export default function AddUserForm({ onSuccess }: AddUserFormProps) {
  const router = useRouter(); // Peut être utile pour rafraîchir après succès
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('USER'); // Rôle par défaut
  const [isVip, setIsVip] = useState(false); // État pour le statut VIP
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, password, role, isVip }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Impossible de créer l'utilisateur.");
      }

      // Succès
      console.log('Utilisateur créé:', data);
      if (onSuccess) {
        onSuccess(); // Appeler le callback (ex: pour fermer la modale et rafraîchir)
      }
      // Idéalement, afficher un toast/notification de succès
    } catch (err: any) {
      console.error("Erreur lors de l'ajout:", err);
      setError(err.message || 'Une erreur est survenue.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-2xl font-semibold text-white mb-6 flex items-center">
        <UserPlus className="h-6 w-6 mr-2 text-purple-400" />
        Ajouter un Nouvel Utilisateur
      </h2>
      <div>
        <label htmlFor="email-add" className="block text-sm font-medium text-gray-300 mb-1">
          Email <span className="text-red-500">*</span>
        </label>
        <input
          type="email"
          id="email-add" // Utiliser un ID unique pour éviter conflits potentiels
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          placeholder="exemple@domaine.com"
          autoComplete="off"
        />
      </div>

      <div>
        <label htmlFor="name-add" className="block text-sm font-medium text-gray-300 mb-1">
          Nom (Optionnel)
        </label>
        <input
          type="text"
          id="name-add"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          placeholder="Prénom Nom"
          autoComplete="off"
        />
      </div>

      <div>
        <label htmlFor="password-add" className="block text-sm font-medium text-gray-300 mb-1">
          Mot de passe <span className="text-red-500">*</span>
        </label>
        <input
          type="password"
          id="password-add"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          placeholder="••••••••"
          autoComplete="new-password" // Aide les gestionnaires de mots de passe
        />
        <p className="text-xs text-gray-400 mt-1">Doit contenir au moins 6 caractères.</p>
      </div>

      {/* Remplacement du select par des boutons radio */}
      <fieldset>
        <legend className="block text-sm font-medium text-gray-300 mb-1">
          Rôle <span className="text-red-500">*</span>
        </legend>
        {/* Utilisation de Tailwind pour créer des "cartes" sélectionnables */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {' '}
          {/* Passage à 3 colonnes sur sm+ */}
          {/* Option Utilisateur */}
          <div>
            <input
              id="role-user"
              type="radio"
              name="role" // Important pour grouper les radios
              value="USER"
              checked={role === 'USER'}
              onChange={(e) => setRole(e.target.value)}
              required
              className="peer sr-only" // Masque l'input radio mais le garde accessible
              aria-labelledby="role-user-label" // Lie à l'étiquette visible
            />
            <label
              id="role-user-label"
              htmlFor="role-user" // Associe au bon input
              className="flex flex-col items-center justify-center rounded-md border border-gray-600 bg-gray-800 px-4 py-3 text-sm font-medium text-white shadow-sm cursor-pointer transition-colors hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-900 peer-checked:border-purple-500 peer-checked:bg-purple-900/30 peer-checked:ring-1 peer-checked:ring-purple-500"
            >
              <span className="text-lg">👤</span> {/* Icône simple */}
              <span className="mt-1">Utilisateur (USER)</span>
            </label>
          </div>
          {/* Option Administrateur */}
          <div>
            <input
              id="role-admin"
              type="radio"
              name="role" // Important pour grouper les radios
              value="ADMIN"
              checked={role === 'ADMIN'}
              onChange={(e) => setRole(e.target.value)}
              required
              className="peer sr-only" // Masque l'input radio
              aria-labelledby="role-admin-label"
            />
            <label
              id="role-admin-label"
              htmlFor="role-admin"
              className="flex flex-col items-center justify-center rounded-md border border-gray-600 bg-gray-800 px-4 py-3 text-sm font-medium text-white shadow-sm cursor-pointer transition-colors hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-900 peer-checked:border-purple-500 peer-checked:bg-purple-900/30 peer-checked:ring-1 peer-checked:ring-purple-500"
            >
              <span className="text-lg">👑</span> {/* Icône simple */}
              <span className="mt-1">Administrateur (ADMIN)</span>
            </label>
          </div>
          {/* Option Modérateur (nouvelle) */}
          <div>
            <input
              id="role-moderator"
              type="radio"
              name="role"
              value="MODERATOR"
              checked={role === 'MODERATOR'}
              onChange={(e) => setRole(e.target.value)}
              required // Garder required car un rôle doit être choisi
              className="peer sr-only"
              aria-labelledby="role-moderator-label"
            />
            <label
              id="role-moderator-label"
              htmlFor="role-moderator"
              className="flex flex-col items-center justify-center rounded-md border border-gray-600 bg-gray-800 px-4 py-3 text-sm font-medium text-white shadow-sm cursor-pointer transition-colors hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-900 peer-checked:border-purple-500 peer-checked:bg-purple-900/30 peer-checked:ring-1 peer-checked:ring-purple-500"
            >
              <span className="text-lg">🛡️</span> {/* Icône Bouclier */}
              <span className="mt-1">Modérateur (MODERATOR)</span>
            </label>
          </div>
        </div>
      </fieldset>
      {/* Fin du remplacement */}

      {/* Option VIP */}
      <div className="flex items-center mt-2">
        <input
          id="isVip"
          type="checkbox"
          checked={isVip}
          onChange={(e) => setIsVip(e.target.checked)}
          className="h-4 w-4 cursor-pointer text-purple-600 bg-gray-700 border-gray-500 rounded focus:ring-purple-500 focus:ring-opacity-20"
        />
        <label htmlFor="isVip" className="ml-2 block text-sm text-gray-300 cursor-pointer">
          <span className="flex items-center">
            <span className="mr-1">⭐</span> Marquer comme VIP
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
        {isLoading ? (
          <>
            <Loader2 className="animate-spin h-5 w-5 mr-2" /> Création...
          </>
        ) : (
          <>
            <UserPlus className="h-5 w-5 mr-2" /> Ajouter l'Utilisateur
          </>
        )}
      </button>
    </form>
  );
}
