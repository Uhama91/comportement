import { StudentGrid } from './components/StudentGrid';
import { TranscriptPreview } from '../apprentissage/components/TranscriptPreview';

interface ComportementClasseModuleProps {
  onNavigateToStudent?: (studentId: number) => void;
}

export default function ComportementClasseModule({ onNavigateToStudent }: ComportementClasseModuleProps) {
  return (
    <div className="h-full flex flex-col">
      <TranscriptPreview />
      <div className="flex-1 min-h-0">
        <StudentGrid compact onNavigateToStudent={onNavigateToStudent} />
      </div>
    </div>
  );
}

export { StudentGrid };
