"use client";

import { useState } from "react";

export default function Game() {
  const initialPits = Array(12).fill(4);
  const [pits, setPits] = useState<number[]>(initialPits);
  const [stores, setStores] = useState<{ p1: number; p2: number }>({ p1: 0, p2: 0 });
  const [currentPlayer, setCurrentPlayer] = useState<1 | 2>(1);
  const [gameOver, setGameOver] = useState(false);

  const makeMove = (pitIndex: number) => {
    if (gameOver) return;
    // Validate pit ownership
    if (
      (currentPlayer === 1 && pitIndex < 0) ||
      (currentPlayer === 1 && pitIndex > 5) ||
      (currentPlayer === 2 && pitIndex < 6) ||
      (currentPlayer === 2 && pitIndex > 11)
    )
      return;
    if (pits[pitIndex] === 0) return;

    let stones = pits[pitIndex];
    const newPits = [...pits];
    newPits[pitIndex] = 0;
    setPits(newPits);

    let idx = pitIndex;
    while (stones > 0) {
      idx = (idx + 1) % 14; // 12 pits + 2 stores
      // Skip opponent's store
      if ((currentPlayer === 1 && idx === 13) || (currentPlayer === 2 && idx === 6)) continue;

      if (idx === 6) {
        setStores((s) => ({ ...s, p1: s.p1 + 1 }));
      } else if (idx === 13) {
        setStores((s) => ({ ...s, p2: s.p2 + 1 }));
      } else {
        newPits[idx] += 1;
      }
      stones -= 1;
    }

    // Capture rule
    if (idx !== 6 && idx !== 13 && newPits[idx] === 1) {
      const oppositeIdx = 11 - idx;
      if (oppositeIdx !== 6 && oppositeIdx !== 13 && newPits[oppositeIdx] > 0) {
        const captured = newPits[oppositeIdx];
        newPits[oppositeIdx] = 0;
        newPits[idx] = 0;
        if (currentPlayer === 1) {
          setStores((s) => ({ ...s, p1: s.p1 + captured + 1 }));
        } else {
          setStores((s) => ({ ...s, p2: s.p2 + captured + 1 }));
        }
      }
    }

    // Extra turn rule
    const landedInOwnStore =
      (currentPlayer === 1 && idx === 6) || (currentPlayer === 2 && idx === 13);
    if (!landedInOwnStore) {
      setCurrentPlayer(currentPlayer === 1 ? 2 : 1);
    }

    // Game over check
    const p1Empty = newPits.slice(0, 6).every((v) => v === 0);
    const p2Empty = newPits.slice(6, 12).every((v) => v === 0);
    if (p1Empty || p2Empty) {
      const remainingP1 = newPits.slice(0, 6).reduce((a, b) => a + b, 0);
      const remainingP2 = newPits.slice(6, 12).reduce((a, b) => a + b, 0);
      setStores((s) => ({
        p1: s.p1 + remainingP1,
        p2: s.p2 + remainingP2,
      }));
      setPits(Array(12).fill(0));
      setGameOver(true);
    } else {
      setPits(newPits);
    }
  };

  const resetGame = () => {
    setPits(Array(12).fill(4));
    setStores({ p1: 0, p2: 0 });
    setCurrentPlayer(1);
    setGameOver(false);
  };

  const getWinner = () => {
    if (!gameOver) return null;
    if (stores.p1 > stores.p2) return "Player 1";
    if (stores.p2 > stores.p1) return "Player 2";
    return "Tie";
  };

  return (
    <div className="w-full max-w-[420px] mx-auto p-4">
      <h1 className="text-xl font-bold text-center mb-2">Mangala Mini Game</h1>
      <div className="flex justify-between items-center mb-4">
        <span className="font-medium">
          {gameOver
            ? `Game Over: ${getWinner()} wins!`
            : `Turn: Player ${currentPlayer}`}
        </span>
        <button
          onClick={resetGame}
          className="px-3 py-1 rounded bg-primary text-primary-foreground"
        >
          New Game
        </button>
      </div>
      <div className="grid grid-cols-12 gap-1">
        {/* Player 2 pits (top row, right to left) */}
        {pits.slice(6, 12).reverse().map((count, i) => (
          <button
            key={i}
            onClick={() => makeMove(11 - i)}
            disabled={currentPlayer !== 2 || gameOver}
            className="h-12 w-12 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center"
          >
            {count}
          </button>
        ))}
        {/* Player 2 store */}
        <div className="col-span-1 flex items-center justify-center">
          <div className="h-12 w-12 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center">
            {stores.p2}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-12 gap-1 mt-2">
        {/* Player 1 store */}
        <div className="col-span-1 flex items-center justify-center">
          <div className="h-12 w-12 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center">
            {stores.p1}
          </div>
        </div>
        {/* Player 1 pits (bottom row, left to right) */}
        {pits.slice(0, 6).map((count, i) => (
          <button
            key={i}
            onClick={() => makeMove(i)}
            disabled={currentPlayer !== 1 || gameOver}
            className="h-12 w-12 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center"
          >
            {count}
          </button>
        ))}
      </div>
      {gameOver && (
        <div className="mt-4 text-center">
          <a
            href={`/~/compose?text=I won Mangala! https://YOUR_APP_URL`}
            className="px-3 py-1 rounded bg-primary text-primary-foreground mr-2"
          >
            Share on Farcaster
          </a>
          <a
            href={`https://twitter.com/intent/tweet?text=I won Mangala! https://YOUR_APP_URL`}
            className="px-3 py-1 rounded bg-primary text-primary-foreground"
          >
            Share on X
          </a>
        </div>
      )}
    </div>
  );
}
