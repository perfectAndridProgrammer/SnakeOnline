import { useSnakeGame } from "@/lib/stores/useSnakeGame";
import { Button } from "./ui/button";

export default function GameUI() {
  const phase = useSnakeGame((state) => state.phase);
  const playerSnake = useSnakeGame((state) => state.playerSnake);
  const aiSnakes = useSnakeGame((state) => state.aiSnakes);
  const startGame = useSnakeGame((state) => state.startGame);
  const restartGame = useSnakeGame((state) => state.restartGame);
  
  // Create leaderboard
  const allSnakes = playerSnake ? [playerSnake, ...aiSnakes] : aiSnakes;
  const sortedSnakes = [...allSnakes].sort((a, b) => b.score - a.score);
  
  return (
    <>
      {/* Menu Screen */}
      {phase === "menu" && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-gray-900 to-gray-800">
          <div className="text-center">
            <h1 className="text-7xl font-bold text-white mb-4" style={{ textShadow: '0 0 20px #4ECDC4' }}>
              SNAKE.IO
            </h1>
            <p className="text-xl text-gray-300 mb-8">Eat pellets, grow bigger, dominate the arena!</p>
            <Button
              onClick={startGame}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-12 py-6 text-2xl rounded-full shadow-lg"
            >
              PLAY NOW
            </Button>
            <div className="mt-8 text-gray-400">
              <p>🖱️ Move with your mouse</p>
              <p>⌨️ Hold SPACE to boost (costs length)</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Game Over Screen */}
      {phase === "gameover" && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <div className="text-center bg-gray-900 p-12 rounded-2xl border-4 border-red-500">
            <h2 className="text-6xl font-bold text-red-500 mb-4">GAME OVER</h2>
            <p className="text-3xl text-white mb-2">Final Score: {playerSnake?.score || 0}</p>
            <p className="text-xl text-gray-400 mb-8">Length: {playerSnake?.length.toFixed(0) || 0}</p>
            <Button
              onClick={restartGame}
              className="bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white px-10 py-5 text-xl rounded-full"
            >
              PLAY AGAIN
            </Button>
          </div>
        </div>
      )}
      
      {/* In-Game UI */}
      {phase === "playing" && playerSnake && (
        <>
          {/* Score Display */}
          <div className="absolute top-4 left-4 bg-black/70 text-white px-6 py-3 rounded-lg">
            <div className="text-sm text-gray-300">Score</div>
            <div className="text-3xl font-bold">{playerSnake.score}</div>
            <div className="text-xs text-gray-400">Length: {playerSnake.length.toFixed(0)}</div>
          </div>
          
          {/* Leaderboard */}
          <div className="absolute top-4 right-4 bg-black/70 text-white px-4 py-3 rounded-lg min-w-[200px]">
            <div className="text-lg font-bold mb-2 text-center border-b border-gray-600 pb-2">
              LEADERBOARD
            </div>
            <div className="space-y-1">
              {sortedSnakes.slice(0, 10).map((snake, index) => (
                <div
                  key={snake.id}
                  className={`flex justify-between text-sm ${
                    snake.id === "player" ? "bg-blue-600/30 px-2 py-1 rounded" : ""
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="text-gray-400 w-4">{index + 1}.</span>
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: snake.color }}
                    />
                    <span className={snake.id === "player" ? "font-bold" : ""}>
                      {snake.name}
                    </span>
                  </span>
                  <span className="font-mono">{snake.score}</span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Boost Indicator */}
          {playerSnake.isBoosting && (
            <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-yellow-500 text-black px-6 py-2 rounded-full font-bold text-lg animate-pulse">
              ⚡ BOOST ACTIVE ⚡
            </div>
          )}
          
          {/* Controls Hint */}
          <div className="absolute bottom-4 left-4 bg-black/50 text-white px-4 py-2 rounded text-xs">
            🖱️ Mouse to move | SPACE to boost
          </div>
        </>
      )}
    </>
  );
}
