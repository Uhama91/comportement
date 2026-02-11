import { useState } from 'react';
import { useStudentStore } from '../stores/studentStore';

export function ExportButton() {
  const { exportToJSON } = useStudentStore();
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const jsonData = await exportToJSON();

      // Create download
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `comportement-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Erreur lors de l\'export');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={isExporting}
      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700
        disabled:opacity-50 disabled:cursor-not-allowed transition-colors
        flex items-center gap-2"
    >
      {isExporting ? (
        <>
          <span className="animate-spin">⏳</span>
          Export...
        </>
      ) : (
        <>
          <span>📥</span>
          Exporter JSON
        </>
      )}
    </button>
  );
}
