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
import { translateToKorean } from "../lib/translate";

interface EntryDetailProps {
  entryId: string;
  entryIds?: string[];
  onBack: () => void;
  onDeleted: () => void;
  onNavigate?: (id: string) => void;
}

const typePillStyles: Record<string, string> = {
  word: "bg-[#FEF2F2] text-[#BF3143]",
  idiom: "bg-[#F7F5FA] text-[#6E6282]",
  expression: "bg-[#F4F7F4] text-[#5C6D5F]",
  sentence: "bg-[#E7F1EB] text-[#3F6B52]",
};

const typeLabels: Record<string, string> = {
  word: "Learn",
  idiom: "Idiom",
  expression: "Make It Mine",
  sentence: "Sentence",
};

// Text-to-speech helper functions
function speakText(text: string, onEnd?: () => void) {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    if (onEnd) {
      utterance.onend = onEnd;
      utterance.onerror = onEnd;
    }
    window.speechSynthesis.speak(utterance);
  }
}

function pauseSpeaking() {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.pause();
  }
}

function resumeSpeaking() {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.resume();
  }
}

function stopSpeaking() {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}


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
  entryIds = [],
  onBack,
  onDeleted,
  onNavigate,
}: EntryDetailProps) {
  const [entry, setEntry] = useState<Entry | null>(null);
  const [loading, setLoading] = useState(true);
  const [examples, setExamples] = useState<GeneratedExample[]>([]);
  const [showNuance, setShowNuance] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [termTranslation, setTermTranslation] = useState<string>("");
  const [sourceTranslation, setSourceTranslation] = useState<string>("");
  const [isTranslatingTerm, setIsTranslatingTerm] = useState(false);
  const [isTranslatingSource, setIsTranslatingSource] = useState(false);
  const [speechState, setSpeechState] = useState<{ id: string; status: 'playing' | 'paused'; text: string } | null>(null);

  const handleSpeak = (text: string, id: string) => {
    if (speechState?.id === id) {
      if (speechState.status === 'playing') {
        // Pause
        pauseSpeaking();
        setSpeechState({ ...speechState, status: 'paused' });
      } else {
        // Resume
        resumeSpeaking();
        setSpeechState({ ...speechState, status: 'playing' });
      }
    } else {
      // Start new speech (stops any current)
      setSpeechState({ id, status: 'playing', text });
      speakText(text, () => setSpeechState(null));
    }
  };

  const handleReplay = () => {
    if (speechState) {
      const { id, text } = speechState;
      setSpeechState({ id, status: 'playing', text });
      speakText(text, () => setSpeechState(null));
    }
  };

  const loadEntry = async () => {
    setLoading(true);
    // Stop any ongoing speech when navigating
    stopSpeaking();
    setSpeechState(null);
    try {
      const e = await getEntryById(entryId);
      if (e) {
        setEntry(e);
      }
      const examplesList = await listExamples(entryId);
      setExamples(examplesList);
      // Reset translations when navigating to a new entry
      setTermTranslation("");
      setSourceTranslation("");
    } catch (error) {
      console.error("Failed to load entry:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEntry();
  }, [entryId]);

  // Navigation for multiple entries
  const currentIndex = entryIds.indexOf(entryId);
  const hasMultipleEntries = entryIds.length > 1;
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < entryIds.length - 1;

  const handlePrevious = () => {
    if (hasPrevious && onNavigate) {
      onNavigate(entryIds[currentIndex - 1]);
      window.scrollTo(0, 0);
    }
  };

  const handleNext = () => {
    if (hasNext && onNavigate) {
      onNavigate(entryIds[currentIndex + 1]);
      window.scrollTo(0, 0);
    }
  };

  if (loading) {
    return (
      <div className="max-w-md mx-auto px-4 py-6">
        <p className="text-[#64748b] text-center py-16">Loading...</p>
      </div>
    );
  }

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

  const handleDelete = async () => {
    await deleteEntry(entryId);
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

      const newExamples = await addExamples(entryId, "neutral", texts);
      setExamples((prev) => [...prev, ...newExamples]);
    } catch (error) {
      console.error("Failed to generate examples:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleToggleSave = async (exampleId: string, currentSaved: boolean) => {
    await updateExample(exampleId, { savedFlag: !currentSaved });
    setExamples((prev) =>
      prev.map((ex) =>
        ex.id === exampleId ? { ...ex, savedFlag: !currentSaved } : ex
      )
    );
  };

  const handleMarkMastered = async () => {
    await updateEntry(entryId, { masteredFlag: true });
    onBack();
  };

  const handleDeleteExample = async (exampleId: string) => {
    await deleteExample(exampleId);
    setExamples((prev) => prev.filter((ex) => ex.id !== exampleId));
  };

  const handleTranslateTerm = async () => {
    if (!entry) return;
    setIsTranslatingTerm(true);
    try {
      const translation = await translateToKorean(entry.term, entry.sourceSentence);
      setTermTranslation(translation);
    } catch (error) {
      console.error("Translation failed:", error);
      setTermTranslation("[번역 실패]");
    } finally {
      setIsTranslatingTerm(false);
    }
  };

  const handleTranslateSource = async () => {
    if (!entry?.sourceSentence) return;
    setIsTranslatingSource(true);
    try {
      const translation = await translateToKorean(entry.sourceSentence);
      setSourceTranslation(translation);
    } catch (error) {
      console.error("Translation failed:", error);
      setSourceTranslation("[번역 실패]");
    } finally {
      setIsTranslatingSource(false);
    }
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
              {typeLabels[entry.type] || entry.type}
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
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-bold text-[#1e293b]">{entry.term}</h2>
            <button
              onClick={() => handleSpeak(entry.term, 'term')}
              className={`p-2 transition-colors ${speechState?.id === 'term' ? 'text-[#BF3143]' : 'text-[#64748b] hover:text-[#BF3143]'}`}
              title={speechState?.id === 'term' ? (speechState.status === 'playing' ? 'Pause' : 'Resume') : 'Read aloud'}
            >
              {speechState?.id === 'term' && speechState.status === 'playing' ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="4" width="4" height="16" rx="1" />
                  <rect x="14" y="4" width="4" height="16" rx="1" />
                </svg>
              ) : speechState?.id === 'term' && speechState.status === 'paused' ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                </svg>
              )}
            </button>
            {speechState?.id === 'term' && speechState.status === 'paused' && (
              <button
                onClick={handleReplay}
                className="p-2 text-[#64748b] hover:text-[#BF3143] transition-colors"
                title="Replay from start"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                </svg>
              </button>
            )}
            <button
              onClick={handleTranslateTerm}
              disabled={isTranslatingTerm}
              className="p-2 text-[#64748b] hover:text-[#BF3143] transition-colors disabled:opacity-50"
              title="Translate to Korean"
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
                <path d="M5 8l6 6M4 14l6-6 2-3M2 5h12M7 2h1M22 22l-5-10-5 10M14 18h6" />
              </svg>
            </button>
          </div>
          {termTranslation && (
            <p className="text-[#64748b] mt-1">{termTranslation}</p>
          )}
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

        {/* Meaning - only for Learn mode (not expression) */}
        {entry.type !== "expression" && (
          <div className="bg-white border border-[#e2e8f0] rounded-lg p-4">
            <h3 className="text-sm font-medium text-[#64748b] mb-2">Meaning</h3>
            {entry.meaning ? (
              <p className="text-[#1e293b]">{entry.meaning}</p>
            ) : (
              <p className="text-[#9CA3AF] italic">No explanation yet.</p>
            )}
          </div>
        )}

        {/* Nuance (collapsible) - only for Learn mode (not expression) */}
        {entry.type !== "expression" && entry.nuance && (
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
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-[#64748b]">
                Source Sentence
              </h3>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleSpeak(entry.sourceSentence!, 'source')}
                  className={`p-1 transition-colors ${speechState?.id === 'source' ? 'text-[#BF3143]' : 'text-[#64748b] hover:text-[#BF3143]'}`}
                  title={speechState?.id === 'source' ? (speechState.status === 'playing' ? 'Pause' : 'Resume') : 'Read aloud'}
                >
                  {speechState?.id === 'source' && speechState.status === 'playing' ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <rect x="6" y="4" width="4" height="16" rx="1" />
                      <rect x="14" y="4" width="4" height="16" rx="1" />
                    </svg>
                  ) : speechState?.id === 'source' && speechState.status === 'paused' ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                    </svg>
                  )}
                </button>
                {speechState?.id === 'source' && speechState.status === 'paused' && (
                  <button
                    onClick={handleReplay}
                    className="p-1 text-[#64748b] hover:text-[#BF3143] transition-colors"
                    title="Replay from start"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                      <path d="M3 3v5h5" />
                    </svg>
                  </button>
                )}
                <button
                  onClick={handleTranslateSource}
                  disabled={isTranslatingSource}
                  className="p-1 text-[#64748b] hover:text-[#BF3143] transition-colors disabled:opacity-50"
                  title="Translate to Korean"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M5 8l6 6M4 14l6-6 2-3M2 5h12M7 2h1M22 22l-5-10-5 10M14 18h6" />
                  </svg>
                </button>
              </div>
            </div>
            <p className="text-[#1e293b] leading-relaxed">
              {highlightTerm(entry.sourceSentence, entry.term)}
            </p>
            {sourceTranslation && (
              <p className="text-[#64748b] mt-2 pt-2 border-t border-[#e2e8f0]">
                {sourceTranslation}
              </p>
            )}
          </div>
        )}

        {/* Generate Button - only for Learn mode (not expression) */}
        {entry.type !== "expression" && (
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full px-4 py-3 bg-[#BF3143] text-white rounded-lg font-medium hover:bg-[#a52a3a] transition-colors disabled:opacity-50"
          >
            {isGenerating ? "Generating..." : "Generate Examples"}
          </button>
        )}

        {/* Examples Section - only show when there are examples and not expression type */}
        {entry.type !== "expression" && examples.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-[#64748b]">Examples</h3>
            <ul className="space-y-3">
              {examples.map((example) => (
                <li
                  key={example.id}
                  className="bg-white border border-[#e2e8f0] rounded-lg p-4"
                >
                  <p className="text-[#1e293b] mb-3">{example.text}</p>
                  <div className="flex items-center justify-end">
                    <div className="flex items-center gap-2">
                      {/* Read Aloud */}
                      <button
                        onClick={() => handleSpeak(example.text, `example-${example.id}`)}
                        className={`p-1 transition-colors ${speechState?.id === `example-${example.id}` ? 'text-[#BF3143]' : 'text-[#9CA3AF] hover:text-[#BF3143]'}`}
                        title={speechState?.id === `example-${example.id}` ? (speechState.status === 'playing' ? 'Pause' : 'Resume') : 'Read aloud'}
                      >
                        {speechState?.id === `example-${example.id}` && speechState.status === 'playing' ? (
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <rect x="6" y="4" width="4" height="16" rx="1" />
                            <rect x="14" y="4" width="4" height="16" rx="1" />
                          </svg>
                        ) : speechState?.id === `example-${example.id}` && speechState.status === 'paused' ? (
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <polygon points="5 3 19 12 5 21 5 3" />
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                          </svg>
                        )}
                      </button>
                      {speechState?.id === `example-${example.id}` && speechState.status === 'paused' && (
                        <button
                          onClick={handleReplay}
                          className="p-1 text-[#9CA3AF] hover:text-[#BF3143] transition-colors"
                          title="Replay from start"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                            <path d="M3 3v5h5" />
                          </svg>
                        </button>
                      )}

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
          </div>
        )}

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

        {/* Navigation for multiple entries */}
        {hasMultipleEntries && (
          <div className="flex items-center justify-between pt-4">
            <button
              onClick={handlePrevious}
              disabled={!hasPrevious}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                hasPrevious
                  ? "text-[#1e293b] bg-[#f0f4f3] hover:bg-[#e2e8f0]"
                  : "text-[#9CA3AF] bg-[#f7f9f8] cursor-not-allowed"
              }`}
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
                <path d="M15 18l-6-6 6-6" />
              </svg>
              Previous
            </button>
            <span className="text-sm text-[#64748b]">
              {currentIndex + 1} / {entryIds.length}
            </span>
            <button
              onClick={handleNext}
              disabled={!hasNext}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                hasNext
                  ? "text-white bg-[#BF3143] hover:bg-[#a52a3a]"
                  : "text-[#9CA3AF] bg-[#f7f9f8] cursor-not-allowed"
              }`}
            >
              Next
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
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </div>
        )}

        {/* Created Date */}
        <p className="text-xs text-[#9CA3AF] text-right">
          Added {formatDate(entry.createdAt)}
        </p>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-[rgba(30,41,59,0.5)] flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-[#e2e8f0] rounded-lg p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-[#1e293b] mb-2">
              Delete Entry?
            </h3>
            <p className="text-[#64748b] mb-6">
              This will permanently delete "{entry.term}".
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
