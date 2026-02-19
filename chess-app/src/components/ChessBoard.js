import React from 'react';
import { View, Image, StyleSheet, TouchableOpacity, Dimensions, Text } from 'react-native';
import { COLORS } from '../constants/theme';

const { width } = Dimensions.get('window');
const BOARD_SIZE = width - 40; // 20px padding on each side
const SQUARE_SIZE = BOARD_SIZE / 8;

const PIECE_IMAGES = {
    'b': { uri: 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/bb.png' },
    'k': { uri: 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/bk.png' },
    'n': { uri: 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/bn.png' },
    'p': { uri: 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/bp.png' },
    'q': { uri: 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/bq.png' },
    'r': { uri: 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/br.png' },
    'B': { uri: 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wb.png' },
    'K': { uri: 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wk.png' },
    'N': { uri: 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wn.png' },
    'P': { uri: 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wp.png' },
    'Q': { uri: 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wq.png' },
    'R': { uri: 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wr.png' },
};

export default function ChessBoard({
    board,
    selectedSquare,
    possibleMoves,
    onSquarePress,
    lastMove,
    checkSquare,
    flip,
    viewWindow = null, // { startRow, endRow, startCol, endCol }
    showNotations = true,
    theme = { light: '#EEEED2', dark: '#769656' }
}) {

    const renderSquare = (row, col, piece) => {
        const isBlack = (row + col) % 2 === 1;
        const squareColor = isBlack ? theme.dark : theme.light;

        let position = String.fromCharCode(97 + col) + (8 - row);
        const isSelected = selectedSquare === position;
        const isPossibleMove = possibleMoves.includes(position);
        const isLastMove = lastMove && (lastMove.from === position || lastMove.to === position);

        let backgroundColor = squareColor;
        if (checkSquare === position) backgroundColor = '#FF6B6B';
        else if (isSelected) backgroundColor = 'rgba(255, 255, 0, 0.5)';
        else if (isLastMove) backgroundColor = 'rgba(255, 255, 0, 0.3)';

        const gridSize = viewWindow ? (viewWindow.endCol - viewWindow.startCol + 1) : 8;
        const squareSize = BOARD_SIZE / gridSize;

        return (
            <TouchableOpacity
                key={`${row}-${col}`}
                style={[styles.square, { backgroundColor, width: squareSize, height: squareSize }]}
                onPress={() => onSquarePress(position)}
                activeOpacity={0.9}
            >
                {showNotations && col === 0 && <Text style={[styles.notation, { color: isBlack ? theme.light : theme.dark, top: 2, left: 2 }]}>{8 - row}</Text>}
                {showNotations && row === 7 && <Text style={[styles.notation, { color: isBlack ? theme.light : theme.dark, bottom: 2, right: 2 }]}>{String.fromCharCode(97 + col)}</Text>}

                {isPossibleMove && !piece && (
                    <View style={[styles.possibleMoveDot, { width: squareSize * 0.3, height: squareSize * 0.3, borderRadius: squareSize * 0.15 }]} />
                )}

                {isPossibleMove && piece && (
                    <View style={[styles.captureRing, { width: squareSize, height: squareSize, borderRadius: squareSize / 2 }]} />
                )}

                {piece && (
                    <Image
                        source={PIECE_IMAGES[piece.color === 'w' ? piece.type.toUpperCase() : piece.type]}
                        style={[styles.piece, { width: squareSize * 0.9, height: squareSize * 0.9 }]}
                    />
                )}
            </TouchableOpacity>
        );
    };

    let displayRows = board;
    let startRow = 0;
    let startCol = 0;

    if (viewWindow) {
        displayRows = board.slice(viewWindow.startRow, viewWindow.endRow + 1);
        startRow = viewWindow.startRow;
        startCol = viewWindow.startCol;
    }

    const rows = flip ? [...displayRows].reverse() : displayRows;

    return (
        <View style={[styles.board, viewWindow && { borderWidth: 0, borderRadius: 15, elevation: 5, shadowOpacity: 0.3 }]}>
            {rows.map((row, rowIndex) => {
                const actualRowIndex = flip ? (startRow + (displayRows.length - 1 - rowIndex)) : (startRow + rowIndex);

                let displayCols = row;
                if (viewWindow) {
                    displayCols = row.slice(viewWindow.startCol, viewWindow.endCol + 1);
                }

                const cols = flip ? [...displayCols].reverse() : displayCols;

                return (
                    <View key={rowIndex} style={styles.row}>
                        {cols.map((piece, colIndex) => {
                            const actualColIndex = flip ? (startCol + (displayCols.length - 1 - colIndex)) : (startCol + colIndex);
                            return renderSquare(actualRowIndex, actualColIndex, piece);
                        })}
                    </View>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    board: {
        width: BOARD_SIZE,
        borderWidth: 5,
        borderColor: '#333',
        overflow: 'hidden'
    },
    row: {
        flexDirection: 'row',
    },
    square: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    piece: {
    },
    possibleMoveDot: {
        backgroundColor: 'rgba(0,0,0,0.3)',
        position: 'absolute',
    },
    captureRing: {
        borderWidth: 4,
        borderColor: 'rgba(0,0,0,0.3)',
        position: 'absolute',
    },
    notation: {
        position: 'absolute',
        fontSize: 10,
        fontWeight: 'bold',
    }
});
