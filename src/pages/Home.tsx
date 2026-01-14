import { useEffect, useState } from "react";
import { Entry } from "../types";
import { getEntries, getRepeatCount, searchEntries } from "../storage";

interface HomeProps {
  onAddNew: () => void;
  onSelectEntry: (id: string) => void;
  onStartRepeat: () => void;
  onSettings: () => void;
}

const typePillStyles: Record<string, string> = {
  word: "bg-[#FEF2F2] text-[#BF3143]",
  idiom: "bg-[#F7F5FA] text-[#6E6282]",
  expression: "bg-[#F4F7F4] text-[#5C6D5F]",
  sentence: "bg-[#E7F1EB] text-[#3F6B52]",
};

export default function Home({ onAddNew, onSelectEntry, onStartRepeat, onSettings }: HomeProps) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [repeatCount, setRepeatCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [hideMastered, setHideMastered] = useState(true);

  useEffect(() => {
    setEntries(getEntries());
    setRepeatCount(getRepeatCount());
  }, []);

  const filteredEntries = (searchQuery ? searchEntries(searchQuery) : entries).filter(
    (entry) => !hideMastered || !entry.masteredFlag
  );

  return (
    <div className="max-w-md mx-auto px-4 py-6">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-[#1e293b]">Tiny Study</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={onSettings}
            className="p-2 text-[#64748b] hover:text-[#1e293b] transition-colors"
            title="Settings"
          >
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
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
            </svg>
          </button>
          <button
            onClick={onAddNew}
            className="px-4 py-2 bg-[#BF3143] text-white rounded-2xl font-medium hover:bg-[#a52a3a] transition-colors"
          >
            Add New
          </button>
        </div>
      </header>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search entries..."
          className="w-full px-4 py-3 bg-white border border-[#e2e8f0] rounded-2xl text-[#1e293b] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#BF3143]"
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

      {/* Repeat Card */}
      <div className="bg-white border border-[#e2e8f0] rounded-2xl p-4 mb-6">
        <h2 className="font-semibold text-[#1e293b] mb-1">Repeat</h2>
        {repeatCount === 0 ? (
          <p className="text-sm text-[#64748b]">No repeat items yet.</p>
        ) : (
          <>
            <p className="text-sm text-[#64748b] mb-3">
              {repeatCount} item{repeatCount !== 1 ? "s" : ""} to review
            </p>
            <button
              onClick={onStartRepeat}
              className="w-full px-4 py-2 bg-[#E7F1EB] text-[#3F6B52] rounded-xl font-medium hover:bg-[#d4e8dc] transition-colors"
            >
              Quick Review (2 min)
            </button>
          </>
        )}
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
            <li key={entry.id}>
              <button
                onClick={() => onSelectEntry(entry.id)}
                className={`w-full text-left bg-white border border-[#e2e8f0] rounded-2xl p-4 hover:border-[#dbe2ea] transition-colors ${
                  entry.masteredFlag ? "opacity-50" : ""
                }`}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-lg shrink-0 ${typePillStyles[entry.type]}`}
                  >
                    {entry.type}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 flex-wrap">
                      <p className="font-semibold text-[#1e293b]">{entry.term}</p>
                      {entry.repeatFlag && (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="#BF3143"
                          className="shrink-0"
                        >
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                        </svg>
                      )}
                      {entry.masteredFlag && (
                        <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-[#E7F1EB] text-[#3F6B52]">
                          Mastered
                        </span>
                      )}
                    </div>
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
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
