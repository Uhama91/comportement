import { StudentGrid } from './components/StudentGrid';

interface ComportementClasseModuleProps {
  onNavigateToStudent?: (studentId: number) => void;
}

export default function ComportementClasseModule({ onNavigateToStudent }: ComportementClasseModuleProps) {
  return <StudentGrid compact onNavigateToStudent={onNavigateToStudent} />;
}

export { StudentGrid };
