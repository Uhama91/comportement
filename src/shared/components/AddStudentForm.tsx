import { useState } from 'react';
import { useStudentStore } from '../stores/studentStore';

interface AddStudentFormProps {
  inline?: boolean; // Mode compact pour intégration dans header
}

export function AddStudentForm({ inline = false }: AddStudentFormProps) {
  const [firstName, setFirstName] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [showInput, setShowInput] = useState(false);
  const { addStudent, students } = useStudentStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim()) return;

    setIsAdding(true);
    const success = await addStudent(firstName);
    if (success) {
      setFirstName('');
      if (inline) setShowInput(false);
    }
    setIsAdding(false);
  };

  const isAtLimit = students.length >= 30;

  // Mode inline: bouton qui révèle l'input
  if (inline) {
    if (!showInput) {
      return (
        <button
          onClick={() => setShowInput(true)}
          disabled={isAtLimit}
          className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
          title={isAtLimit ? 'Limite atteinte' : 'Ajouter un élève'}
        >
          + Élève
        </button>
      );
    }

    return (
      <form onSubmit={handleSubmit} className="flex gap-1">
        <input
          type="text"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          placeholder="Prénom"
          disabled={isAdding}
          className="w-24 px-2 py-1 text-xs border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          maxLength={30}
          autoFocus
          onBlur={() => { if (!firstName.trim()) setShowInput(false); }}
          onKeyDown={(e) => { if (e.key === 'Escape') setShowInput(false); }}
        />
        <button
          type="submit"
          disabled={!firstName.trim() || isAdding}
          className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed"
        >
          {isAdding ? '...' : '✓'}
        </button>
        <button
          type="button"
          onClick={() => setShowInput(false)}
          className="px-2 py-1 text-xs bg-slate-100 text-slate-600 rounded hover:bg-slate-200"
        >
          ✕
        </button>
      </form>
    );
  }

  // Mode standard (original)
  return (
    <form onSubmit={handleSubmit} className="flex gap-2 mb-4">
      <input
        type="text"
        value={firstName}
        onChange={(e) => setFirstName(e.target.value)}
        placeholder="Prénom de l'élève"
        disabled={isAtLimit || isAdding}
        className="flex-1 px-3 py-2 border border-slate-300 rounded-lg
          focus:outline-none focus:ring-2 focus:ring-blue-500
          disabled:bg-slate-100 disabled:text-slate-400"
        maxLength={30}
      />
      <button
        type="submit"
        disabled={!firstName.trim() || isAtLimit || isAdding}
        className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg
          hover:bg-blue-700 transition-colors
          disabled:bg-slate-300 disabled:cursor-not-allowed"
      >
        {isAdding ? '...' : 'Ajouter'}
      </button>
      {isAtLimit && (
        <span className="text-sm text-amber-600 self-center">
          Limite de 30 élèves atteinte
        </span>
      )}
    </form>
  );
}
