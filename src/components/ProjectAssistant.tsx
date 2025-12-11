'use client';

import { useState } from 'react';
import { processProjectCommand } from '@/app/actions/assistant';
import { Sparkles, Send, X, Loader2 } from 'lucide-react';

export function ProjectAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    setIsLoading(true);
    setResponse(null);

    try {
      const result = await processProjectCommand(input);
      setResponse(result);
      setInput('');
    } catch (err) {
      setResponse("Erreur de communication avec l'assistant.");
      console.error('Error calling assistant:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 h-12 w-12 bg-black text-white rounded-full shadow-lg flex items-center justify-center hover:scale-105 transition-transform z-50"
        aria-label={isOpen ? "Fermer l'assistant" : "Ouvrir l'assistant"}
      >
        {isOpen ? <X size={20} /> : <Sparkles size={20} />}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-20 right-6 w-80 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className="bg-white border rounded-xl shadow-xl overflow-hidden flex flex-col max-h-[500px]">
            {/* Header */}
            <div className="bg-slate-50 p-3 border-b flex items-center gap-2">
              <Sparkles size={16} className="text-purple-600" />
              <span className="font-semibold text-sm">Assistant Projets</span>
            </div>

            {/* Response Area */}
            <div className="p-4 min-h-[100px] bg-white text-sm overflow-y-auto flex-1">
              {isLoading ? (
                <div className="flex items-center gap-2 text-slate-500">
                  <Loader2 className="animate-spin" size={16} />
                  <span>Analyse en cours...</span>
                </div>
              ) : response ? (
                <p className="text-slate-800 whitespace-pre-wrap">{response}</p>
              ) : (
                <p className="text-slate-400 italic">
                  Demande-moi de modifier des deadlines ou des statuts...
                  <br />
                  <br />
                  Exemples :
                  <br />
                  • "Déplace la deadline à demain pour les projets finis à 80%"
                  <br />
                  • "Marque comme TERMINE les projets à 100%"
                  <br />• "Change le statut en EN_COURS pour les projets à 50%"
                </p>
              )}
            </div>

            {/* Input Area */}
            <form onSubmit={handleSubmit} className="p-3 border-t bg-slate-50 flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ex: Deadlines à demain pour..."
                className="flex-1 text-sm bg-transparent outline-none text-slate-800 placeholder:text-slate-400"
                autoFocus
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm hover:text-blue-700 transition-colors"
                aria-label="Envoyer"
              >
                <Send size={16} />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
