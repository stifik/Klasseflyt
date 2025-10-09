"use client";

import React from 'react';

// Forhåndsdefinerte positive handlinger
const positiveActions = [
  { id: 1, name: 'Hjelpsom mot medelev', points: 5, icon: '🤝', description: 'Hjalp en medelev med skolearbeid' },
  { id: 2, name: 'Aktiv deltakelse', points: 3, icon: '🙋', description: 'Deltok aktivt i undervisningen' },
  { id: 3, name: 'Ryddet klassrom', points: 4, icon: '🧹', description: 'Ryddet frivillig i klasserommet' },
  { id: 4, name: 'Kreativ løsning', points: 6, icon: '💡', description: 'Kom med kreativ løsning på problem' },
  { id: 5, name: 'Respektfull oppførsel', points: 3, icon: '🤍', description: 'Viste respekt for andre' },
  { id: 6, name: 'Levert til tiden', points: 2, icon: '⏰', description: 'Leverte arbeid til rett tid' },
  { id: 7, name: 'Delt kunnskap', points: 5, icon: '📚', description: 'Delte kunnskap med andre elever' },
  { id: 8, name: 'Lederskap', points: 7, icon: '👑', description: 'Viste godt lederskap i gruppe' },
  { id: 9, name: 'Miljøvennlig handling', points: 4, icon: '🌱', description: 'Gjorde noe godt for miljøet' },
  { id: 10, name: 'Inkluderende oppførsel', points: 6, icon: '🤗', description: 'Inkluderte andre i aktiviteter' },
];

interface PodViewProps {
  onSelectAction: (actionId: number, actionName: string, points: number, description: string) => void;
}

const PodView: React.FC<PodViewProps> = ({ onSelectAction }) => {
  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
          Velg en positiv handling
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Klikk på en handling for å tildele poeng
        </p>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {positiveActions.map(action => (
          <button 
            key={action.id} 
            onClick={() => onSelectAction(action.id, action.name, action.points, action.description)}
            className="group bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 hover:border-green-300 hover:shadow-lg transform hover:scale-105 transition-all duration-200 text-center min-h-[140px] flex flex-col justify-center"
          >
            {/* Ikon for handlingen */}
            <div className="text-3xl mb-3">
              {action.icon}
            </div>
            
            {/* Handling navn */}
            <span className="font-medium text-gray-900 dark:text-white text-sm leading-tight mb-2 block">
              {action.name}
            </span>
            
            {/* Poeng */}
            <div className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-3 py-1 rounded-full text-sm font-bold mb-2">
              +{action.points} poeng
            </div>

            {/* Beskrivelse på hover */}
            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {action.description}
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* Tilpasset poeng-tildeling */}
      <div className="mt-8 p-6 bg-gray-50 dark:bg-gray-800 rounded-xl">
        <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
          Egendefinert handling
        </h4>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Klikk her for å gi poeng for andre positive handlinger
        </p>
        <button 
          onClick={() => onSelectAction(0, 'Egendefinert handling', 0, 'Tilpasset beskrivelse')}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 px-6 rounded-lg font-medium transition-colors"
        >
          ✏️ Egendefinert poeng-tildeling
        </button>
      </div>
    </div>
  );
};

export default PodView;