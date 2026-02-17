import { useState } from 'react';

interface HelpItemProps {
  title: string;
  children: React.ReactNode;
}

function HelpItem({ title, children }: HelpItemProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors text-left"
      >
        <span>{title}</span>
        <span className="text-slate-400 text-xs">{open ? '−' : '+'}</span>
      </button>
      {open && (
        <div className="px-3 pb-3 text-xs text-slate-600 space-y-2 border-t border-slate-100 pt-2">
          {children}
        </div>
      )}
    </div>
  );
}

export function HelpSection() {
  return (
    <div className="space-y-3">
      <div className="font-medium text-slate-800">Aide</div>

      <div className="space-y-2">
        <HelpItem title="Premier lancement">
          <p>
            Au premier lancement, l'application propose d'installer les modeles IA
            (~1.5 Go) necessaires a la dictee vocale et a la structuration automatique.
          </p>
          <p>
            <strong>Internet :</strong> Telechargement direct depuis Hugging Face.
          </p>
          <p>
            <strong>Cle USB :</strong> Selectionnez un dossier contenant les fichiers
            <code className="mx-1 px-1 bg-slate-100 rounded">ggml-small.bin</code> et
            <code className="mx-1 px-1 bg-slate-100 rounded">qwen2.5-coder-1.5b-instruct-q4_k_m.gguf</code>.
          </p>
          <p>Sans les modeles, les Modules 1 et 2 restent accessibles.</p>
        </HelpItem>

        <HelpItem title="Dictee vocale">
          <p><strong>1.</strong> Dans le Module 3, cliquez sur "Dictee vocale".</p>
          <p><strong>2.</strong> Maintenez le bouton micro pour parler.</p>
          <p><strong>3.</strong> Relachez — le texte est transcrit automatiquement.</p>
          <p><strong>4.</strong> Cliquez "Structurer" pour que l'IA decoupe en observations.</p>
          <p><strong>5.</strong> Corrigez si besoin, puis "Valider et enregistrer".</p>
        </HelpItem>

        <HelpItem title="Configuration des periodes">
          <p>
            Dans Parametres → Periodes scolaires, configurez le type (trimestres ou semestres)
            et les dates de chaque periode pour l'annee en cours.
          </p>
          <p>
            Les modules 2 et 3 utilisent les periodes pour organiser les donnees.
          </p>
        </HelpItem>

        <HelpItem title="Les 3 modules">
          <p>
            <strong>Module 1 — Comportement Classe :</strong> Vue d'ensemble, avertissements (1-2-3),
            sanctions, absences, recompenses automatiques.
          </p>
          <p>
            <strong>Module 2 — Suivi Individuel :</strong> Fiche detaillee par eleve,
            incidents, historique chronologique.
          </p>
          <p>
            <strong>Module 3 — Domaines d'Apprentissage :</strong> Appreciations par domaine,
            dictee vocale + structuration IA, saisie manuelle.
          </p>
        </HelpItem>

        <HelpItem title="Mode TBI (Tableau Blanc Interactif)">
          <p><strong>F11</strong> pour passer en plein ecran (mode TBI).</p>
          <p><strong>Echap</strong> pour quitter le mode TBI.</p>
          <p>Les elements sont agrandis pour etre lisibles a distance (3m).</p>
        </HelpItem>
      </div>
    </div>
  );
}
