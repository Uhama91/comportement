import { useState } from 'react';
import { useStudentStore } from '../stores/studentStore';

export function AddStudentForm() {
  const [firstName, setFirstName] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const { addStudent, error, students } = useStudentStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim()) return;

    setIsAdding(true);
    const success = await addStudent(firstName);
    if (success) {
      setFirstName('');
    }
    setIsAdding(false);
  };

  const isAtLimit = students.length >= 30;

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
