import { useEffect, useState } from "react";
import { Entry, GeneratedExample } from "../types";
import {
  getEntryById,
  updateEntry,
  deleteEntry,
  listExamples,
  addExamples,
  updateExample,
  deleteExample,
} from "../storage";
import { generateExamples } from "../lib/generateExamples";

interface EntryDetailProps {
  entryId: string;
  onBack: () => void;
  onDeleted: () => void;
}

const typePillStyles: Record<string, string> = {
  word: "bg-[#FEF2F2] text-[#BF3143]",
  idiom: "bg-[#F7F5FA] text-[#6E6282]",
  expression: "bg-[#F4F7F4] text-[#5C6D5F]",
  sentence: "bg-[#E7F1EB] text-[#3F6B52]",
};


function highlightTerm(sentence: string, term: string): React.ReactNode {
  const termLower = term.toLowerCase();
  const sentenceLower = sentence.toLowerCase();
  const index = sentenceLower.indexOf(termLower);

  if (index === -1) {
    return sentence;
  }

  const before = sentence.slice(0, index);
  const match = sentence.slice(index, index + term.length);
  const after = sentence.slice(index + term.length);

  return (
    <>
      {before}
      <mark className="bg-[#FEF2F2] text-[#BF3143] px-1 rounded">{match}</mark>
      {after}
    </>
  );
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function EntryDetail({
  entryId,
  onBack,
  onDeleted,
}: EntryDetailProps) {
  const [entry, setEntry] = useState<Entry | null>(null);
  const [examples, setExamples] = useState<GeneratedExample[]>([]);
  const [showNuance, setShowNuance] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const loadEntry = () => {
    const e = getEntryById(entryId);
    if (e) {
      setEntry(e);
    }
    setExamples(listExamples(entryId));
  };

  useEffect(() => {
    loadEntry();
  }, [entryId]);

  if (!entry) {
    return (
      <div className="max-w-md mx-auto px-4 py-6">
        <p className="text-[#64748b] text-center py-16">Entry not found.</p>
        <button
          onClick={onBack}
          className="w-full px-4 py-3 bg-[#f0f4f3] text-[#1e293b] rounded-lg font-medium"
        >
          Go Back
        </button>
      </div>
    );
  }

  const handleDelete = () => {
    deleteEntry(entryId);
    onDeleted();
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const texts = await generateExamples({
        term: entry.term,
        type: entry.type,
        style: "neutral",
        sourceSentence: entry.sourceSentence,
      });

      const newExamples = addExamples(entryId, "neutral", texts);
      setExamples((prev) => [...prev, ...newExamples]);
    } catch (error) {
      console.error("Failed to generate examples:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleToggleSave = (exampleId: string, currentSaved: boolean) => {
    updateExample(exampleId, { savedFlag: !currentSaved });
    setExamples((prev) =>
      prev.map((ex) =>
        ex.id === exampleId ? { ...ex, savedFlag: !currentSaved } : ex
      )
    );
  };

  const handleMarkMastered = () => {
    updateEntry(entryId, { masteredFlag: true });
    onBack();
  };

  const handleDeleteExample = (exampleId: string) => {
    deleteExample(exampleId);
    setExamples((prev) => prev.filter((ex) => ex.id !== exampleId));
  };

  return (
    <div className="max-w-md mx-auto px-4 py-6">
      {/* Header */}
      <header className="flex items-center gap-4 mb-8">
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
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-lg font-semibold text-[#1e293b]">Entry Detail</h1>
      </header>

      <div className="space-y-6">
        {/* Term & Type & Flags */}
        <div>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span
              className={`inline-block px-2 py-1 text-xs font-medium rounded-lg ${typePillStyles[entry.type]}`}
            >
              {entry.type}
            </span>
            {entry.repeatFlag && (
              <span className="text-[#BF3143]" title="In repeat list">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              </span>
            )}
            {entry.masteredFlag && (
              <span className="px-2 py-1 text-xs font-medium rounded-lg bg-[#E7F1EB] text-[#3F6B52]">
                Mastered
              </span>
            )}
          </div>
          <h2 className="text-3xl font-bold text-[#1e293b]">{entry.term}</h2>
        </div>

        {/* Tags */}
        {entry.tags && entry.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {entry.tags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-1 text-xs font-medium rounded-lg bg-[#F7F5FA] text-[#6E6282]"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Meaning */}
        <div className="bg-white border border-[#e2e8f0] rounded-lg p-4">
          <h3 className="text-sm font-medium text-[#64748b] mb-2">Meaning</h3>
          {entry.meaning ? (
            <p className="text-[#1e293b]">{entry.meaning}</p>
          ) : (
            <p className="text-[#9CA3AF] italic">No explanation yet.</p>
          )}
        </div>

        {/* Nuance (collapsible) */}
        {entry.nuance && (
          <div className="bg-white border border-[#e2e8f0] rounded-lg overflow-hidden">
            <button
              onClick={() => setShowNuance(!showNuance)}
              className="w-full px-4 py-3 flex items-center justify-between text-left"
            >
              <span className="text-sm font-medium text-[#64748b]">
                Nuance / Culture
              </span>
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
                className={`text-[#64748b] transition-transform ${showNuance ? "rotate-180" : ""}`}
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
            {showNuance && (
              <div className="px-4 pb-4">
                <p className="text-[#1e293b]">{entry.nuance}</p>
              </div>
            )}
          </div>
        )}

        {/* Source Sentence */}
        {entry.sourceSentence && (
          <div className="bg-white border border-[#e2e8f0] rounded-lg p-4">
            <h3 className="text-sm font-medium text-[#64748b] mb-2">
              Source Sentence
            </h3>
            <p className="text-[#1e293b] leading-relaxed">
              {highlightTerm(entry.sourceSentence, entry.term)}
            </p>
          </div>
        )}

        {/* Created Date */}
        <p className="text-xs text-[#9CA3AF]">
          Added {formatDate(entry.createdAt)}
          {entry.updatedAt && ` · Updated ${formatDate(entry.updatedAt)}`}
        </p>

        {/* Generate Button */}
        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="w-full px-4 py-3 bg-[#BF3143] text-white rounded-lg font-medium hover:bg-[#a52a3a] transition-colors disabled:opacity-50"
        >
          {isGenerating ? "Generating..." : "Generate Examples"}
        </button>

        {/* Examples Section */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-[#64748b]">Examples</h3>
          {examples.length === 0 ? (
            <p className="text-[#9CA3AF] italic text-sm py-4 text-center">
              No examples yet. Generate some.
            </p>
          ) : (
            <ul className="space-y-3">
              {examples.map((example) => (
                <li
                  key={example.id}
                  className="bg-white border border-[#e2e8f0] rounded-lg p-4"
                >
                  <p className="text-[#1e293b] mb-3">{example.text}</p>
                  <div className="flex items-center justify-end">
                    <div className="flex items-center gap-2">
                      {/* Save Toggle */}
                      <button
                        onClick={() =>
                          handleToggleSave(example.id, example.savedFlag)
                        }
                        className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                          example.savedFlag
                            ? "bg-[#E7F1EB] text-[#3F6B52]"
                            : "bg-[#f0f4f3] text-[#64748b]"
                        }`}
                      >
                        {example.savedFlag ? "Saved" : "Save"}
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => handleDeleteExample(example.id)}
                        className="p-1 text-[#9CA3AF] hover:text-[#BF3143] transition-colors"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Actions */}
        <div className="space-y-3 pt-4">
          {!entry.masteredFlag && (
            <button
              onClick={handleMarkMastered}
              className="w-full px-4 py-3 bg-[#E7F1EB] text-[#3F6B52] rounded-lg font-medium hover:bg-[#d4e8dc] transition-colors"
            >
              Mark as Mastered
            </button>
          )}
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full px-4 py-3 bg-[#FEF2F2] text-[#BF3143] rounded-lg font-medium hover:bg-[#fde8e8] transition-colors"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-[rgba(30,41,59,0.5)] flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-[#e2e8f0] rounded-lg p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-[#1e293b] mb-2">
              Delete Entry?
            </h3>
            <p className="text-[#64748b] mb-6">
              This will permanently delete "{entry.term}". This action cannot be
              undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-3 bg-[#f0f4f3] text-[#1e293b] rounded-lg font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-3 bg-[#BF3143] text-white rounded-lg font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
