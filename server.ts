import express from "express";
import { createServer as createViteServer } from "vite";
import { WebSocketServer, WebSocket } from "ws";
import { nanoid } from "nanoid";
import { RoomState, Player, ClientEvent, ServerEvent, GameConfig, Clue } from "./src/types.ts";
import { CATEGORIES } from "./src/constants.ts";

const app = express();
const PORT = 3000;

// Game State Storage
const rooms = new Map<string, RoomState>();
const clients = new Map<string, { ws: WebSocket; roomId: string; playerId: string }>();

function broadcast(roomId: string, event: ServerEvent) {
  const room = rooms.get(roomId);
  if (!room) return;

  for (const [clientId, client] of clients.entries()) {
    if (client.roomId === roomId) {
      client.ws.send(JSON.stringify(event));
    }
  }
}

function getInitialConfig(): GameConfig {
  return {
    category: 'Food',
    impostorCount: 1,
    timerDuration: 40,
    isAnonymousVoting: false,
    isPlayFoolMode: false,
    difficulty: 'Easy',
  };
}

function createRoom(id: string): RoomState {
  return {
    id,
    status: 'LOBBY',
    players: [],
    config: getInitialConfig(),
    currentTurnIndex: 0,
    clues: [],
    votes: {},
    roundNumber: 1,
    guessAttempts: 0,
  };
}

function handleEvent(ws: WebSocket, clientId: string, event: ClientEvent) {
  const client = clients.get(clientId);
  
  if (event.type === 'JOIN') {
    let room = rooms.get(event.roomId);
    if (!room) {
      room = createRoom(event.roomId);
      rooms.set(event.roomId, room);
    }

    const playerId = nanoid(6);
    const newPlayer: Player = {
      id: playerId,
      name: event.name,
      avatar: event.avatar,
      isHost: room.players.length === 0,
      isReady: false,
      isEliminated: false,
      score: 0,
      hasVoted: false,
    };

    room.players.push(newPlayer);
    clients.set(clientId, { ws, roomId: event.roomId, playerId });
    
    // Send individual join confirmation with playerId
    ws.send(JSON.stringify({ type: 'UPDATE_STATE', state: room, yourPlayerId: playerId }));
    
    broadcast(event.roomId, { type: 'UPDATE_STATE', state: room });
    return;
  }

  if (!client) return;
  const { roomId, playerId } = client;
  const room = rooms.get(roomId);
  if (!room) return;

  const player = room.players.find(p => p.id === playerId);
  if (!player) return;

  switch (event.type) {
    case 'TOGGLE_READY':
      player.isReady = !player.isReady;
      broadcast(roomId, { type: 'UPDATE_STATE', state: room });
      break;

    case 'UPDATE_CONFIG':
      if (player.isHost) {
        room.config = { ...room.config, ...event.config };
        broadcast(roomId, { type: 'UPDATE_STATE', state: room });
      }
      break;

    case 'START_GAME':
      if (player.isHost && room.players.every(p => p.isReady)) {
        // Initialize Game
        const categoryWords = CATEGORIES[room.config.category];
        room.secretWord = categoryWords[Math.floor(Math.random() * categoryWords.length)];
        
        // Assign Roles
        const shuffledPlayers = [...room.players].sort(() => Math.random() - 0.5);
        const impostorCount = Math.min(room.config.impostorCount, room.players.length - 1);
        
        room.players.forEach(p => {
          p.role = 'CREW';
          p.isEliminated = false;
          p.lastClue = undefined;
          p.hasVoted = false;
        });

        for (let i = 0; i < impostorCount; i++) {
          const p = room.players.find(pl => pl.id === shuffledPlayers[i].id);
          if (p) p.role = 'IMPOSTOR';
        }

        room.status = 'REVEAL';
        room.clues = [];
        room.votes = {};
        room.currentTurnIndex = 0;
        room.guessAttempts = 0;
        room.winner = undefined;
        room.turnStartTime = Date.now();
        
        broadcast(roomId, { type: 'UPDATE_STATE', state: room });

        setTimeout(() => {
           if (room.status === 'REVEAL') {
              room.status = 'TYPING';
              room.turnStartTime = Date.now();
              broadcast(roomId, { type: 'UPDATE_STATE', state: room });
           }
        }, 10000); // 10 seconds to peek
      }
      break;

    case 'SUBMIT_CLUE':
      if (room.status === 'TYPING') {
        const currentPlayer = room.players.filter(p => !p.isEliminated)[room.currentTurnIndex];
        if (currentPlayer?.id === playerId) {
          const text = event.text.trim().toLowerCase();
          
          // Validation
          if (text.split(' ').length > 1) return;
          if (text === room.secretWord?.toLowerCase()) return;
          if (room.clues.some(c => c.text.toLowerCase() === text)) return;

          const clue: Clue = {
            playerId: player.id,
            playerName: player.name,
            playerColor: player.avatar,
            text: event.text,
            timestamp: Date.now(),
          };
          room.clues.push(clue);
          player.lastClue = event.text;

          // Next turn
          const activePlayers = room.players.filter(p => !p.isEliminated);
          room.currentTurnIndex++;
          room.turnStartTime = Date.now();
          
          if (room.currentTurnIndex >= activePlayers.length) {
            room.status = 'VOTING';
            room.currentTurnIndex = 0;
            room.turnStartTime = undefined;
          }
          
          broadcast(roomId, { type: 'UPDATE_STATE', state: room });
        }
      }
      break;

    case 'SUBMIT_VOTE':
      if (room.status === 'VOTING' && !player.isEliminated && !player.hasVoted) {
        room.votes[playerId] = event.targetId;
        player.hasVoted = true;

        const activePlayers = room.players.filter(p => !p.isEliminated);
        if (Object.keys(room.votes).length === activePlayers.length) {
          // Process Votes
          const voteCounts: Record<string, number> = {};
          Object.values(room.votes).forEach(id => {
            voteCounts[id] = (voteCounts[id] || 0) + 1;
          });

          let maxVotes = 0;
          let eliminatedId: string | null = null;
          let isTie = false;

          for (const [id, count] of Object.entries(voteCounts)) {
            if (count > maxVotes) {
              maxVotes = count;
              eliminatedId = id;
              isTie = false;
            } else if (count === maxVotes) {
              isTie = true;
            }
          }

          if (isTie || !eliminatedId) {
            room.status = 'TYPING'; // Tie = no elimination, next round
            room.clues = [];
            room.votes = {};
            room.players.forEach(p => p.hasVoted = false);
            room.currentTurnIndex = 0;
            room.roundNumber++;
            room.turnStartTime = Date.now();
          } else {
            const eliminatedPlayer = room.players.find(p => p.id === eliminatedId);
            if (eliminatedPlayer) {
              eliminatedPlayer.isEliminated = true;
              room.eliminatedPlayerId = eliminatedId;
              room.status = 'ELIMINATION';
              
              // Scoring
              if (eliminatedPlayer.role === 'CREW') {
                room.players.forEach(p => {
                  if (p.role === 'CREW' && room.votes[p.id] === eliminatedId) p.score -= 1;
                });
              } else {
                room.players.forEach(p => {
                  if (p.role === 'CREW') p.score += 3;
                });
              }
            }
          }
          broadcast(roomId, { type: 'UPDATE_STATE', state: room });
        } else {
          broadcast(roomId, { type: 'UPDATE_STATE', state: room });
        }
      }
      break;

    case 'SUBMIT_GUESS':
      if (room.status === 'TYPING') {
        const activePlayers = room.players.filter(p => !p.isEliminated);
        const currentPlayer = activePlayers[room.currentTurnIndex];
        
        if (currentPlayer?.id === playerId && player.role === 'IMPOSTOR' && room.roundNumber % 2 === 0 && room.guessAttempts < 2) {
          const isCorrect = event.word.trim().toLowerCase() === room.secretWord?.toLowerCase();
          room.guessAttempts++;
          
          if (isCorrect) {
            room.winner = 'IMPOSTOR';
            room.status = 'RECAP';
            player.score += 5;
          } else {
            // Wrong guess - moves turn forward silently
            room.currentTurnIndex++;
            room.turnStartTime = Date.now();
            
            if (room.currentTurnIndex >= activePlayers.length) {
              room.status = 'VOTING';
              room.currentTurnIndex = 0;
              room.turnStartTime = undefined;
            }
          }
          broadcast(roomId, { type: 'UPDATE_STATE', state: room });
        }
      }
      break;

    case 'NEXT_ROUND':
      if (room.status === 'ELIMINATION') {
        // Check win condition
        const remainingImpostors = room.players.filter(p => !p.isEliminated && p.role === 'IMPOSTOR');
        const remainingCrew = room.players.filter(p => !p.isEliminated && p.role === 'CREW');
        
        if (remainingImpostors.length === 0) {
          room.winner = 'CREW';
          room.status = 'RECAP';
        } else if (remainingCrew.length <= remainingImpostors.length) {
          room.winner = 'IMPOSTOR';
          room.status = 'RECAP';
        } else {
          room.status = 'TYPING';
          room.clues = [];
          room.votes = {};
          room.players.forEach(p => p.hasVoted = false);
          room.currentTurnIndex = 0;
          room.roundNumber++;
          room.turnStartTime = Date.now();
        }
        broadcast(roomId, { type: 'UPDATE_STATE', state: room });
      }
      break;

    case 'RESTART_GAME':
      if (player.isHost) {
        room.status = 'LOBBY';
        room.players.forEach(p => {
          p.isReady = false;
          p.isEliminated = false;
          p.hasVoted = false;
          p.role = undefined;
        });
        broadcast(roomId, { type: 'UPDATE_STATE', state: room });
      }
      break;
  }
}

async function startServer() {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  });

  app.use(vite.middlewares);

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  // Timer Check Interval
  setInterval(() => {
    for (const [roomId, room] of rooms.entries()) {
      if (room.status === 'TYPING' && room.turnStartTime) {
        const elapsed = (Date.now() - room.turnStartTime) / 1000;
        if (elapsed >= room.config.timerDuration) {
          // Auto-skip turn
          const activePlayers = room.players.filter(p => !p.isEliminated);
          const currentPlayer = activePlayers[room.currentTurnIndex];
          
          if (currentPlayer) {
            const clue: Clue = {
              playerId: currentPlayer.id,
              playerName: currentPlayer.name,
              playerColor: currentPlayer.avatar,
              text: "[SKIPPED]",
              timestamp: Date.now(),
            };
            room.clues.push(clue);
            currentPlayer.lastClue = "[SKIPPED]";
          }

          room.currentTurnIndex++;
          room.turnStartTime = Date.now();
          
          if (room.currentTurnIndex >= activePlayers.length) {
            room.status = 'VOTING';
            room.currentTurnIndex = 0;
            room.turnStartTime = undefined;
          }
          
          broadcast(roomId, { type: 'UPDATE_STATE', state: room });
        }
      }
    }
  }, 1000);

  const wss = new WebSocketServer({ server });

  wss.on("connection", (ws) => {
    const clientId = nanoid();
    
    ws.on("message", (data) => {
      try {
        const event = JSON.parse(data.toString()) as ClientEvent;
        handleEvent(ws, clientId, event);
      } catch (e) {
        console.error("Failed to parse message", e);
      }
    });

    ws.on("close", () => {
      const client = clients.get(clientId);
      if (client) {
        const { roomId, playerId } = client;
        const room = rooms.get(roomId);
        if (room) {
          room.players = room.players.filter(p => p.id !== playerId);
          if (room.players.length === 0) {
            rooms.delete(roomId);
          } else {
            if (room.players.every(p => !p.isHost)) {
              room.players[0].isHost = true;
            }
            broadcast(roomId, { type: 'UPDATE_STATE', state: room });
          }
        }
        clients.delete(clientId);
      }
    });
  });
}

startServer();
