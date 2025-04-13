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
        body: JSON.stringify({ email, name, password, role }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Impossible de créer l'utilisateur.");
      }

      // Succès
      console.log('Utilisateur créé:', data);
      router.refresh(); // Rafraîchir la liste des utilisateurs en arrière-plan
      if (onSuccess) {
        onSuccess(); // Appeler le callback (ex: pour fermer la modale)
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

      <div>
        <label htmlFor="role-add" className="block text-sm font-medium text-gray-300 mb-1">
          Rôle <span className="text-red-500">*</span>
        </label>
        <select
          id="role-add"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          required
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent appearance-none"
        >
          <option value="USER">Utilisateur (USER)</option>
          <option value="ADMIN">Administrateur (ADMIN)</option>
        </select>
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
