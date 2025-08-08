import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";
import confetti from "canvas-confetti";
import { Chess, type Square as ChessSquare } from "chess.js";
import { Chessboard, type SquareHandlerArgs } from "react-chessboard";

type Theme = "light" | "dark";

const STORAGE_KEYS = {
  fen: "thechessapp.fen",
  history: "thechessapp.history",
  theme: "thechessapp.theme",
};

function App() {
  const game = useMemo(() => new Chess(), []);
  const [fen, setFen] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.fen);
      if (saved && saved !== "start") return saved;
    } catch {}
    return new Chess().fen();
  });
  const [moveHistory, setMoveHistory] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.history);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });
  const [theme] = useState<Theme>("light");
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [legalSquares, setLegalSquares] = useState<string[]>([]);
  const [captureSquares, setCaptureSquares] = useState<string[]>([]);
  const [playVsCpu, setPlayVsCpu] = useState<boolean>(true);
  const [playerColor, setPlayerColor] = useState<"w" | "b">("w");
  const [showNewGameConfirm, setShowNewGameConfirm] = useState<boolean>(false);

  // Initialize game to loaded FEN on mount
  useEffect(() => {
    try {
      game.load(fen);
    } catch {
      game.reset();
      setFen(game.fen());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game]);

  // Persist state
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.fen, fen);
      localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(moveHistory));
    } catch {}
  }, [fen, moveHistory]);

  // Apply theme (default: light)
  useEffect(() => {
    document.documentElement.classList.remove("dark");
  }, [theme]);

  const onSquareClick = useCallback(
    ({ square }: SquareHandlerArgs) => {
      // Ignore input when it's CPU's turn
      if (playVsCpu && game.turn() !== playerColor) return;
      const pieceAt = game.get(square as ChessSquare);
      // No selection yet: select own piece if present
      if (selectedSquare == null) {
        if (pieceAt && pieceAt.color === game.turn()) {
          setSelectedSquare(square);
          const moves = game.moves({
            square: square as ChessSquare,
            verbose: true,
          }) as Array<{ to: string; flags: string }>;
          setLegalSquares(moves.map((m) => m.to));
          setCaptureSquares(
            moves
              .filter((m) => m.flags.includes("c") || m.flags.includes("e"))
              .map((m) => m.to)
          );
        } else {
          setSelectedSquare(null);
          setLegalSquares([]);
          setCaptureSquares([]);
        }
        return;
      }

      // Clicking the selected square toggles off
      if (square === selectedSquare) {
        setSelectedSquare(null);
        setLegalSquares([]);
        setCaptureSquares([]);
        return;
      }

      // If clicking another own piece, switch selection
      if (pieceAt && pieceAt.color === game.turn()) {
        setSelectedSquare(square);
        const moves = game.moves({
          square: square as ChessSquare,
          verbose: true,
        }) as Array<{ to: string; flags: string }>;
        setLegalSquares(moves.map((m) => m.to));
        setCaptureSquares(
          moves
            .filter((m) => m.flags.includes("c") || m.flags.includes("e"))
            .map((m) => m.to)
        );
        return;
      }

      // Attempt a move from selected to clicked
      if (legalSquares.includes(square)) {
        const move = game.move({
          from: selectedSquare,
          to: square,
          promotion: "q",
        });
        if (move) {
          setFen(game.fen());
          setMoveHistory((prev) => [...prev, move.san]);
        }
      }

      setSelectedSquare(null);
      setLegalSquares([]);
      setCaptureSquares([]);
    },
    [game, selectedSquare, legalSquares, playVsCpu, playerColor]
  );

  const squareStyles = useMemo(() => {
    const styles: Record<string, CSSProperties> = {};
    if (selectedSquare) {
      styles[selectedSquare] = {
        boxShadow: "inset 0 0 0 3px rgba(16,185,129,0.85)",
      };
    }
    for (const sq of legalSquares) {
      if (captureSquares.includes(sq)) continue;
      styles[sq] = {
        ...(styles[sq] || {}),
        background:
          "radial-gradient(circle, rgba(16,185,129,0.9) 20%, rgba(16,185,129,0.0) 23%)",
      };
    }
    for (const sq of captureSquares) {
      styles[sq] = {
        ...(styles[sq] || {}),
        boxShadow: "inset 0 0 0 3px rgba(239,68,68,0.95)",
      };
    }
    return styles;
  }, [selectedSquare, legalSquares, captureSquares]);

  const performNewGame = useCallback(() => {
    game.reset();
    setFen(game.fen());
    setMoveHistory([]);
    setSelectedSquare(null);
    setLegalSquares([]);
    setCaptureSquares([]);
    setShowNewGameConfirm(false);
  }, [game]);

  const undoMove = useCallback(() => {
    const undone = game.undo();
    if (undone) {
      setFen(game.fen());
      setMoveHistory((prev) => prev.slice(0, -1));
    }
  }, [game]);

  // Simple CPU that prefers captures, otherwise plays random legal move
  const makeCpuMove = useCallback(() => {
    const legal = game.moves({ verbose: true }) as Array<{
      from: string;
      to: string;
      san: string;
      flags: string;
    }>;
    if (legal.length === 0) return;
    const captures = legal.filter(
      (m) => m.flags.includes("c") || m.flags.includes("e")
    );
    const pool = captures.length > 0 ? captures : legal;
    const choice = pool[Math.floor(Math.random() * pool.length)];
    const moved = game.move({
      from: choice.from,
      to: choice.to,
      promotion: "q",
    });
    if (moved) {
      setFen(game.fen());
      setMoveHistory((prev) => [...prev, moved.san]);
      setSelectedSquare(null);
      setLegalSquares([]);
      setCaptureSquares([]);
    }
  }, [game]);

  // Trigger CPU move when it's CPU's turn
  useEffect(() => {
    if (!playVsCpu) return;
    const cpuColor: "w" | "b" = playerColor === "w" ? "b" : "w";
    if (game.isGameOver()) return;
    if (game.turn() !== cpuColor) return;
    const id = setTimeout(() => {
      makeCpuMove();
    }, 300);
    return () => clearTimeout(id);
  }, [fen, playVsCpu, playerColor, game, makeCpuMove]);

  // Celebrate when human checkmates CPU
  useEffect(() => {
    if (!playVsCpu) return;
    if (!game.isCheckmate()) return;
    const winner: "w" | "b" = game.turn() === "w" ? "b" : "w"; // side that just moved
    if (winner !== playerColor) return;
    confetti({
      particleCount: 200,
      spread: 80,
      origin: { y: 0.6 },
      ticks: 220,
      gravity: 0.8,
      scalar: 1.3,
    });
  }, [fen, playVsCpu, playerColor, game]);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-10 backdrop-blur bg-white/70 dark:bg-neutral-900/70 border-b border-black/5 dark:border-white/5">
        <div className="max-w-5xl mx-auto px-4 py-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src="/chess-logo.svg"
              alt="Logo"
              className="h-8 w-8 sm:h-9 sm:w-9 rounded-md flex-shrink-0"
            />
            <h1 className="text-base sm:text-lg font-semibold tracking-tight truncate">
              The Chess App
            </h1>
          </div>
          <div className="w-full md:w-auto flex items-end gap-2 flex-wrap justify-center md:justify-end">
            <button
              className="px-2 py-1 text-xs sm:px-3 sm:py-1.5 rounded-md bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 sm:text-sm"
              onClick={() => setShowNewGameConfirm(true)}
            >
              New game
            </button>
            <button
              className="px-2 py-1 text-xs sm:px-3 sm:py-1.5 rounded-md border border-black/10 dark:border-white/10 sm:text-sm"
              onClick={undoMove}
            >
              Undo
            </button>

            <div className="hidden md:block h-6 w-px bg-black/10 dark:bg-white/10 mx-1" />
            <div className="flex items-center gap-1 text-xs sm:text-sm">
              <span className="text-neutral-400 text-xs sm:text-sm">
                Opponent:
              </span>
              <button
                className={`px-2 py-1 rounded-md border text-xs sm:text-sm ${
                  !playVsCpu
                    ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                    : "border-black/10 dark:border-white/10"
                }`}
                onClick={() => setPlayVsCpu(false)}
              >
                Human
              </button>
              <button
                className={`px-2 py-1 rounded-md border text-xs sm:text-sm ${
                  playVsCpu
                    ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                    : "border-black/10 dark:border-white/10"
                }`}
                onClick={() => setPlayVsCpu(true)}
              >
                CPU
              </button>
            </div>
            {playVsCpu && (
              <div className="flex items-center gap-1 text-xs sm:text-sm">
                <span className="text-neutral-400 text-xs sm:text-sm">
                  Play as:
                </span>
                <button
                  className={`px-2 py-1 rounded-md border text-xs sm:text-sm ${
                    playerColor === "w"
                      ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                      : "border-black/10 dark:border-white/10"
                  }`}
                  onClick={() => setPlayerColor("w")}
                >
                  White
                </button>
                <button
                  className={`px-2 py-1 rounded-md border text-xs sm:text-sm ${
                    playerColor === "b"
                      ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                      : "border-black/10 dark:border-white/10"
                  }`}
                  onClick={() => setPlayerColor("b")}
                >
                  Black
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-5xl mx-auto px-4 py-8 grid gap-6 md:grid-cols-[1fr,320px]">
          <div className="w-full aspect-square">
            <div className="h-full w-full rounded-xl border border-black/10 dark:border-white/10 overflow-hidden shadow-sm bg-white dark:bg-neutral-800">
              <Chessboard
                options={{
                  id: "TheChessAppBoard",
                  position: fen,
                  allowDragging: false,
                  onSquareClick,
                  squareStyles,
                  boardOrientation: playerColor === "w" ? "white" : "black",
                  boardStyle: { height: "100%", width: "100%" },
                  darkSquareStyle: {
                    backgroundColor: theme === "light" ? "#8ab4f8" : "#394045",
                  },
                  lightSquareStyle: {
                    backgroundColor: theme === "light" ? "#e9f1ff" : "#484f56",
                  },
                  animationDurationInMs: 200,
                  showAnimations: true,
                  allowDrawingArrows: true,
                  showNotation: true,
                }}
              />
            </div>
          </div>
          <aside className="space-y-4">
            <div className="rounded-xl border border-black/10 dark:border-white/10 p-4 bg-white dark:bg-neutral-800 shadow-sm">
              <h2 className="font-medium mb-2">Moves</h2>
              <div className="text-sm max-h-[420px] overflow-auto pr-1 leading-7">
                {moveHistory.length === 0 ? (
                  <p className="text-neutral-500">No moves yet.</p>
                ) : (
                  <ol className="list-decimal list-inside">
                    {moveHistory.map((san, index) => {
                      const side = index % 2 === 0 ? "White" : "Black";
                      return (
                        <li key={index}>
                          <span className="text-neutral-400">{side} — </span>
                          <span>{san}</span>
                        </li>
                      );
                    })}
                  </ol>
                )}
              </div>
            </div>
            <div className="rounded-xl border border-black/10 dark:border-white/10 p-4 bg-white dark:bg-neutral-800 shadow-sm">
              <h2 className="font-medium mb-2">Status</h2>
              <Status game={game} />
            </div>
          </aside>
        </div>
      </main>

      {showNewGameConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setShowNewGameConfirm(false)}
          />
          <div className="relative bg-white dark:bg-neutral-900 rounded-xl shadow-xl border border-black/10 dark:border-white/10 w-[92%] max-w-sm p-5">
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-md bg-gradient-to-br from-amber-400 to-rose-500 flex items-center justify-center text-white text-lg">
                !
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1">Start a new game?</h3>
                <p className="text-sm text-neutral-500">
                  This will clear the current position and move history.
                </p>
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                className="px-3 py-1.5 text-sm rounded-md border border-black/10 dark:border-white/10"
                onClick={() => setShowNewGameConfirm(false)}
              >
                Cancel
              </button>
              <button
                className="px-3 py-1.5 text-sm rounded-md bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                onClick={performNewGame}
              >
                New game
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="border-t border-black/5 dark:border-white/5">
        <div className="max-w-5xl mx-auto px-4 py-4 text-xs text-neutral-500">
          Made with ♟️ and React. If you enjoyed this, say hi on{" "}
          <a
            href="https://x.com/akashmanwar0"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-neutral-700"
          >
            X/Twitter @akashmanwar0
          </a>
          .
        </div>
      </footer>
    </div>
  );
}

function Status({ game }: { game: Chess }) {
  const isGameOver = game.isGameOver();
  const checkmated = game.isCheckmate();
  const turn = game.turn() === "w" ? "White" : "Black";
  const inCheck = game.isCheck();
  const drawn = game.isDraw();
  const stalemate = game.isStalemate();

  return (
    <ul className="text-sm space-y-1">
      <li>
        <strong>Turn:</strong> {turn}
      </li>
      {inCheck && <li className="text-amber-600">In check</li>}
      {checkmated && <li className="text-red-600">Checkmate</li>}
      {stalemate && <li className="text-blue-600">Stalemate</li>}
      {drawn && !stalemate && <li className="text-blue-600">Draw</li>}
      {isGameOver && !checkmated && !stalemate && !drawn && (
        <li className="text-neutral-400">Game over</li>
      )}
    </ul>
  );
}

export default App;
