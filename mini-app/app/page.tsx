"use client";

import { useEffect, useState } from "react";

const GAME_URL = "https://mangala.miniapp-factory.marketplace.openxai.network/";

export default function Page() {
  // -------------------------
  // GAME STATE
  // -------------------------
  const initialBoard = () => {
    const arr = new Array(14).fill(4);
    arr[6] = 0;  // P1 store
    arr[13] = 0; // P2 store
    return arr;
  };

  const [board, setBoard] = useState<number[]>(initialBoard);
  const [currentPlayer, setCurrentPlayer] = useState(0); // 0 = P1, 1 = P2
  const [gameOver, setGameOver] = useState(false);
  const [opponent, setOpponent] = useState<"cpu" | "human">("cpu");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">(
    "medium"
  );
  const [status, setStatus] = useState("Click “Start Game” to begin.");
  const [shareMessage, setShareMessage] = useState("");
  const [showShare, setShowShare] = useState(false);

  const [isInteractive, setIsInteractive] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [showVSOverlay, setShowVSOverlay] = useState(false);
  const [resultLabel, setResultLabel] = useState<string | null>(null);
  const [finalScoreText, setFinalScoreText] = useState<string | null>(null);
  const [isCountingDown, setIsCountingDown] = useState(false);

  // -------------------------
  // HELPERS
  // -------------------------
  const isOwnPit = (i: number, player: number) => {
    if (player === 0) return i >= 0 && i <= 5;
    return i >= 7 && i <= 12;
  };

  const ownStore = (player: number) => (player === 0 ? 6 : 13);
  const oppStore = (player: number) => (player === 0 ? 13 : 6);

  const gameEnded = (b: number[]) => {
    const p1Empty = b.slice(0, 6).every((v) => v === 0);
    const p2Empty = b.slice(7, 13).every((v) => v === 0);
    return p1Empty || p2Empty;
  };

  const finalize = (b: number[]) => {
    const copy = [...b];
    const p1Empty = copy.slice(0, 6).every((v) => v === 0);
    const p2Empty = copy.slice(7, 13).every((v) => v === 0);

    // P1 side empty -> all remaining stones to P1 store
    if (p1Empty) {
      let sum = 0;
      for (let i = 0; i <= 5; i++) {
        sum += copy[i];
        copy[i] = 0;
      }
      for (let i = 7; i <= 12; i++) {
        sum += copy[i];
        copy[i] = 0;
      }
      copy[6] += sum;
    } else if (p2Empty) {
      let sum = 0;
      for (let i = 0; i <= 5; i++) {
        sum += copy[i];
        copy[i] = 0;
      }
      for (let i = 7; i <= 12; i++) {
        sum += copy[i];
        copy[i] = 0;
      }
      copy[13] += sum;
    }

    return copy;
  };

  // -------------------------
  // APPLY MOVE (with special first stone rule)
  // -------------------------
  const applyMove = (state: number[], pit: number, player: number) => {
    let b = [...state];
    if (!isOwnPit(pit, player) || b[pit] === 0)
      return { board: b, extra: false, end: false };

    let stones = b[pit];
    b[pit] = 0;
    let index = pit;

    // SPECIAL RULE:
    // If more than 1 stone -> first stone goes back into the same pit.
    // If exactly 1 stone -> goes to next pit.
    if (stones > 1) {
      b[pit] += 1;
      stones -= 1;
    }

    while (stones > 0) {
      index = (index + 1) % 14;
      if (index === oppStore(player)) continue; // skip opponent's store
      b[index]++;
      stones--;
    }

    // Capture rule
    if (isOwnPit(index, player) && b[index] === 1) {
      const opposite = 12 - index;
      if (b[opposite] > 0) {
        const captured = b[opposite] + 1;
        b[opposite] = 0;
        b[index] = 0;
        b[ownStore(player)] += captured;
      }
    }

    const extra = index === ownStore(player);
    let end = gameEnded(b);
    if (end) b = finalize(b);

    return { board: b, extra, end };
  };

  // -------------------------
  // CPU AI
  // -------------------------
  const evaluate = (b: number[], player: number) => {
    return b[ownStore(player)] - b[ownStore(1 - player)];
  };

  const minimax = (
    b: number[],
    depth: number,
    player: number,
    maximizing: boolean,
    rootPlayer: number
  ): { score: number; move?: number } => {
    if (depth === 0 || gameEnded(b)) return { score: evaluate(b, rootPlayer) };

    const legal: number[] = [];
    for (let i = 7; i <= 12; i++) if (b[i] > 0) legal.push(i);
    if (legal.length === 0) return { score: evaluate(b, rootPlayer) };

    if (maximizing) {
      let best = -Infinity;
      let bestMove = legal[0];
      for (const m of legal) {
        const res = applyMove(b, m, player);
        const next = minimax(
          res.board,
          depth - 1,
          res.extra ? player : 1 - player,
          res.extra ? true : false,
          rootPlayer
        );
        if (next.score > best) {
          best = next.score;
          bestMove = m;
        }
      }
      return { score: best, move: bestMove };
    } else {
      let best = Infinity;
      let bestMove = legal[0];
      for (const m of legal) {
        const res = applyMove(b, m, player);
        const next = minimax(
          res.board,
          depth - 1,
          res.extra ? player : 1 - player,
          res.extra ? false : true,
          rootPlayer
        );
        if (next.score < best) {
          best = next.score;
          bestMove = m;
        }
      }
      return { score: best, move: bestMove };
    }
  };

  const cpuMove = () => {
    const legal: number[] = [];
    for (let i = 7; i <= 12; i++) if (board[i] > 0) legal.push(i);
    if (legal.length === 0) return null;

    if (difficulty === "easy") {
      return legal[Math.floor(Math.random() * legal.length)];
    }

    if (difficulty === "medium") {
      let best = -Infinity;
      let bestMoves: number[] = [];
      for (const m of legal) {
        const res = applyMove(board, m, 1);
        const score = evaluate(res.board, 1) + (res.extra ? 3 : 0);
        if (score > best) {
          best = score;
          bestMoves = [m];
        } else if (score === best) {
          bestMoves.push(m);
        }
      }
      return bestMoves[Math.floor(Math.random() * bestMoves.length)];
    }

    const res = minimax(board, 3, 1, true, 1);
    return res.move ?? legal[Math.floor(Math.random() * legal.length)];
  };

  // -------------------------
  // STONE CLUSTER (Centered)
  // -------------------------
  const StoneCluster = ({ count }: { count: number }) => {
    const n = Math.min(count, 12);
    if (n === 0) return null;
    const stones = Array.from({ length: n });

    return (
      <div className="grid grid-cols-3 gap-[2px]">
        {stones.map((_, idx) => (
          <div
            key={idx}
            className="w-2.5 h-2.5 rounded-full bg-yellow-400"
          />
        ))}
      </div>
    );
  };

  // -------------------------
  // PLAYER MOVE
  // -------------------------
  const handlePitClick = (i: number) => {
    if (!isInteractive || gameOver) return;
    if (opponent === "cpu" && currentPlayer === 1) return;
    if (!isOwnPit(i, currentPlayer)) return;
    if (board[i] === 0) return;

    playMove(i);
  };

  const playMove = (i: number) => {
    const res = applyMove(board, i, currentPlayer);
    setBoard(res.board);

    if (res.end) {
      finishGame(res.board);
      return;
    }
    if (!res.extra) {
      setCurrentPlayer(currentPlayer === 0 ? 1 : 0);
    }
  };

  // -------------------------
  // CPU TURN
  // -------------------------
  useEffect(() => {
    if (!gameOver && opponent === "cpu" && currentPlayer === 1 && isInteractive) {
      const timeout = setTimeout(() => {
        const mv = cpuMove();
        if (mv === null) {
          finishGame(board);
          return;
        }
        playMove(mv);
      }, 650);

      return () => clearTimeout(timeout);
    }
  }, [currentPlayer, opponent, gameOver, board, difficulty, isInteractive]);

  // -------------------------
  // END GAME
  // -------------------------
  const finishGame = (b: number[]) => {
    const final = finalize(b);
    setBoard(final);
    setGameOver(true);
    setIsInteractive(false);
    setShowVSOverlay(false);

    const p1 = final[6];
    const p2 = final[13];
    const scoreText = `${p1} - ${p2}`;
    setFinalScoreText(scoreText);

    if (p1 > p2) {
      setResultLabel("You won!");
      setShareMessage(`I won with score ${p1}-${p2}! Play Turkish Mangala too:`);
    } else if (p2 > p1) {
      setResultLabel("You lost!");
      setShareMessage(`I lost with score ${p1}-${p2}... Try Turkish Mangala:`);
    } else {
      setResultLabel("It's a draw!");
      setShareMessage(`It's a draw with score ${p1}-${p2}! Play Turkish Mangala:`);
    }

    setShowShare(true);
    setStatus("Game finished.");
  };

  // -------------------------
  // SHARE
  // -------------------------
  const shareFarcaster = () => {
    const text = `${shareMessage} ${GAME_URL}\n\n@openxainetwork`;
    const url = `https://warpcast.com/~/compose?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const shareTwitter = () => {
    const text = `${shareMessage} ${GAME_URL}\n\n@OpenxAINetwork`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  // -------------------------
  // START / RESET
  // -------------------------
  const start = () => {
    if (isCountingDown) return;

    setBoard(initialBoard());
    setCurrentPlayer(0);
    setGameOver(false);
    setShowShare(false);
    setResultLabel(null);
    setFinalScoreText(null);
    setIsInteractive(false);
    setShowVSOverlay(false);
    setIsCountingDown(true);
    setStatus("Get ready...");

    let c = 3;
    setCountdown(c);

    const interval = setInterval(() => {
      c -= 1;
      if (c > 0) {
        setCountdown(c);
      } else {
        clearInterval(interval);
        setCountdown(null);
        setShowVSOverlay(true);
        setIsInteractive(true);
        setIsCountingDown(false);
        setStatus("Game started! Player 1 goes first.");
      }
    }, 1000);
  };

  const onChangeOpponent = (value: "cpu" | "human") => {
    setOpponent(value);
    setBoard(initialBoard());
    setCurrentPlayer(0);
    setGameOver(false);
    setShowShare(false);
    setResultLabel(null);
    setFinalScoreText(null);
    setIsInteractive(false);
    setShowVSOverlay(false);
    setCountdown(null);
    setIsCountingDown(false);
    setStatus("Game mode changed. Click “Start Game” to begin.");
  };

  const onChangeDifficulty = (value: "easy" | "medium" | "hard") => {
    setDifficulty(value);
  };

  const isCpuMode = opponent === "cpu";

  const cpuLabel =
    difficulty === "easy"
      ? "CPU (Easy)"
      : difficulty === "medium"
      ? "CPU (Medium)"
      : "CPU (Hard)";

  const showLabels = isInteractive && !gameOver;

  // -------------------------
  // UI
  // -------------------------
  return (
    <div className="max-w-xl mx-auto p-4 text-white">
      {/* HEADER */}
      <h1 className="text-center text-4xl md:text-5xl font-extrabold tracking-wide mt-2">
        <span className="text-red-500">TURKISH</span>{" "}
        <span className="text-black">MANGALA</span>
        {/* Flag only on mobile */}
        <span className="inline md:hidden ml-2">🇹🇷</span>
      </h1>

      {/* CONTROLS */}
      <div className="flex flex-wrap justify-center gap-3 mt-5">
        <div className="flex items-center gap-2 bg-gray-900 px-3 py-2 rounded-full border border-gray-700">
          <span className="text-xs text-gray-300">Mode</span>
          <select
            className="bg-gray-800 text-xs md:text-sm px-2 py-1 rounded-full outline-none"
            value={opponent}
            onChange={(e) =>
              onChangeOpponent(e.target.value as "cpu" | "human")
            }
          >
            <option value="cpu">Player vs CPU</option>
            <option value="human">2 Players</option>
          </select>
        </div>

        <div
          className={`flex items-center gap-2 px-3 py-2 rounded-full border ${
            isCpuMode ? "bg-gray-900 border-gray-700" : "bg-gray-800 border-gray-700 opacity-50"
          }`}
        >
          <span className="text-xs text-gray-300">CPU</span>
          <select
            className="bg-gray-8

0 text-xs md:text-sm px-2 py-1 rounded-full outline-none"
            value={difficulty}
            onChange={(e) =>
              onChangeDifficulty(e.target.value as "easy" | "medium" | "hard")
            }
            disabled={!isCpuMode}
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>

        <button
          onClick={start}
          className="bg-yellow-400 text-black px-5 py-2 rounded-full font-semibold shadow-md hover:brightness-105"
        >
          Start Game
        </button>
      </div>

      {/* STATUS */}
      <div className="text-center mt-4 text-yellow-300 text-base md:text-lg font-semibold">
        {status}
      </div>

      {/* BOARD WRAPPER */}
      <div className="relative mt-6">
        {/* Overlay: countdown or VS or final score */}
        {(countdown !== null || showVSOverlay || finalScoreText) && (
          <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
            {finalScoreText ? (
              <div className="text-center">
                {resultLabel && (
                  <div className="text-2xl md:text-3xl font-extrabold text-yellow-300 mb-1">
                    {resultLabel}
                  </div>
                )}
                <div className="text-4xl md:text-5xl font-extrabold text-yellow-400">
                  {finalScoreText}
                </div>
              </div>
            ) : (
              <span className="text-5xl md:text-6xl font-extrabold text-yellow-400">
                {countdown !== null ? countdown : "VS"}
              </span>
            )}
          </div>
        )}

        {/* BOARD */}
        <div className="bg-gray-900 p-5 rounded-2xl shadow-xl border border-gray-800 relative z-10">
          {/* TOP ROW P2 (12 → 7) */}
          <div className="flex justify-between mb-4">
            {Array.from({ length: 6 }, (_, k) => 12 - k).map((i) => {
              const clickable =
                isInteractive &&
                isOwnPit(i, currentPlayer) &&
                !gameOver &&
                board[i] > 0 &&
                !(opponent === "cpu" && currentPlayer === 1);

              return (
                <div
                  key={i}
                  className="flex flex-col items-center gap-1 w-12"
                >
                  <div
                    className={`w-12 h-12 rounded-full border bg-gray-800 flex items-center justify-center ${
                      clickable
                        ? "border-yellow-400 shadow-md animate-pulse"
                        : "border-gray-700 opacity-60"
                    }`}
                    onClick={() => clickable && handlePitClick(i)}
                  >
                    <StoneCluster count={board[i]} />
                  </div>
                  <span className="text-[10px] text-gray-400">
                    {board[i]}
                  </span>
                </div>
              );
            })}
          </div>

          {/* MIDDLE ROW: STORES & LABELS (no small VS text anymore) */}
          <div className="flex items-center justify-between my-2">
            {/* Player 2 / CPU store */}
            {showLabels ? (
              <div className="flex flex-col md:flex-row items-center gap-1 md:gap-2">
                <div className="w-14 h-28 bg-gray-800 rounded-xl border border-gray-600 flex items-center justify-center text-xl md:text-2xl font-bold">
                  {board[13]}
                </div>
                <span className="text-xs md:text-sm text-gray-300 font-semibold text-center">
                  {isCpuMode ? cpuLabel : "Player 2"}
                </span>
              </div>
            ) : (
              <div className="w-14 h-28" />
            )}

            {/* center empty to avoid second VS */}
            <div className="w-10" />

            {/* Player 1 store */}
            {showLabels ? (
              <div className="flex flex-col md:flex-row items-center gap-1 md:gap-2">
                <span className="text-xs md:text-sm text-gray-300 font-semibold text-center">
                  Player 1
                </span>
                <div className="w-14 h-28 bg-gray-800 rounded-xl border border-gray-600 flex items-center justify-center text-xl md:text-2xl font-bold">
                  {board[6]}
                </div>
              </div>
            ) : (
              <div className="w-14 h-28" />
            )}
          </div>

          {/* BOTTOM ROW P1 (0 → 5) */}
          <div className="flex justify-between mt-4">
            {Array.from({ length: 6 }, (_, i) => {
              const clickable =
                isInteractive &&
                isOwnPit(i, currentPlayer) &&
                !gameOver &&
                board[i] > 0 &&
                !(opponent === "cpu" && currentPlayer === 1);

              return (
                <div
                  key={i}
                  className="flex flex-col items-center gap-1 w-12"
                >
                  <div
                    className={`w-12 h-12 rounded-full border bg-gray-800 flex items-center justify-center ${
                      clickable
                        ? "border-yellow-400 shadow-md animate-pulse"
                        : "border-gray-700 opacity-60"
                    }`}
                    onClick={() => clickable && handlePitClick(i)}
                  >
                    <StoneCluster count={board[i]} />
                  </div>
                  <span className="text-[10px] text-gray-400">
                    {board[i]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* SHARE */}
      {showShare && (
        <div className="mt-4 text-center space-x-2">
          <button
            onClick={shareFarcaster}
            className="bg-purple-500 px-4 py-2 rounded-full text-sm font-semibold shadow hover:brightness-110"
          >
            Share on Farcaster
          </button>
          <button
            onClick={shareTwitter}
            className="bg-blue-500 px-4 py-2 rounded-full text-sm font-semibold shadow hover:brightness-110"
          >
            Share on X (Twitter)
          </button>
        </div>
      )}

      {/* SIMPLE RULES */}
      <div className="mt-6 p-5 bg-gray-900 rounded-2xl border border-gray-800 text-sm space-y-3">
        <h2 className="text-center text-lg font-bold">📜 Game Rules</h2>

        <p>
          <strong>1️⃣ Goal:</strong> Collect more stones in your store than your
          opponent.
        </p>

        <p>
          <strong>2️⃣ Board:</strong> Player 1 pits: 0–5 → Store: 6. Player 2
          pits: 7–12 → Store: 13.
        </p>

        <p>
          <strong>3️⃣ How to Play:</strong>
          <br />– Pick a pit on your side.
          <br />– If it has more than 1 stone, the first stone goes back into
          that same pit.
          <br />– If it has exactly 1 stone, it goes into the next pit.
          <br />– Move counter-clockwise and skip your opponent’s store.
        </p>

        <p>
          <strong>4️⃣ Extra Turn:</strong> If your last stone lands in your own
          store, you get another turn.
        </p>

        <p>
          <strong>5️⃣ Capture:</strong> If your last stone lands in an empty pit
          on your side and the opposite pit has stones, you capture those
          stones + your last stone into your store.
        </p>

        <p>
          <strong>6️⃣ End of Game:</strong> When one side of pits becomes
          empty, all remaining stones go into that player’s store.
        </p>

        <p>
          <strong>7️⃣ Winner:</strong> The player with more stones in their
          store wins. If both stores have the same number, it’s a draw.
        </p>
      </div>

      {/* FOOTER */}
      <footer className="text-center text-xs text-gray-400 mt-6 pb-4">
        This game was made by{" "}
        <a
          href="https://farcaster.xyz/heisenbergyoyo"
          target="_blank"
          rel="noopener noreferrer"
          className="underline text-yellow-400"
        >
          HeisenbergYoYo
        </a>
        .
      </footer>
    </div>
  );
}
