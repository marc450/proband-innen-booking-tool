export default function DashboardLoading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-8 w-48 bg-gray-200 rounded" />
        <div className="flex gap-2">
          <div className="h-10 w-32 bg-gray-200 rounded-[10px]" />
          <div className="h-10 w-32 bg-gray-200 rounded-[10px]" />
        </div>
      </div>
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-[10px] bg-white p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="h-5 w-64 bg-gray-200 rounded" />
            <div className="h-5 w-20 bg-gray-200 rounded" />
          </div>
          <div className="space-y-2">
            {[1, 2].map((j) => (
              <div key={j} className="h-4 w-full bg-gray-100 rounded" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
