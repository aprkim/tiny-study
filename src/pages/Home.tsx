import { useEffect, useState } from "react";
import { Entry } from "../types";
import { getEntries, searchEntries, updateEntry } from "../storage";

interface HomeProps {
  onAddNew: () => void;
  onSelectEntry: (id: string) => void;
}

const typePillStyles: Record<string, string> = {
  word: "bg-[#FEF2F2] text-[#BF3143]",
  idiom: "bg-[#F7F5FA] text-[#6E6282]",
  expression: "bg-[#F4F7F4] text-[#5C6D5F]",
  sentence: "bg-[#E7F1EB] text-[#3F6B52]",
};

export default function Home({ onAddNew, onSelectEntry }: HomeProps) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [hideMastered, setHideMastered] = useState(true);

  useEffect(() => {
    setEntries(getEntries());
  }, []);

  const handleRepeat = (e: React.MouseEvent, entryId: string) => {
    e.stopPropagation();
    const updated = updateEntry(entryId, { repeatFlag: true });
    if (updated) {
      // Move the entry to the bottom of the list
      setEntries((prev) => {
        const entry = prev.find((e) => e.id === entryId);
        if (!entry) return prev;
        const others = prev.filter((e) => e.id !== entryId);
        return [...others, { ...entry, repeatFlag: true }];
      });
    }
  };

  const handleToggleMastered = (e: React.MouseEvent, entryId: string, currentMastered: boolean) => {
    e.stopPropagation();
    const updated = updateEntry(entryId, { masteredFlag: !currentMastered });
    if (updated) {
      setEntries((prev) =>
        prev.map((entry) =>
          entry.id === entryId ? { ...entry, masteredFlag: !currentMastered } : entry
        )
      );
    }
  };

  const filteredEntries = (searchQuery ? searchEntries(searchQuery) : entries).filter(
    (entry) => !hideMastered || !entry.masteredFlag
  );

  return (
    <div className="max-w-md mx-auto px-4 py-6 pb-24">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-[#1e293b]">Study</h1>
        <button
          onClick={onAddNew}
          className="px-4 py-2 bg-[#BF3143] text-white rounded-lg font-medium hover:bg-[#a52a3a] transition-colors"
        >
          Add New
        </button>
      </header>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search entries..."
          className="w-full px-4 py-3 bg-white border border-[#e2e8f0] rounded-lg text-[#1e293b] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#BF3143]"
        />
      </div>

      {/* Hide Mastered Toggle */}
      <div className="flex items-center justify-end mb-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <span className="text-sm text-[#64748b]">Hide mastered</span>
          <button
            onClick={() => setHideMastered(!hideMastered)}
            className={`relative w-10 h-6 rounded-full transition-colors ${
              hideMastered ? "bg-[#BF3143]" : "bg-[#e2e8f0]"
            }`}
          >
            <span
              className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                hideMastered ? "left-5" : "left-1"
              }`}
            />
          </button>
        </label>
      </div>

      {/* Entries List */}
      {entries.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-[#64748b]">No entries yet. Add your first one!</p>
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-[#64748b]">No matches.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {filteredEntries.map((entry) => (
            <li key={entry.id} className="bg-white border border-[#e2e8f0] rounded-lg overflow-hidden">
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
                    {entry.tags && entry.tags.length > 0 && (
                      <div className="flex gap-1 mt-2">
                        {entry.tags.slice(0, 2).map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 text-[10px] font-medium rounded bg-[#F7F5FA] text-[#6E6282]"
                          >
                            {tag}
                          </span>
                        ))}
                        {entry.tags.length > 2 && (
                          <span className="text-[10px] text-[#9CA3AF]">
                            +{entry.tags.length - 2}
                          </span>
                        )}
                      </div>
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
              <div className="px-4 pb-3 flex gap-2">
                <button
                  onClick={(e) => handleRepeat(e, entry.id)}
                  className="flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors bg-[#f0f4f3] text-[#64748b] hover:bg-[#e2e8f0]"
                >
                  Repeat
                </button>
                <button
                  onClick={(e) => handleToggleMastered(e, entry.id, entry.masteredFlag ?? false)}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    entry.masteredFlag
                      ? "bg-[#E7F1EB] text-[#3F6B52]"
                      : "bg-[#f0f4f3] text-[#64748b] hover:bg-[#e2e8f0]"
                  }`}
                >
                  {entry.masteredFlag ? "Mastered" : "Mastered"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
