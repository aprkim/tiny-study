import { useEffect, useState } from "react";
import { Entry } from "../types";
import { getMasteredEntries, updateEntry } from "../storage";

interface MasteredProps {
  onSelectEntry: (id: string) => void;
}

// Background colors: Learn (word) = faded purple, Make It Mine (expression) = faded sage green
const typeBgColors: Record<string, string> = {
  word: "bg-[#F7F5FA]",
  idiom: "bg-[#F7F5FA]",
  expression: "bg-[#F4F7F4]",
  sentence: "bg-[#F4F7F4]",
};

export default function Mastered({ onSelectEntry }: MasteredProps) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadEntries = async () => {
      setLoading(true);
      try {
        const data = await getMasteredEntries();
        setEntries(data);
      } catch (error) {
        console.error("Failed to load mastered entries:", error);
      } finally {
        setLoading(false);
      }
    };
    loadEntries();
  }, []);

  const handleUnmaster = async (e: React.MouseEvent, entryId: string) => {
    e.stopPropagation();
    const updated = await updateEntry(entryId, { masteredFlag: false });
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
      {loading ? (
        <div className="text-center py-16">
          <p className="text-[#64748b]">Loading...</p>
        </div>
      ) : entries.length === 0 ? (
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
              className={`${typeBgColors[entry.type]} border border-[#e2e8f0] rounded-lg overflow-hidden hover:border-[#cbd5e1] transition-colors`}
            >
              <button
                onClick={() => onSelectEntry(entry.id)}
                className="w-full text-left p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[#1e293b] mb-1">{entry.term}</p>
                    {entry.sourceSentence && (
                      <p className="text-sm text-[#64748b] truncate">
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
                  className="w-full px-3 py-2 bg-white border border-[#e2e8f0] text-[#64748b] rounded-lg text-sm font-medium hover:bg-[#f0f4f3] hover:border-[#64748b] transition-all"
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
