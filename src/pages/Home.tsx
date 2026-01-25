import { useEffect, useState } from "react";
import { Entry } from "../types";
import { getEntries, searchEntries, updateEntry } from "../storage";

interface HomeProps {
  onSelectEntry: (id: string) => void;
}

// Background colors: Learn (word) = faded purple, Make It Mine (expression) = faded sage green
const typeBgColors: Record<string, string> = {
  word: "bg-[#F7F5FA]",
  idiom: "bg-[#F7F5FA]",
  expression: "bg-[#F4F7F4]",
  sentence: "bg-[#F4F7F4]",
};

type TypeFilter = "all" | "learn" | "capture";

export default function Home({ onSelectEntry }: HomeProps) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [hideMastered, setHideMastered] = useState(true);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [loading, setLoading] = useState(true);
  const [searchResults, setSearchResults] = useState<Entry[] | null>(null);

  useEffect(() => {
    const loadEntries = async () => {
      setLoading(true);
      try {
        const data = await getEntries();
        setEntries(data);
      } catch (error) {
        console.error("Failed to load entries:", error);
      } finally {
        setLoading(false);
      }
    };
    loadEntries();
  }, []);

  useEffect(() => {
    const search = async () => {
      if (searchQuery) {
        const results = await searchEntries(searchQuery);
        setSearchResults(results);
      } else {
        setSearchResults(null);
      }
    };
    search();
  }, [searchQuery]);

  const handleRepeat = async (e: React.MouseEvent, entryId: string) => {
    e.stopPropagation();
    const updated = await updateEntry(entryId, { repeatFlag: true });
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

  const handleToggleMastered = async (e: React.MouseEvent, entryId: string, currentMastered: boolean) => {
    e.stopPropagation();
    const updated = await updateEntry(entryId, { masteredFlag: !currentMastered });
    if (updated) {
      setEntries((prev) =>
        prev.map((entry) =>
          entry.id === entryId ? { ...entry, masteredFlag: !currentMastered } : entry
        )
      );
    }
  };

  const filteredEntries = (searchResults !== null ? searchResults : entries).filter(
    (entry) => {
      // Filter by mastered status
      if (hideMastered && entry.masteredFlag) return false;
      // Filter by type
      if (typeFilter === "learn" && (entry.type === "expression" || entry.type === "sentence")) return false;
      if (typeFilter === "capture" && (entry.type === "word" || entry.type === "idiom")) return false;
      return true;
    }
  );

  return (
    <div className="max-w-md mx-auto px-4 py-6 pb-24">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-[#1e293b]">Review</h1>
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

      {/* Filters Row */}
      <div className="flex items-center justify-between mb-4">
        {/* Type Filter Buttons */}
        <div className="flex gap-1">
          <button
            onClick={() => setTypeFilter(typeFilter === "learn" ? "all" : "learn")}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
              typeFilter === "learn"
                ? "bg-[#F7F5FA] text-[#6E6282] border border-[#6E6282]"
                : "bg-white text-[#64748b] border border-[#e2e8f0] hover:border-[#64748b]"
            }`}
          >
            Learn
          </button>
          <button
            onClick={() => setTypeFilter(typeFilter === "capture" ? "all" : "capture")}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
              typeFilter === "capture"
                ? "bg-[#F4F7F4] text-[#5C6D5F] border border-[#5C6D5F]"
                : "bg-white text-[#64748b] border border-[#e2e8f0] hover:border-[#64748b]"
            }`}
          >
            Make It Mine
          </button>
        </div>

        {/* Hide Mastered Toggle */}
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
      {loading ? (
        <div className="text-center py-16">
          <p className="text-[#64748b]">Loading...</p>
        </div>
      ) : entries.length === 0 ? (
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
            <li key={entry.id} className={`${typeBgColors[entry.type]} border border-[#e2e8f0] rounded-lg overflow-hidden hover:border-[#cbd5e1] transition-colors`}>
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
                  className="flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all bg-white border border-[#e2e8f0] text-[#64748b] hover:bg-[#f0f4f3] hover:border-[#64748b]"
                >
                  Repeat
                </button>
                <button
                  onClick={(e) => handleToggleMastered(e, entry.id, entry.masteredFlag ?? false)}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    entry.masteredFlag
                      ? "bg-[#E7F1EB] border border-[#C8DCD0] text-[#3F6B52] hover:border-[#3F6B52]"
                      : "bg-white border border-[#e2e8f0] text-[#64748b] hover:bg-[#f0f4f3] hover:border-[#64748b]"
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
