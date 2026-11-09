import type { Metadata } from 'next';

import ManagePolls from './ManagePolls';

export const metadata: Metadata = {
  title: 'Animer un vote',
  robots: { index: false },
};

export default function Page() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-10 md:py-16">
      <header>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-purple-300">
          Live
        </p>
        <h1 className="text-3xl font-bold text-white md:text-4xl">Animer un vote</h1>
        <p className="mt-3 text-white/60">
          Colle la liste des participants, lance le chrono : les spectateurs votent depuis leur
          téléphone, les résultats restent cachés jusqu&apos;à ce que tu les révèles, et une égalité
          se départage en un clic.
        </p>
      </header>
      <ManagePolls />
    </div>
  );
}
