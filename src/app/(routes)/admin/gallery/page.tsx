import Image from 'next/image';
import { redirect } from 'next/navigation';

import { auth } from '@/auth';

export default async function AdminGalleryPage() {
  const session = await auth();

  if (!session?.user?.role || session.user.role !== 'ADMIN') {
    redirect('/');
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Gestion de la Galerie
          </h1>
          <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md transition-colors">
            + Ajouter une image
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {/* Exemple de carte d'image */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <div className="relative aspect-square">
              <Image
                src="/images/gallery/event1.jpg"
                alt="Event 1"
                fill
                className="object-cover w-full h-full"
                unoptimized
              />
              <div className="absolute inset-0 bg-black bg-opacity-40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                <div className="flex space-x-2">
                  <button className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                    </svg>
                  </button>
                  <button className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-full">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            <div className="p-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Event 1</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Description de l&apos;image...
              </p>
            </div>
          </div>

          {/* Répéter pour d'autres images */}
        </div>
      </div>
    </div>
  );
}
