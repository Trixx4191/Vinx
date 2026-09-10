export default function ProductsLoading() {
  return (
    <div className="page-enter">
      <div className="mb-10 space-y-3">
        <div className="h-3 w-32 animate-pulse rounded-full bg-white/50" />
        <div className="h-12 w-64 animate-pulse rounded-2xl bg-white/50" />
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {[1, 2, 3, 4].map((item) => <div key={item} className="h-80 animate-pulse rounded-3xl bg-white/45" />)}
      </div>
    </div>
  );
}