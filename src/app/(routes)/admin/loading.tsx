import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function AdminLoading() {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-br from-black via-[#0c0117] to-black">
      <div className="container mx-auto px-4 py-12">
        <div className="mb-12 text-center">
          <div className="animate-pulse">
            <div className="h-12 bg-purple-500/20 w-64 mx-auto rounded-lg mb-4"></div>
            <div className="bg-purple-500/10 h-1 w-32 mx-auto rounded-full"></div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="glass rounded-xl backdrop-blur-md overflow-hidden relative border border-purple-500/20 animate-pulse"
            >
              <div className="p-6">
                <div className="bg-purple-500/20 w-12 h-12 rounded-lg mb-4"></div>
                <div className="h-6 bg-purple-500/20 rounded-lg w-3/4 mb-2"></div>
                <div className="h-4 bg-purple-500/10 rounded-lg w-full mb-2"></div>
                <div className="h-4 bg-purple-500/10 rounded-lg w-5/6 mb-8"></div>
                <div className="flex space-x-2 mb-6">
                  <div className="h-6 bg-purple-500/10 rounded-full w-16"></div>
                  <div className="h-6 bg-purple-500/10 rounded-full w-16"></div>
                </div>
                <div className="flex justify-between items-center">
                  <div className="h-10 bg-purple-500/20 rounded-lg w-24"></div>
                  <div className="h-4 bg-purple-500/10 rounded-lg w-20"></div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12">
          <div className="glass rounded-xl backdrop-blur-md overflow-hidden relative border border-purple-500/20 p-6">
            <div className="flex justify-between items-center mb-4">
              <div className="h-6 bg-purple-500/20 rounded-lg w-48"></div>
              <div className="h-4 bg-purple-500/10 rounded-lg w-24"></div>
            </div>
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-black/30 p-3 rounded-lg animate-pulse">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="bg-purple-500/20 w-10 h-10 rounded-lg"></div>
                      <div className="space-y-2">
                        <div className="h-4 bg-purple-500/20 rounded-lg w-32"></div>
                        <div className="h-3 bg-purple-500/10 rounded-lg w-48"></div>
                      </div>
                    </div>
                    <div className="h-3 bg-purple-500/10 rounded-lg w-20"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
