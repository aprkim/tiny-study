import { useState, useEffect } from "react";
import { getApiKey, setApiKey, clearApiKey, hasApiKey } from "../lib/anthropic";
import { useAuth } from "../contexts/AuthContext";

export default function Settings() {
  const { user, signOut } = useAuth();
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [isKeySet, setIsKeySet] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
    } catch (error) {
      console.error("Sign out error:", error);
    } finally {
      setSigningOut(false);
    }
  };

  useEffect(() => {
    setIsKeySet(hasApiKey());
    const existingKey = getApiKey();
    if (existingKey) {
      // Show masked version
      setApiKeyInput(existingKey);
    }
  }, []);

  const handleSave = () => {
    if (!apiKeyInput.trim()) {
      setSaveStatus("error");
      return;
    }

    setApiKey(apiKeyInput.trim());
    setIsKeySet(true);
    setSaveStatus("saved");

    setTimeout(() => setSaveStatus("idle"), 2000);
  };

  const handleClear = () => {
    clearApiKey();
    setApiKeyInput("");
    setIsKeySet(false);
    setSaveStatus("idle");
  };

  const maskedKey = apiKeyInput
    ? `${apiKeyInput.slice(0, 7)}...${apiKeyInput.slice(-4)}`
    : "";

  return (
    <div className="max-w-md mx-auto px-4 py-6 pb-24">
      {/* Header */}
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-[#1e293b]">Settings</h1>
      </header>

      <div className="space-y-6">
        {/* API Key Section */}
        <div className="bg-white border border-[#e2e8f0] rounded-lg p-4">
          <h2 className="font-semibold text-[#1e293b] mb-2">
            Anthropic API Key
          </h2>
          <p className="text-sm text-[#64748b] mb-4">
            Add your API key to enable AI-powered explanations and example
            generation. Get your key from{" "}
            <a
              href="https://console.anthropic.com/settings/keys"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#BF3143] underline"
            >
              console.anthropic.com
            </a>
          </p>

          {isKeySet && !showKey ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="px-3 py-2 bg-[#E7F1EB] text-[#3F6B52] rounded-lg text-sm font-medium">
                  Key configured
                </span>
                <span className="text-sm text-[#64748b] font-mono">
                  {maskedKey}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowKey(true)}
                  className="px-4 py-2 bg-[#f0f4f3] text-[#1e293b] rounded-lg text-sm font-medium hover:bg-[#e2e8f0] transition-colors"
                >
                  Edit Key
                </button>
                <button
                  onClick={handleClear}
                  className="px-4 py-2 bg-[#FEF2F2] text-[#BF3143] rounded-lg text-sm font-medium hover:bg-[#fde8e8] transition-colors"
                >
                  Remove Key
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <input
                type="password"
                value={apiKeyInput}
                onChange={(e) => {
                  setApiKeyInput(e.target.value);
                  setSaveStatus("idle");
                }}
                placeholder="sk-ant-..."
                className="w-full px-4 py-3 bg-white border border-[#e2e8f0] rounded-lg text-[#1e293b] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#BF3143] font-mono text-sm"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-[#BF3143] text-white rounded-lg text-sm font-medium hover:bg-[#a52a3a] transition-colors"
                >
                  Save Key
                </button>
                {isKeySet && (
                  <button
                    onClick={() => {
                      setShowKey(false);
                      setApiKeyInput(getApiKey() || "");
                    }}
                    className="px-4 py-2 bg-[#f0f4f3] text-[#1e293b] rounded-lg text-sm font-medium hover:bg-[#e2e8f0] transition-colors"
                  >
                    Cancel
                  </button>
                )}
              </div>
              {saveStatus === "saved" && (
                <p className="text-sm text-[#3F6B52]">API key saved successfully!</p>
              )}
              {saveStatus === "error" && (
                <p className="text-sm text-[#BF3143]">Please enter a valid API key.</p>
              )}
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className="bg-[#F7F5FA] border border-[#e2e8f0] rounded-lg p-4">
          <h3 className="font-medium text-[#6E6282] mb-2">How it works</h3>
          <ul className="text-sm text-[#64748b] space-y-2">
            <li>
              <strong>Save + Explain:</strong> AI generates meaning and nuance for new entries
            </li>
            <li>
              <strong>Generate Examples:</strong> AI creates 3 contextual example sentences
            </li>
            <li>
              <strong>Privacy:</strong> Your API key is stored locally in your browser
            </li>
          </ul>
        </div>

        {/* Account Section */}
        <div className="bg-white border border-[#e2e8f0] rounded-lg p-4">
          <h2 className="font-semibold text-[#1e293b] mb-2">Account</h2>
          <p className="text-sm text-[#64748b] mb-4">
            Signed in as {user?.email}
          </p>
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="px-4 py-2 bg-[#FEF2F2] text-[#BF3143] rounded-lg text-sm font-medium hover:bg-[#fde8e8] transition-colors disabled:opacity-50"
          >
            {signingOut ? "Signing out..." : "Sign Out"}
          </button>
        </div>
      </div>
    </div>
  );
}
