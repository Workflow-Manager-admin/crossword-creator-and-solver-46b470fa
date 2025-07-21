"use client";
import { useState, useEffect, useCallback } from "react";

// ---------- Constants / Theme Styles ----------
const COLORS = {
  accent: "#f5a623",
  primary: "#0070f3",
  secondary: "#1a1a1a",
  lightBg: "#fff",
  lightFg: "#171717",
  darkBg: "#0a0a0a",
  darkFg: "#ededed",
};

const EMPTY_PUZZLE = (rows = 10, cols = 10) =>
  Array(rows)
    .fill("")
    .map(() => Array(cols).fill(""));

// --------- MAIN APP PAGE -------------
function CrosswordAppPage() {
  // Application state
  const [theme, setTheme] = useState("light");
  const [user, setUser] = useState(null); // {username: ...}
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authError, setAuthError] = useState("");

  const [puzzles, setPuzzles] = useState([]); // {id, title, grid, rows, cols, clues}
  const [myScores, setMyScores] = useState([]); // [{puzzleTitle, time}]
  type PuzzleType = {
    id: string;
    title: string;
    grid: string[][];
    rows: number;
    cols: number;
    clues: { across: Array<{ number: number; text: string }>; down: Array<{ number: number; text: string }> };
  };
  const [selectedPuzzle, setSelectedPuzzle] = useState<PuzzleType|null>(null);
  const [showPuzzleCreate, setShowPuzzleCreate] = useState(false);

  // Explicitly type solvingState as string[][] | null
  const [solvingState, setSolvingState] = useState<string[][] | null>(null);
  const [timer, setTimer] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [solved, setSolved] = useState(false);

  // For demo: store puzzles & scores in localStorage to persist for reload
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedPuzzles = JSON.parse(
        localStorage.getItem("puzzles") || "[]"
      );
      if (savedPuzzles.length) setPuzzles(savedPuzzles);
      const savedScores = JSON.parse(
        localStorage.getItem("scores") || "[]"
      );
      setMyScores(savedScores || []);
      const savedUser = JSON.parse(localStorage.getItem("user") || "null");
      if (savedUser) setUser(savedUser);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined")
      localStorage.setItem("puzzles", JSON.stringify(puzzles));
  }, [puzzles]);
  useEffect(() => {
    if (typeof window !== "undefined")
      localStorage.setItem("scores", JSON.stringify(myScores));
  }, [myScores]);
  useEffect(() => {
    if (typeof window !== "undefined")
      localStorage.setItem("user", JSON.stringify(user));
  }, [user]);

  // Timer control
  useEffect(() => {
    if (timerActive && !solved) {
      const intv = setInterval(() => setTimer((t) => t + 1), 1000);
      return () => clearInterval(intv);
    }
  }, [timerActive, solved]);

  // Theme management
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (theme === "dark") {
        document.body.style.backgroundColor = COLORS.darkBg;
        document.body.style.color = COLORS.darkFg;
      } else {
        document.body.style.backgroundColor = COLORS.lightBg;
        document.body.style.color = COLORS.lightFg;
      }
    }
  }, [theme]);

  // Puzzle selection/solving
  const startSolving = (puzzle: PuzzleType) => {
    setSelectedPuzzle(puzzle);
    setSolvingState(EMPTY_PUZZLE(puzzle.rows, puzzle.cols));
    setSolved(false);
    setTimer(0);
    setTimerActive(true);
  };

  // Handler for user registration/login (local demo version only)
  const handleAuth = ({ username, password, register }) => {
    // Minimal local only "user system"
    if (!username || !password) {
      setAuthError("Missing credentials");
      return;
    }
    if (register) {
      // In a real system, check for existing users
      setUser({ username });
      setAuthError("");
      setAuthModalOpen(false);
      localStorage.setItem("user", JSON.stringify({ username }));
    } else {
      // "Login" logic: accept any credentials for demo
      setUser({ username });
      setAuthError("");
      setAuthModalOpen(false);
      localStorage.setItem("user", JSON.stringify({ username }));
    }
  };

  // Handler for creating a puzzle
  const handleCreatePuzzle = (puzzle) => {
    setPuzzles((curr) => [...curr, puzzle]);
  };

  // Check if solve is correct
  const checkSolution = useCallback(() => {
    if (!selectedPuzzle || !solvingState) return false;
    for (let row = 0; row < selectedPuzzle.rows; row++) {
      for (let col = 0; col < selectedPuzzle.cols; col++) {
        if (selectedPuzzle.grid[row][col].trim() !== "") {
          if (
            solvingState[row][col].toUpperCase() !==
            selectedPuzzle.grid[row][col].toUpperCase()
          )
            return false;
        }
      }
    }
    return true;
  }, [selectedPuzzle, solvingState]);

  // On solving complete:
  useEffect(() => {
    if (
      selectedPuzzle &&
      solvingState &&
      checkSolution() &&
      !solved &&
      timerActive
    ) {
      setSolved(true);
      setTimerActive(false);
      // Record score
      if (user) {
        setMyScores((curr) => [
          ...curr,
          { username: user.username, puzzleTitle: selectedPuzzle.title, time: timer },
        ]);
      }
    }
  }, [solvingState, checkSolution, selectedPuzzle, solved, timerActive, timer, user]);

  // Handler for reveal solution
  const revealSolution = () => {
    if (!selectedPuzzle) return;
    setSolvingState(
      selectedPuzzle.grid.map((row) =>
        row.map(cell => cell.trim() !== "" ? cell.toUpperCase() : "")
      )
    );
    setSolved(true);
    setTimerActive(false);
  };

  // Leaderboard derives from scores
  const leaderboard =
    myScores?.length
      ? [...myScores]
          .sort((a, b) => a.time - b.time)
          .slice(0, 10)
          .map((s) => ({
            username: s.username || "anonymous",
            puzzleTitle: s.puzzleTitle,
            time: s.time,
          }))
      : [];

  // Responsive Design: final grid
  return (
    <div
      className={`h-screen min-h-screen flex flex-col`}
      style={{
        background: theme === "dark" ? COLORS.darkBg : COLORS.lightBg,
        color: theme === "dark" ? COLORS.darkFg : COLORS.secondary,
      }}
    >
      <TopNav
        onThemeToggle={() => setTheme(theme === "light" ? "dark" : "light")}
        theme={theme}
        user={user}
        onLogout={() => {
          setUser(null);
          localStorage.removeItem("user");
        }}
        onShowAuth={() => setAuthModalOpen(true)}
      />
      <div className="flex flex-1 w-full">
        {/* Sidebar */}
        <Sidebar
          user={user}
          onShowCreatePuzzle={() => setShowPuzzleCreate(true)}
          puzzles={puzzles}
          onSelectPuzzle={startSolving}
          myScores={myScores.filter(s => user && s.username === user.username)}
          theme={theme}
        />
        {/* Main Area */}
        <main className="flex-1 flex flex-col items-center justify-center p-5">
          {!selectedPuzzle ? (
            <div className="flex flex-col items-center w-full max-w-xl mt-24">
              <h1 className="text-3xl font-bold mb-4">Welcome to Crossword Creator & Solver!</h1>
              <p className="mb-8 text-md text-gray-600 text-center">
                Create your own crossword puzzles, solve them, compete on time, see the global leaderboard, and challenge your friends!
              </p>
              <button
                className="px-7 py-3 rounded font-semibold text-lg shadow bg-accent text-secondary hover:bg-primary transition"
                style={{ background: COLORS.accent, color: COLORS.secondary }}
                onClick={() =>
                  puzzles.length
                    ? startSolving(puzzles[0])
                    : setShowPuzzleCreate(true)
                }
              >
                {puzzles.length ? "Solve Latest Puzzle" : "Create Your First Puzzle"}
              </button>
            </div>
          ) : (
            <CrosswordGrid
              puzzle={selectedPuzzle}
              solving={true}
              solutionState={solvingState}
              setSolutionState={setSolvingState}
              clues={selectedPuzzle.clues}
              onReveal={revealSolution}
              timer={timer}
              completed={solved}
              theme={theme}
            />
          )}
          {/* Puzzle Title and Navigation */}
          {selectedPuzzle && (
            <div className="flex gap-3 mt-4">
              <button
                className="px-4 py-1 bg-white border rounded text-sm font-medium shadow hover:bg-gray-100"
                onClick={() => setSelectedPuzzle(null)}
                style={{ color: COLORS.secondary }}
              >
                Back
              </button>
              <button
                className="px-5 py-1.5 bg-accent rounded shadow text-secondary font-semibold"
                style={{ background: COLORS.accent }}
                onClick={() => setShowPuzzleCreate(true)}
              >
                New Puzzle
              </button>
            </div>
          )}
        </main>
      </div>
      <Leaderboard entries={leaderboard} theme={theme} />

      {/* Modals */}
      <AuthModal
        show={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onAuth={handleAuth}
        errorMsg={authError}
      />
      <PuzzleCreateModal
        show={showPuzzleCreate}
        theme={theme}
        onClose={() => setShowPuzzleCreate(false)}
        onCreate={handleCreatePuzzle}
      />
    </div>
  );
}

// [ ... helper components remain exactly as previously written ... ]

export default CrosswordAppPage;
