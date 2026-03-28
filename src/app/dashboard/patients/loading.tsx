export default function PatientsLoading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-8 w-40 bg-gray-200 rounded" />
        <div className="h-10 w-40 bg-gray-200 rounded-[10px]" />
      </div>
      <div className="rounded-[10px] bg-white overflow-hidden">
        <div className="h-10 bg-gray-100" />
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3 border-t border-gray-50">
            <div className="h-4 w-40 bg-gray-200 rounded" />
            <div className="h-4 w-48 bg-gray-100 rounded" />
            <div className="h-4 w-24 bg-gray-100 rounded" />
            <div className="h-4 w-16 bg-gray-200 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
