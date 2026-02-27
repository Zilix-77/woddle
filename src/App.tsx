import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  Settings, 
  Play, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  Trophy, 
  RefreshCw, 
  ChevronUp,
  User,
  LogOut,
  Share2
} from 'lucide-react';
import { RoomState, ClientEvent, ServerEvent, Player } from './types';
import { AVATAR_COLORS, CATEGORIES, DIFFICULTIES } from './constants';

export default function App() {
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState(AVATAR_COLORS[0]);
  const [roomId, setRoomId] = useState('');
  const [gameState, setGameState] = useState<RoomState | null>(null);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);
  const [clueInput, setClueInput] = useState('');
  const [guessInput, setGuessInput] = useState('');
  const [isPeeking, setIsPeeking] = useState(false);
  const [isSidePeekOpen, setIsSidePeekOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const self = gameState?.players.find(p => p.id === myPlayerId);

  // Force re-render for timer
  const [, setTick] = useState(0);
  useEffect(() => {
    if (gameState?.status === 'TYPING' && gameState.turnStartTime) {
      const interval = setInterval(() => setTick(t => t + 1), 1000);
      return () => clearInterval(interval);
    }
  }, [gameState?.status, gameState?.turnStartTime]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const rId = params.get('room');
    if (rId) setRoomId(rId);
  }, []);

  const connect = (rId: string) => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(`${protocol}//${window.location.host}`);
    
    socket.onopen = () => {
      socket.send(JSON.stringify({ type: 'JOIN', roomId: rId, name, avatar }));
    };

    socket.onmessage = (msg) => {
      const event = JSON.parse(msg.data) as ServerEvent;
      if (event.type === 'UPDATE_STATE') {
        setGameState(event.state);
        if (event.yourPlayerId) {
          setMyPlayerId(event.yourPlayerId);
        }
      } else if (event.type === 'ERROR') {
        setError(event.message);
      }
    };

    setWs(socket);
  };

  const send = (event: ClientEvent) => {
    ws?.send(JSON.stringify(event));
  };

  const handleCreateRoom = () => {
    const id = Math.random().toString(36).substring(2, 8).toUpperCase();
    setRoomId(id);
    connect(id);
  };

  const handleJoinRoom = () => {
    if (roomId) connect(roomId);
  };

  const copyLink = () => {
    const url = `${window.location.origin}?room=${roomId}`;
    navigator.clipboard.writeText(url);
    alert('Room link copied!');
  };

  if (!gameState) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center p-4 font-sans">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 sm:p-8 border-4 border-black"
        >
          <h1 className="text-4xl sm:text-5xl font-black mb-6 sm:mb-8 text-center tracking-tighter uppercase italic">
            Word <span className="text-red-500">Impostor</span>
          </h1>
          
          <div className="space-y-4 sm:space-y-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest mb-2 text-gray-500">Your Name</label>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter display name"
                className="w-full p-3 sm:p-4 bg-gray-100 rounded-xl border-2 border-black font-bold focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-widest mb-2 text-gray-500">Pick Avatar Color</label>
              <div className="grid grid-cols-5 gap-2">
                {AVATAR_COLORS.map(color => (
                  <button
                    key={color}
                    onClick={() => setAvatar(color)}
                    className={`h-8 sm:h-10 rounded-lg border-2 border-black transition-transform ${avatar === color ? 'scale-110 ring-2 ring-black' : 'opacity-50 hover:opacity-100'}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            <div className="pt-2 sm:pt-4 space-y-3">
              <button 
                onClick={handleCreateRoom}
                disabled={!name}
                className="w-full py-3 sm:p-4 bg-black text-white rounded-xl font-black uppercase tracking-widest hover:bg-gray-800 disabled:opacity-50 transition-all active:scale-95"
              >
                Create Room
              </button>
              <div className="flex flex-col sm:flex-row gap-2">
                <input 
                  type="text" 
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                  placeholder="ROOM CODE"
                  className="w-full sm:flex-1 p-3 sm:p-4 bg-gray-100 rounded-xl border-2 border-black font-bold text-center uppercase"
                />
                <button 
                  onClick={handleJoinRoom}
                  disabled={!name || !roomId}
                  className="w-full sm:w-auto px-6 py-3 sm:py-4 bg-red-500 text-white rounded-xl font-black uppercase border-2 border-black hover:bg-red-600 disabled:opacity-50 transition-all active:scale-95"
                >
                  Join
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // Lobby Screen
  if (gameState.status === 'LOBBY') {
    return (
      <div className="min-h-screen bg-[#F5F5F5] p-4 font-sans">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="flex justify-between items-center bg-white p-6 rounded-3xl border-4 border-black shadow-lg">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400">Room Code</h2>
              <p className="text-3xl font-black">{gameState.id}</p>
            </div>
            <button onClick={copyLink} className="p-3 bg-gray-100 rounded-xl border-2 border-black hover:bg-gray-200">
              <Share2 size={24} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-3xl border-4 border-black shadow-lg">
              <h3 className="text-xl font-black mb-4 flex items-center gap-2">
                <Users size={24} /> Players ({gameState.players.length})
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {gameState.players.map(p => (
                  <div key={p.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border-2 border-black">
                    <div className="w-8 h-8 rounded-full border-2 border-black" style={{ backgroundColor: p.avatar }} />
                    <span className="font-bold truncate">{p.name}</span>
                    {p.isReady && <CheckCircle2 size={16} className="text-green-500 ml-auto" />}
                  </div>
                ))}
              </div>
            </div>

            {self?.isHost && (
              <div className="bg-white p-6 rounded-3xl border-4 border-black shadow-lg space-y-4">
                <h3 className="text-xl font-black mb-4 flex items-center gap-2">
                  <Settings size={24} /> Host Controls
                </h3>
                <div>
                  <label className="block text-xs font-bold uppercase mb-1">Category</label>
                  <select 
                    value={gameState.config.category}
                    onChange={(e) => send({ type: 'UPDATE_CONFIG', config: { category: e.target.value } })}
                    className="w-full p-2 bg-gray-100 border-2 border-black rounded-lg font-bold"
                  >
                    {Object.keys(CATEGORIES).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase mb-1">Impostors</label>
                  <input 
                    type="range" min="1" max="3" 
                    value={gameState.config.impostorCount}
                    onChange={(e) => send({ type: 'UPDATE_CONFIG', config: { impostorCount: parseInt(e.target.value) } })}
                    className="w-full accent-black"
                  />
                  <div className="text-right font-bold">{gameState.config.impostorCount}</div>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase mb-1">Typing Timer (sec)</label>
                  <input 
                    type="range" min="10" max="120" step="5"
                    value={gameState.config.timerDuration}
                    onChange={(e) => send({ type: 'UPDATE_CONFIG', config: { timerDuration: parseInt(e.target.value) } })}
                    className="w-full accent-black"
                  />
                  <div className="text-right font-bold">{gameState.config.timerDuration}s</div>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-4">
            <button 
              onClick={() => send({ type: 'TOGGLE_READY' })}
              className={`flex-1 py-4 rounded-2xl font-black uppercase tracking-widest border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none ${self?.isReady ? 'bg-green-400' : 'bg-white'}`}
            >
              {self?.isReady ? 'Ready!' : 'Ready?'}
            </button>
            {self?.isHost && (
              <button 
                onClick={() => send({ type: 'START_GAME' })}
                disabled={!gameState.players.every(p => p.isReady) || gameState.players.length < 3}
                className="flex-1 py-4 bg-red-500 text-white rounded-2xl font-black uppercase tracking-widest border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-red-600 disabled:opacity-50 transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
              >
                Start Game
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Word Reveal Screen
  if (gameState.status === 'REVEAL') {
    return (
      <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center p-4 overflow-hidden">
        <div className="w-full max-w-md text-center">
          <h2 className="text-2xl font-black mb-8 uppercase tracking-tighter">Peek at your word!</h2>
          
          <motion.div 
            className="relative h-96 w-64 mx-auto cursor-pointer"
            onMouseDown={() => setIsPeeking(true)}
            onMouseUp={() => setIsPeeking(false)}
            onTouchStart={() => setIsPeeking(true)}
            onTouchEnd={() => setIsPeeking(false)}
          >
            {/* Card Back (Visible when not peeking) */}
            <motion.div 
              className="absolute inset-0 bg-white rounded-3xl border-4 border-black shadow-2xl flex flex-col items-center justify-center p-8 z-10"
              animate={{ y: isPeeking ? -200 : 0, rotate: isPeeking ? -5 : 0 }}
              transition={{ type: 'spring', damping: 20 }}
              style={{ backgroundColor: self?.avatar }}
            >
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mb-4">
                <ChevronUp size={48} className="text-white animate-bounce" />
              </div>
              <h3 className="text-white text-3xl font-black uppercase">{gameState.config.category}</h3>
              <p className="text-white/80 text-sm font-bold mt-2">HOLD TO PEEK</p>
            </motion.div>

            {/* Card Front (The Secret) */}
            <div className="absolute inset-0 bg-white rounded-3xl border-4 border-black shadow-inner flex flex-col items-center justify-center p-8">
              <h3 className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-2">Your Secret Word</h3>
              <p className={`text-4xl font-black uppercase ${self?.role === 'IMPOSTOR' ? 'text-red-500' : 'text-black'}`}>
                {self?.role === 'IMPOSTOR' ? 'IMPOSTOR' : gameState.secretWord}
              </p>
              {self?.role === 'IMPOSTOR' && (
                <p className="mt-4 text-sm font-bold text-gray-500 italic">Blend in with the crew!</p>
              )}
            </div>
          </motion.div>
          
          <p className="mt-8 text-gray-400 font-bold animate-pulse">Game starts in a few seconds...</p>
        </div>
      </div>
    );
  }

  // Main Game Screen (Typing / Voting / Elimination / Guess / Recap)
  const activePlayers = gameState.players.filter(p => !p.isEliminated);
  const currentPlayer = activePlayers[gameState.currentTurnIndex];
  const isMyTurn = currentPlayer?.id === self?.id;

  if (gameState.status === 'RECAP') {
    const didWin = (self?.role === 'CREW' && gameState.winner === 'CREW') || 
                   (self?.role === 'IMPOSTOR' && gameState.winner === 'IMPOSTOR');

    return (
      <div className={`min-h-screen p-4 font-sans overflow-y-auto transition-all duration-1000 ${didWin ? 'bg-[#F5F5F5]' : 'bg-black invert hue-rotate-180'}`}>
        <div className="max-w-2xl mx-auto text-center space-y-8 py-12">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="flex justify-center"
          >
            <Trophy size={120} className={gameState.winner === 'CREW' ? 'text-yellow-500' : 'text-red-500'} />
          </motion.div>
          
          <h2 className="text-6xl font-black uppercase tracking-tighter leading-none">
            {gameState.winner === 'CREW' ? 'CREW WINS!' : 'IMPOSTOR WINS!'}
          </h2>

          {!didWin && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-2xl font-black text-red-500 uppercase tracking-widest"
            >
              YOU LOST
            </motion.div>
          )}

          <div className="bg-white p-8 rounded-[40px] border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <p className="text-xs font-bold uppercase text-gray-400 mb-2 tracking-widest">The Secret Word Was</p>
            <p className="text-5xl font-black uppercase text-black">{gameState.secretWord}</p>
          </div>
          
          <div className="space-y-4">
            <h4 className="text-left font-black uppercase text-sm text-gray-400 tracking-widest px-2">Leaderboard</h4>
            <div className="space-y-3">
              {gameState.players.sort((a, b) => b.score - a.score).map((p, idx) => (
                <motion.div 
                  key={p.id} 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="flex items-center justify-between p-4 bg-white rounded-2xl border-2 border-black shadow-sm"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full border-2 border-black flex items-center justify-center text-white font-black" style={{ backgroundColor: p.avatar }}>
                      {idx + 1}
                    </div>
                    <div className="text-left">
                      <span className="font-black text-lg block">{p.name} {p.id === self?.id && '(YOU)'}</span>
                      <span className="text-xs font-bold uppercase text-gray-400">{p.role}</span>
                    </div>
                  </div>
                  <span className="font-black text-2xl">{p.score} pts</span>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="pt-8 space-y-4">
            {self?.isHost ? (
              <button 
                onClick={() => send({ type: 'RESTART_GAME' })}
                className="w-full py-6 bg-black text-white rounded-3xl font-black uppercase text-xl tracking-widest border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:bg-gray-800 transition-all active:translate-x-[4px] active:translate-y-[4px] active:shadow-none"
              >
                Play Again
              </button>
            ) : (
              <div className="p-6 bg-gray-200 rounded-3xl border-4 border-black border-dashed">
                <p className="font-black uppercase tracking-widest text-gray-500 animate-pulse">
                  Waiting for host to restart...
                </p>
              </div>
            )}
            
            <button 
              onClick={() => window.location.href = '/'}
              className="w-full py-4 bg-white text-black rounded-3xl font-black uppercase text-lg tracking-widest border-4 border-black hover:bg-gray-100 transition-all active:scale-95"
            >
              Exit Room
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F5F5] transition-colors duration-500 relative overflow-hidden" style={{ backgroundColor: gameState.status === 'TYPING' && currentPlayer?.avatar ? `${currentPlayer.avatar}33` : (isMyTurn ? `${self?.avatar}33` : '#F5F5F5') }}>
      {/* Side Peek Trigger Handle */}
      {!isSidePeekOpen && gameState.status !== 'RECAP' && gameState.status !== 'LOBBY' && (
        <motion.div 
          initial={{ x: -20 }}
          animate={{ x: 0 }}
          drag="x"
          dragConstraints={{ left: 0, right: 50 }}
          onDragEnd={(_, info) => {
            if (info.offset.x > 20) setIsSidePeekOpen(true);
          }}
          onClick={() => setIsSidePeekOpen(true)}
          className="fixed left-0 top-1/2 -translate-y-1/2 w-8 h-24 bg-black rounded-r-2xl z-50 flex items-center justify-center cursor-pointer border-y-2 border-r-2 border-white/20 shadow-lg touch-none"
        >
          <div className="w-1 h-12 bg-white/30 rounded-full" />
        </motion.div>
      )}

      {/* Side Peek Overlay */}
      <AnimatePresence>
        {isSidePeekOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidePeekOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
            />
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 bottom-0 w-[85%] max-w-sm bg-[#F5F5F5] z-[70] border-r-4 border-black shadow-2xl p-6 flex flex-col items-center justify-center"
            >
              <button 
                onClick={() => setIsSidePeekOpen(false)}
                className="absolute top-6 right-6 p-2 bg-gray-200 rounded-full border-2 border-black"
              >
                <LogOut size={20} className="rotate-180" />
              </button>

              <h2 className="text-xl font-black mb-8 uppercase tracking-tighter">Your Secret Card</h2>
              
              <motion.div 
                className="relative h-80 w-56 cursor-pointer"
                onMouseDown={() => setIsPeeking(true)}
                onMouseUp={() => setIsPeeking(false)}
                onTouchStart={() => setIsPeeking(true)}
                onTouchEnd={() => setIsPeeking(false)}
              >
                <motion.div 
                  className="absolute inset-0 bg-white rounded-3xl border-4 border-black shadow-2xl flex flex-col items-center justify-center p-6 z-10"
                  animate={{ y: isPeeking ? -160 : 0, rotate: isPeeking ? -5 : 0 }}
                  transition={{ type: 'spring', damping: 20 }}
                  style={{ backgroundColor: self?.avatar }}
                >
                  <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4">
                    <ChevronUp size={32} className="text-white animate-bounce" />
                  </div>
                  <h3 className="text-white text-2xl font-black uppercase">{gameState.config.category}</h3>
                  <p className="text-white/80 text-[10px] font-bold mt-2">HOLD TO PEEK</p>
                </motion.div>

                <div className="absolute inset-0 bg-white rounded-3xl border-4 border-black shadow-inner flex flex-col items-center justify-center p-6">
                  <h3 className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-2">Secret Word</h3>
                  <p className={`text-3xl font-black uppercase text-center ${self?.role === 'IMPOSTOR' ? 'text-red-500' : 'text-black'}`}>
                    {self?.role === 'IMPOSTOR' ? 'IMPOSTOR' : gameState.secretWord}
                  </p>
                </div>
              </motion.div>

              <p className="mt-8 text-xs font-bold text-gray-400 uppercase tracking-widest text-center">
                Tap outside or slide back to close
              </p>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="bg-white border-b-4 border-black p-4 sticky top-0 z-20">
        <div className="max-w-2xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-xl font-black uppercase tracking-tighter">Round {gameState.roundNumber}</h1>
              <p className="text-xs font-bold text-gray-400 uppercase">{gameState.status}</p>
            </div>
            {gameState.status === 'TYPING' && gameState.turnStartTime && (
              <motion.div 
                key={gameState.currentTurnIndex}
                initial={{ scale: 1.5, bg: '#ef4444' }}
                animate={{ scale: 1, bg: '#000000' }}
                className="bg-black text-white px-3 py-1 rounded-full font-black text-sm flex items-center gap-2 shadow-lg"
              >
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                {Math.max(0, Math.floor(gameState.config.timerDuration - (Date.now() - gameState.turnStartTime) / 1000))}s
              </motion.div>
            )}
          </div>
          <div className="flex -space-x-2">
            {gameState.players.map(p => (
              <div 
                key={p.id} 
                className={`w-8 h-8 rounded-full border-2 border-black relative ${p.isEliminated ? 'grayscale opacity-50' : ''}`}
                style={{ backgroundColor: p.avatar }}
              >
                {p.id === currentPlayer?.id && <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border border-white animate-ping" />}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 max-w-2xl mx-auto w-full">
        {gameState.clues.map((clue, idx) => (
          <motion.div 
            key={idx}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-start gap-3"
          >
            <div className="w-10 h-10 rounded-full border-2 border-black flex-shrink-0" style={{ backgroundColor: clue.playerColor }} />
            <div className="bg-white p-3 rounded-2xl rounded-tl-none border-2 border-black shadow-sm max-w-[80%]">
              <p className="text-[10px] font-black uppercase text-gray-400 mb-1">{clue.playerName}</p>
              <p className="font-bold text-lg">{clue.text}</p>
            </div>
          </motion.div>
        ))}
        {gameState.status === 'TYPING' && !isMyTurn && (
          <div className="flex items-center gap-2 text-gray-400 font-bold italic text-sm">
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" />
              <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce [animation-delay:0.2s]" />
              <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce [animation-delay:0.4s]" />
            </div>
            {currentPlayer?.name} is typing...
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t-4 border-black sticky bottom-0 z-20">
        <div className="max-w-2xl mx-auto">
          {gameState.status === 'TYPING' && (
            isMyTurn ? (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <input 
                    type="text"
                    value={clueInput}
                    onChange={(e) => setClueInput(e.target.value)}
                    placeholder="Enter one word clue..."
                    className="flex-1 p-4 bg-gray-100 rounded-xl border-2 border-black font-bold focus:outline-none"
                    onKeyDown={(e) => e.key === 'Enter' && clueInput && send({ type: 'SUBMIT_CLUE', text: clueInput })}
                  />
                  <button 
                    onClick={() => {
                      if (clueInput) {
                        send({ type: 'SUBMIT_CLUE', text: clueInput });
                        setClueInput('');
                      }
                    }}
                    className="p-4 bg-black text-white rounded-xl border-2 border-black hover:bg-gray-800 transition-all active:scale-95"
                  >
                    <Send size={24} />
                  </button>
                </div>

                {self?.role === 'IMPOSTOR' && gameState.roundNumber % 2 === 0 && gameState.guessAttempts < 2 && (
                  <div className="pt-2 border-t-2 border-black border-dashed">
                    <p className="text-[10px] font-black uppercase text-red-500 mb-2">Impostor Ability: Guess Secret Word ({2 - gameState.guessAttempts} left)</p>
                    <div className="flex gap-2">
                      <input 
                        type="text"
                        value={guessInput}
                        onChange={(e) => setGuessInput(e.target.value)}
                        placeholder="Guess the word..."
                        className="flex-1 p-3 bg-red-50 rounded-xl border-2 border-red-500 font-bold focus:outline-none text-red-700"
                      />
                      <button 
                        onClick={() => {
                          if (guessInput) {
                            send({ type: 'SUBMIT_GUESS', word: guessInput });
                            setGuessInput('');
                          }
                        }}
                        className="px-6 bg-red-500 text-white rounded-xl border-2 border-black font-black uppercase text-xs hover:bg-red-600 transition-all active:scale-95"
                      >
                        Guess
                      </button>
                    </div>
                    <p className="text-[9px] font-bold text-gray-400 mt-1">Warning: A wrong guess counts as your turn and reveals you failed a guess!</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 text-center font-black uppercase text-gray-400 tracking-widest">
                Waiting for {currentPlayer?.name}
              </div>
            )
          )}

          {gameState.status === 'VOTING' && (
            <div className="space-y-4">
              <h3 className="text-center font-black uppercase tracking-widest">Who is the Impostor?</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {activePlayers.map(p => (
                  <button
                    key={p.id}
                    disabled={self?.isEliminated || self?.hasVoted}
                    onClick={() => send({ type: 'SUBMIT_VOTE', targetId: p.id })}
                    className={`p-3 rounded-xl border-2 border-black font-bold flex flex-col items-center gap-2 transition-all active:scale-95 ${gameState.votes[self?.id || ''] === p.id ? 'bg-red-500 text-white' : 'bg-gray-50 hover:bg-gray-100'}`}
                  >
                    <div className="w-10 h-10 rounded-full border-2 border-black" style={{ backgroundColor: p.avatar }} />
                    <span className="truncate w-full text-center">{p.name}</span>
                    {p.hasVoted && (
                       <div className="absolute top-1 right-1">
                         <CheckCircle2 size={12} className="text-green-500" />
                       </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {gameState.status === 'ELIMINATION' && (
            <div className="text-center space-y-4 py-4">
              <div className="w-20 h-20 mx-auto rounded-full border-4 border-black flex items-center justify-center bg-red-100" style={{ backgroundColor: gameState.players.find(p => p.id === gameState.eliminatedPlayerId)?.avatar }}>
                <LogOut size={40} className="text-white" />
              </div>
              <h3 className="text-2xl font-black uppercase">
                {gameState.players.find(p => p.id === gameState.eliminatedPlayerId)?.name} was voted out!
              </h3>
              <p className="font-bold text-gray-500">
                {gameState.players.find(p => p.id === gameState.eliminatedPlayerId)?.role === 'IMPOSTOR' ? 'THEY WERE THE IMPOSTOR!' : 'THEY WERE INNOCENT...'}
              </p>
              <button 
                onClick={() => send({ type: 'NEXT_ROUND' })}
                className="w-full py-4 bg-black text-white rounded-xl font-black uppercase tracking-widest border-2 border-black hover:bg-gray-800"
              >
                Continue
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
