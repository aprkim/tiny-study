import { useEffect, useState } from "react";
import { Entry } from "../types";
import { getMasteredEntries, updateEntry } from "../storage";

interface MasteredProps {
  onSelectEntry: (id: string) => void;
}

const typePillStyles: Record<string, string> = {
  word: "bg-[#FEF2F2] text-[#BF3143]",
  idiom: "bg-[#F7F5FA] text-[#6E6282]",
  expression: "bg-[#F4F7F4] text-[#5C6D5F]",
  sentence: "bg-[#E7F1EB] text-[#3F6B52]",
};

export default function Mastered({ onSelectEntry }: MasteredProps) {
  const [entries, setEntries] = useState<Entry[]>([]);

  useEffect(() => {
    setEntries(getMasteredEntries());
  }, []);

  const handleUnmaster = (e: React.MouseEvent, entryId: string) => {
    e.stopPropagation();
    const updated = updateEntry(entryId, { masteredFlag: false });
    if (updated) {
      setEntries((prev) => prev.filter((entry) => entry.id !== entryId));
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-6 pb-24">
      {/* Header */}
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-[#1e293b]">Mastered</h1>
        <span className="text-sm text-[#64748b]">
          {entries.length} item{entries.length !== 1 ? "s" : ""}
        </span>
      </header>

      {/* Entries List */}
      {entries.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-[#64748b]">No mastered entries yet.</p>
          <p className="text-sm text-[#9CA3AF] mt-2">
            Mark entries as mastered from the home page.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className="bg-white border border-[#e2e8f0] rounded-lg overflow-hidden"
            >
              <button
                onClick={() => onSelectEntry(entry.id)}
                className="w-full text-left p-4 hover:bg-[#f7f9f8] transition-colors"
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-lg shrink-0 ${typePillStyles[entry.type]}`}
                  >
                    {entry.type}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[#1e293b]">{entry.term}</p>
                    {entry.sourceSentence && (
                      <p className="text-sm text-[#64748b] mt-1 truncate">
                        {entry.sourceSentence}
                      </p>
                    )}
                  </div>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-[#9CA3AF] shrink-0"
                  >
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </div>
              </button>
              <div className="px-4 pb-3">
                <button
                  onClick={(e) => handleUnmaster(e, entry.id)}
                  className="w-full px-3 py-2 bg-[#f0f4f3] text-[#64748b] rounded-lg text-sm font-medium hover:bg-[#e2e8f0] transition-colors"
                >
                  Remove from Mastered
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
