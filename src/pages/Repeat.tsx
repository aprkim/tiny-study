import { useEffect, useState } from "react";
import { Entry } from "../types";
import { getRepeatEntries, recordReview } from "../storage";

interface RepeatProps {
  onBack: () => void;
}

const MAX_ITEMS = 10;

function clozeSentence(sentence: string, term: string): string {
  // Case-insensitive replacement of term with ____
  const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
  return sentence.replace(regex, "____");
}

function getClozeSentence(entry: Entry): string {
  if (entry.sourceSentence) {
    return clozeSentence(entry.sourceSentence, entry.term);
  }
  // Fallback sentence if no sourceSentence
  return `I used the word ____ today.`;
}

export default function Repeat({ onBack }: RepeatProps) {
  const [items, setItems] = useState<Entry[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    const repeatEntries = getRepeatEntries().slice(0, MAX_ITEMS);
    setItems(repeatEntries);
    if (repeatEntries.length === 0) {
      setFinished(true);
    }
  }, []);

  const currentEntry = items[currentIndex];
  const total = items.length;

  const handleReveal = () => {
    setRevealed(true);
  };

  const handleAnswer = (correct: boolean) => {
    if (currentEntry) {
      recordReview(currentEntry.id, correct);
    }

    if (currentIndex + 1 >= total) {
      setFinished(true);
    } else {
      setCurrentIndex((prev) => prev + 1);
      setRevealed(false);
    }
  };

  if (finished) {
    return (
      <div className="max-w-md mx-auto px-4 py-6">
        <div className="text-center py-16">
          <h1 className="text-2xl font-bold text-[#1e293b] mb-4">
            {items.length === 0 ? "No items to review" : "Done - tiny win!"}
          </h1>
          <p className="text-[#64748b] mb-8">
            {items.length === 0
              ? "Add items to your repeat list first."
              : `You reviewed ${total} item${total !== 1 ? "s" : ""}.`}
          </p>
          <button
            onClick={onBack}
            className="px-6 py-3 bg-[#BF3143] text-white rounded-lg font-medium hover:bg-[#a52a3a] transition-colors"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-6">
      {/* Header */}
      <header className="flex items-center justify-between mb-8">
        <button
          onClick={onBack}
          className="text-[#64748b] hover:text-[#1e293b] transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
        <span className="text-sm font-medium text-[#64748b]">
          {currentIndex + 1} / {total}
        </span>
      </header>

      {/* Progress bar */}
      <div className="h-1 bg-[#e2e8f0] rounded-full mb-8 overflow-hidden">
        <div
          className="h-full bg-[#BF3143] transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / total) * 100}%` }}
        />
      </div>

      {/* Card */}
      {currentEntry && (
        <div className="bg-white border border-[#e2e8f0] rounded-lg p-6 mb-6">
          {/* Cloze sentence */}
          <p className="text-lg text-[#1e293b] leading-relaxed mb-6">
            {getClozeSentence(currentEntry)}
          </p>

          {/* Revealed content */}
          {revealed && (
            <div className="border-t border-[#e2e8f0] pt-4 space-y-3">
              <div>
                <span className="text-xs font-medium text-[#64748b]">
                  Answer
                </span>
                <p className="text-xl font-bold text-[#BF3143]">
                  {currentEntry.term}
                </p>
              </div>
              {currentEntry.meaning && (
                <div>
                  <span className="text-xs font-medium text-[#64748b]">
                    Meaning
                  </span>
                  <p className="text-[#1e293b]">{currentEntry.meaning}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      {!revealed ? (
        <button
          onClick={handleReveal}
          className="w-full px-4 py-3 bg-[#BF3143] text-white rounded-lg font-medium hover:bg-[#a52a3a] transition-colors"
        >
          Reveal
        </button>
      ) : (
        <div className="flex gap-3">
          <button
            onClick={() => handleAnswer(false)}
            className="flex-1 px-4 py-3 bg-[#FEF2F2] text-[#BF3143] rounded-lg font-medium hover:bg-[#fde8e8] transition-colors"
          >
            Not yet
          </button>
          <button
            onClick={() => handleAnswer(true)}
            className="flex-1 px-4 py-3 bg-[#E7F1EB] text-[#3F6B52] rounded-lg font-medium hover:bg-[#d4e8dc] transition-colors"
          >
            I got it
          </button>
        </div>
      )}
    </div>
  );
}
