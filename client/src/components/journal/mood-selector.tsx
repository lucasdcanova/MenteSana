import React from "react";

export type MoodType = "muito-feliz" | "feliz" | "neutro" | "triste" | "muito-triste";

interface MoodSelectorProps {
  selectedMood: MoodType | null;
  onMoodSelect: (mood: MoodType) => void;
}

interface MoodOption {
  value: MoodType;
  label: string;
  emoji: string;
  bgColor: string;
}

export function MoodSelector({ selectedMood, onMoodSelect }: MoodSelectorProps) {
  const moods: MoodOption[] = [
    {
      value: "muito-feliz",
      label: "Radiante",
      emoji: "😄",
      bgColor: "bg-yellow-300"
    },
    {
      value: "feliz",
      label: "Feliz",
      emoji: "🙂",
      bgColor: "bg-yellow-400"
    },
    {
      value: "neutro",
      label: "Neutro",
      emoji: "😐",
      bgColor: "bg-yellow-400"
    },
    {
      value: "triste",
      label: "Triste",
      emoji: "😔",
      bgColor: "bg-yellow-400"
    },
    {
      value: "muito-triste",
      label: "Péssimo",
      emoji: "😞",
      bgColor: "bg-yellow-400"
    }
  ];

  return (
    <div className="grid grid-cols-5 gap-2 mb-6">
      {moods.map((mood) => (
        <button
          key={mood.value}
          className="flex flex-col items-center"
          onClick={() => onMoodSelect(mood.value)}
        >
          <div 
            className={`w-12 h-12 rounded-full flex items-center justify-center mb-1 ${
              selectedMood === mood.value 
                ? 'ring-2 ring-gray-800 ' + mood.bgColor
                : mood.bgColor + ' opacity-70'
            }`}
          >
            <span className="text-2xl">{mood.emoji}</span>
          </div>
          <span className={`text-xs ${selectedMood === mood.value ? 'text-gray-800 font-medium' : 'text-gray-600'}`}>
            {mood.label}
          </span>
        </button>
      ))}
    </div>
  );
}
