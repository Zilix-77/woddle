export type PlayerRole = 'CREW' | 'IMPOSTOR';
export type GameStatus = 'LOBBY' | 'REVEAL' | 'TYPING' | 'VOTING' | 'ELIMINATION' | 'GUESS' | 'RECAP';

export interface Player {
  id: string;
  name: string;
  avatar: string; // Color hex
  isHost: boolean;
  isReady: boolean;
  role?: PlayerRole;
  isEliminated: boolean;
  score: number;
  lastClue?: string;
  hasVoted: boolean;
}

export interface Clue {
  playerId: string;
  playerName: string;
  playerColor: string;
  text: string;
  timestamp: number;
}

export interface GameConfig {
  category: string;
  impostorCount: number;
  timerDuration: number;
  isAnonymousVoting: boolean;
  isPlayFoolMode: boolean;
  difficulty: 'Easy' | 'Medium' | 'Hard';
}

export interface RoomState {
  id: string;
  status: GameStatus;
  players: Player[];
  config: GameConfig;
  secretWord?: string;
  currentTurnIndex: number;
  clues: Clue[];
  votes: Record<string, string>; // voterId -> targetId
  eliminatedPlayerId?: string;
  winner?: 'CREW' | 'IMPOSTOR';
  roundNumber: number;
  guessAttempts: number;
  turnStartTime?: number;
}

export type ServerEvent = 
  | { type: 'INIT'; state: RoomState }
  | { type: 'UPDATE_STATE'; state: RoomState; yourPlayerId?: string }
  | { type: 'ERROR'; message: string };

export type ClientEvent =
  | { type: 'JOIN'; roomId: string; name: string; avatar: string }
  | { type: 'TOGGLE_READY' }
  | { type: 'UPDATE_CONFIG'; config: Partial<GameConfig> }
  | { type: 'START_GAME' }
  | { type: 'SUBMIT_CLUE'; text: string }
  | { type: 'SUBMIT_VOTE'; targetId: string }
  | { type: 'SUBMIT_GUESS'; word: string }
  | { type: 'PLAY_FOOL'; choice: 'WIN' | 'FOOL' }
  | { type: 'NEXT_ROUND' }
  | { type: 'RESTART_GAME' };
