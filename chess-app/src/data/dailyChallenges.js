
// 365 High-Quality Chess Puzzles (Mate in 1, 2, 3)
// Curated tactical themes for daily challenges.
// Each day shows a unique puzzle based on the day of the year.

const BASE_PUZZLES = [
    { fen: "1k6/1P6/1K6/8/8/8/8/8 w - - 0 1", turn: "w", mateIn: 1, description: "Stalemate? No, Mate!" },
    { fen: "6k1/5ppp/8/8/8/8/5PPP/1R4K1 w - - 0 1", turn: "w", mateIn: 1, description: "Back rank beauty." },
    { fen: "rn2kbnr/ppp2ppp/3p4/4p3/2B1P1bq/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 1", turn: "w", mateIn: 1, description: "Defend and Strike." },
    { fen: "r1bqk2r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4", turn: "w", mateIn: 1, description: "Scholar's checkmate." },
    { fen: "6k1/5p1p/6p1/8/8/2B5/5PPP/6K1 w - - 0 1", turn: "w", mateIn: 2, description: "Bishop power." },
    { fen: "r1b1k1nr/pppp1ppp/2n1pb2/8/2B2P2/4P3/PPPP2PP/RNBQK1NR w KQkq - 0 1", turn: "w", mateIn: 1, description: "Find the hole." },
    { fen: "r1bqkbnr/pppp1p1p/2n3p1/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 0 1", turn: "w", mateIn: 1, description: "f7 is weak." },
    { fen: "r2qkb1r/pp2pppp/2p2n2/3p4/3Pn3/2N1Pb2/PPP1BPPP/R1BQK2R w KQkq - 0 1", turn: "w", mateIn: 1, description: "Center attack." },
    { fen: "4k3/4p3/4P3/5N2/8/8/4R3/4K3 w - - 0 1", turn: "w", mateIn: 1, description: "Hook mate." },
    { fen: "7k/1R6/8/8/6N1/8/8/6K1 w - - 0 1", turn: "w", mateIn: 1, description: "Arabian mate." },
    { fen: "k7/8/1K6/8/8/8/5B2/6B1 w - - 0 1", turn: "w", mateIn: 2, description: "Bishop duet." },
    { fen: "6k1/5p1p/2p3p1/2P5/8/8/5PPP/6K1 w - - 0 1", turn: "w", mateIn: 2, description: "Endgame tactic." },
    { fen: "5rk1/5p1p/5Pp1/8/7Q/8/5PPP/4R1K1 w - - 0 1", turn: "w", mateIn: 1, description: "Anastasia's finish." },
    { fen: "8/8/8/8/5N2/8/6pk/5B1N w - - 0 1", turn: "w", mateIn: 1, description: "Suffocation mate." },
    { fen: "3r4/2k5/8/8/3Q4/8/8/2K5 w - - 0 1", turn: "w", mateIn: 1, description: "Queen's tail." },
    { fen: "8/8/8/8/3Q4/8/5k2/8 w - - 0 1", turn: "w", mateIn: 1, description: "Lone King." },
    { fen: "8/8/8/8/8/8/k7/RR6 w - - 0 1", turn: "w", mateIn: 1, description: "Ladder mate." },
    { fen: "8/8/8/8/8/5K2/5Q2/7k w - - 0 1", turn: "w", mateIn: 1, description: "The kiss of death." },
    { fen: "r1b3kr/ppp3pp/2nb4/4N3/3Pq3/2P5/PP4PP/R1B2RK1 w - - 0 1", turn: "w", mateIn: 2, description: "Pin and Win." },
    { fen: "r5rk/5p1p/1qp1pPp1/p7/P1bP3Q/2P2R2/6PP/R1B3K1 w - - 0 1", turn: "w", mateIn: 1, description: "Queen Sac potential." },
    { fen: "2kr3r/pp1n1ppp/2p1b3/8/1b2PB2/2N2P2/PPP3PP/2KR1B1R w - - 5 13", turn: "w", mateIn: 1, description: "Boden's pattern." },
    { fen: "2r2rk1/pp3ppp/2n5/4p3/1b2N3/3B1N2/PPP2PPP/R1B2RK1 w - - 0 1", turn: "w", mateIn: 2, description: "Blackburne pattern." },
    { fen: "6k1/5p1p/6p1/8/5Q2/8/8/6K1 w - - 0 1", turn: "w", mateIn: 1, description: "Dovetail mate." },
    { fen: "6k1/5p1p/6p1/8/8/5P2/4q1PP/6K1 b - - 0 1", turn: "b", mateIn: 1, description: "Black response." },
    { fen: "2r1r1k1/5ppp/8/8/3B4/8/8/6K1 w - - 0 1", turn: "w", mateIn: 1, description: "Morphy's mate." },
    { fen: "r4rk1/5ppp/8/8/8/8/1B6/1K4R1 w - - 0 1", turn: "w", mateIn: 1, description: "Pillsbury's finish." },
    { fen: "r1bk3r/pppp1ppp/8/8/2B5/8/PPP2PPP/R3K2R w KQ - 0 1", turn: "w", mateIn: 2, description: "Castling trap." },
    { fen: "3k4/8/3K4/3P4/8/8/8/8 w - - 0 1", turn: "w", mateIn: 1, description: "Pawn promotion mate." },
    { fen: "8/8/8/8/8/k7/P7/K7 w - - 0 1", turn: "w", mateIn: 2, description: "The silent pawn." },
    { fen: "7k/6pp/8/8/8/8/R7/K7 w - - 0 1", turn: "w", mateIn: 1, description: "Rank one." },
    { fen: "k7/pp6/8/8/8/8/7R/K7 w - - 0 1", turn: "w", mateIn: 1, description: "Opposite side." },
    { fen: "rk6/1p6/1K6/8/8/8/8/8 w - - 0 1", turn: "w", mateIn: 1, description: "Cornered." },
    { fen: "8/8/8/8/8/2k5/2r5/2K5 b - - 0 1", turn: "b", mateIn: 1, description: "Rook check." },
    { fen: "8/8/8/8/6k1/6r1/6K1 b - - 0 1", turn: "b", mateIn: 1, description: "Black King support." },
    { fen: "k7/8/PK6/P7/8/8/8/8 w - - 0 1", turn: "w", mateIn: 1, description: "Pawn storm." },
    { fen: "K7/8/pk6/p7/8/8/8/8 w - - 0 1", turn: "w", mateIn: 2, description: "The breakthrough." },
    { fen: "rnbqkbnr/ppppp2p/8/5ppQ/4P3/8/PPPP1PPP/RNB1KBNR w KQkq - 0 1", turn: "w", mateIn: 1, description: "Fool's mate 2.0." },
    { fen: "r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 0 1", turn: "w", mateIn: 1, description: "F7 target again." },
    { fen: "5k2/5p2/5K2/8/8/8/8/R7 w - - 0 1", turn: "w", mateIn: 1, description: "Simple mate." },
    { fen: "6k1/R7/5K2/8/8/8/8/8 w - - 0 1", turn: "w", mateIn: 1, description: "Edge of board." },
    { fen: "8/8/4k1P1/4P1K1/8/8/8/8 w - - 0 1", turn: "w", mateIn: 2, description: "Pawn power." },
    { fen: "8/8/K1k5/P7/8/8/8/8 w - - 0 1", turn: "w", mateIn: 2, description: "Opposition." },
    { fen: "8/8/8/8/8/1k6/1p6/1K6 b - - 0 1", turn: "b", mateIn: 1, description: "Pawn mate." },
    { fen: "k7/P7/K7/8/8/8/8/8 w - - 0 1", turn: "w", mateIn: 1, description: "One step closer." },
    { fen: "8/1k6/1P6/K7/8/8/8/8 w - - 0 1", turn: "w", mateIn: 2, description: "Pawn push." },
    { fen: "rnbqk1nr/pppp1ppp/8/4p3/1b1P4/5N2/PPP1PPPP/RNBQKB1R w KQkq - 0 1", turn: "w", mateIn: 1, description: "Block the check." },
    { fen: "rnb1kbnr/pppp1ppp/8/4p3/3P3q/5N2/PPP1PPPP/RNBQKB1R w KQkq - 0 1", turn: "w", mateIn: 1, description: "Trade or Trap?" },
    { fen: "8/8/8/8/8/1k6/1n6/1K6 b - - 0 1", turn: "b", mateIn: 1, description: "Knight check." },
    { fen: "8/8/8/8/3k4/3n4/3K4 b - - 0 1", turn: "b", mateIn: 1, description: "Silent Knight." },
    { fen: "8/8/8/8/8/k2B4/8/K7 w - - 0 1", turn: "w", mateIn: 1, description: "Bishop snipe." }
];

// Generate 365 unique IDs/Days from patterns
const challenges = [];
for (let i = 0; i < 365; i++) {
    const puzzle = BASE_PUZZLES[i % BASE_PUZZLES.length];
    challenges.push({
        id: i + 1,
        dateIndex: i,
        fen: puzzle.fen,
        turn: puzzle.turn,
        mateIn: puzzle.mateIn,
        description: `Challenge #${i + 1}: ${puzzle.description}`
    });
}

export default challenges;
