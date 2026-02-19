import { Chess } from 'chess.js';

// Simple heuristic values
const PIECE_VALUES = {
    p: 100,
    n: 320,
    b: 330,
    r: 500,
    q: 900,
    k: 20000,
};

// Evaluate the board (Positive = White Advantage, Negative = Black Advantage)
const evaluateBoard = (game) => {
    let totalEvaluation = 0;
    const board = game.board();

    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
            const piece = board[i][j];
            if (piece) {
                const value = PIECE_VALUES[piece.type] || 0;
                totalEvaluation += piece.color === 'w' ? value : -value;

                // Add positional logic here later (e.g. center control)
            }
        }
    }
    return totalEvaluation;
};

// Minimax with Alpha-Beta Pruning
const minimax = (game, depth, alpha, beta, isMaximizingPlayer) => {
    if (depth === 0 || game.isGameOver()) {
        return evaluateBoard(game);
    }

    const moves = game.moves();

    if (isMaximizingPlayer) {
        let maxEval = -Infinity;
        for (const move of moves) {
            game.move(move);
            const evalValue = minimax(game, depth - 1, alpha, beta, false);
            game.undo();
            maxEval = Math.max(maxEval, evalValue);
            alpha = Math.max(alpha, evalValue);
            if (beta <= alpha) break;
        }
        return maxEval;
    } else {
        let minEval = Infinity;
        for (const move of moves) {
            game.move(move);
            const evalValue = minimax(game, depth - 1, alpha, beta, true);
            game.undo();
            minEval = Math.min(minEval, evalValue);
            beta = Math.min(beta, evalValue);
            if (beta <= alpha) break;
        }
        return minEval;
    }
};

// Main function to get the best move
export const getBestMove = (game, difficulty = 'medium') => {
    const moves = game.moves();
    if (moves.length === 0) return null;

    // Easy: Random move
    if (difficulty === 'easy') {
        const randomIndex = Math.floor(Math.random() * moves.length);
        return moves[randomIndex];
    }

    // Medium/Hard: Use Minimax
    // Depth: Medium = 2, Hard = 3 (JS might be slow for >3 on mobile without optimization)
    const depth = difficulty === 'hard' ? 3 : 2;

    let bestMove = null;
    let bestValue = -Infinity; // AI plays Black (minimizing for White evaluation, so actually MAXIMIZING for itself if eval is relative? Wait.
    // Standard eval: + for White, - for Black.
    // If AI is Black, it wants to MINIMIZE the score.

    // Let's assume AI is always Black in "Play vs Computer" for now
    let isMaximizing = false; // Black wants to minimize positive white score
    bestValue = Infinity;

    for (const move of moves) {
        game.move(move);
        const boardValue = minimax(game, depth - 1, -Infinity, Infinity, !isMaximizing);
        game.undo();

        if (boardValue < bestValue) {
            bestValue = boardValue;
            bestMove = move;
        }
    }

    // fallback if no best move found (shouldn't happen)
    return bestMove || moves[Math.floor(Math.random() * moves.length)];
};
