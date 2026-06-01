'use client';

export function DeleteMonitorButton({ id }: { id: string }) {
  const handleDelete = async () => {
    if (!confirm('¿Eliminar este monitor?')) return;
    await fetch(`/api/monitors/${id}`, { method: 'DELETE' });
    window.location.reload();
  };
  return (
    <button onClick={handleDelete} className="text-red-500 hover:underline text-xs">
      Eliminar
    </button>
  );
}
