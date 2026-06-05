import { useEffect, useMemo, useRef, useState } from 'react';
import { Award, Gauge, Github, RefreshCcw, Rocket, Send, Zap } from 'lucide-react';
import {
  hasFirebaseConfig,
  loadLeaderboard,
  saveScore,
  type LeaderboardEntry,
} from './firebase';

type GameState = 'idle' | 'waiting' | 'ready' | 'tooSoon' | 'finished';

const MIN_WAIT = 1400;
const MAX_WAIT = 4200;

function App() {
  const [gameState, setGameState] = useState<GameState>('idle');
  const [startedAt, setStartedAt] = useState(0);
  const [lastScore, setLastScore] = useState<number | null>(null);
  const [bestScore, setBestScore] = useState<number | null>(() => readBestScore());
  const [playerName, setPlayerName] = useState('Player');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const timerRef = useRef<number | null>(null);

  const firebaseReady = hasFirebaseConfig();

  useEffect(() => {
    refreshLeaderboard();
    return () => clearTimer();
  }, []);

  const rankPreview = useMemo(() => {
    if (lastScore === null) {
      return null;
    }

    return leaderboard.filter((entry) => entry.score < lastScore).length + 1;
  }, [lastScore, leaderboard]);

  function clearTimer() {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  function startRound() {
    clearTimer();
    setLastScore(null);
    setStatusMessage('');
    setGameState('waiting');

    const waitTime = Math.floor(Math.random() * (MAX_WAIT - MIN_WAIT + 1)) + MIN_WAIT;
    timerRef.current = window.setTimeout(() => {
      setStartedAt(performance.now());
      setGameState('ready');
    }, waitTime);
  }

  function handleReactionPress() {
    if (gameState === 'idle' || gameState === 'finished' || gameState === 'tooSoon') {
      startRound();
      return;
    }

    if (gameState === 'waiting') {
      clearTimer();
      setGameState('tooSoon');
      setStatusMessage('초록색 신호가 뜨기 전에 눌렀어요. 다시 도전!');
      return;
    }

    const score = Math.round(performance.now() - startedAt);
    setLastScore(score);
    setBestScore((currentBest) => {
      const nextBest = currentBest === null ? score : Math.min(currentBest, score);
      localStorage.setItem('reaction-rank:best', String(nextBest));
      return nextBest;
    });
    setGameState('finished');
    setStatusMessage(getScoreMessage(score));
  }

  async function refreshLeaderboard() {
    try {
      setLeaderboard(await loadLeaderboard());
    } catch {
      setStatusMessage('랭킹을 불러오지 못했어요. Firebase 설정을 확인해 주세요.');
    }
  }

  async function submitScore() {
    if (lastScore === null) {
      return;
    }

    setIsSaving(true);
    setStatusMessage('');

    try {
      await saveScore(playerName, lastScore);
      await refreshLeaderboard();
      setStatusMessage('랭킹에 점수를 저장했어요.');
    } catch {
      setStatusMessage('점수 저장에 실패했어요. Firestore 규칙과 환경 변수를 확인해 주세요.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="app-shell">
      <section className="game-band">
        <div className="topbar">
          <div className="brand">
            <Zap size={24} aria-hidden="true" />
            <span>Reaction Rank</span>
          </div>
          <div className="deploy-links" aria-label="project stack">
            <span title="GitHub repository ready">
              <Github size={16} aria-hidden="true" />
              GitHub
            </span>
            <span title="Vercel deployment ready">
              <Rocket size={16} aria-hidden="true" />
              Vercel
            </span>
            <span title={firebaseReady ? 'Firebase connected' : 'Demo mode until .env is filled'}>
              <Gauge size={16} aria-hidden="true" />
              {firebaseReady ? 'Firebase' : 'Demo'}
            </span>
          </div>
        </div>

        <div className="hero-grid">
          <div className="game-panel">
            <div className="stats-strip">
              <Stat label="Best" value={bestScore === null ? '--' : `${bestScore}ms`} />
              <Stat label="Last" value={lastScore === null ? '--' : `${lastScore}ms`} />
              <Stat label="Rank" value={rankPreview === null ? '--' : `#${rankPreview}`} />
            </div>

            <button
              className={`reaction-target ${gameState}`}
              onClick={handleReactionPress}
              type="button"
              aria-label="reaction button"
            >
              <span className="target-ring" aria-hidden="true" />
              <span className="target-copy">{getTargetText(gameState)}</span>
            </button>

            <div className="score-form">
              <label>
                <span>이름</span>
                <input
                  value={playerName}
                  maxLength={16}
                  onChange={(event) => setPlayerName(event.target.value)}
                  placeholder="Player"
                />
              </label>
              <button
                className="icon-button primary"
                disabled={lastScore === null || isSaving}
                onClick={submitScore}
                title="랭킹에 저장"
                type="button"
              >
                <Send size={18} aria-hidden="true" />
              </button>
              <button
                className="icon-button"
                onClick={startRound}
                title="다시 시작"
                type="button"
              >
                <RefreshCcw size={18} aria-hidden="true" />
              </button>
            </div>

            <p className="status-line" role="status">
              {statusMessage || getStatusText(gameState)}
            </p>
          </div>

          <aside className="leaderboard-panel" aria-label="leaderboard">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">Top 10</span>
                <h1>반응속도 랭킹</h1>
              </div>
              <Award size={28} aria-hidden="true" />
            </div>

            <ol className="leaderboard-list">
              {leaderboard.map((entry, index) => (
                <li key={entry.id}>
                  <span className="rank">{index + 1}</span>
                  <span className="name">{entry.name}</span>
                  <span className="score">{entry.score}ms</span>
                </li>
              ))}
            </ol>
          </aside>
        </div>
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function getTargetText(gameState: GameState) {
  if (gameState === 'waiting') {
    return '기다려요';
  }

  if (gameState === 'ready') {
    return '지금!';
  }

  if (gameState === 'tooSoon') {
    return '너무 빨랐어요';
  }

  if (gameState === 'finished') {
    return '다시 도전';
  }

  return '시작';
}

function getScoreMessage(score: number) {
  if (score < 180) {
    return '엄청 빨라요. 랭킹 1위를 노려볼 만합니다.';
  }

  if (score < 260) {
    return '좋은 기록이에요. 한 번 더 하면 더 줄일 수 있어요.';
  }

  return '기록 완료. 손가락 예열하고 다시 도전해 봐요.';
}

function getStatusText(gameState: GameState) {
  if (gameState === 'waiting') {
    return '신호 대기 중';
  }

  if (gameState === 'ready') {
    return '측정 중';
  }

  if (gameState === 'finished') {
    return '기록 완료';
  }

  if (gameState === 'tooSoon') {
    return '실격';
  }

  return '준비 완료';
}

function readBestScore() {
  const value = Number(localStorage.getItem('reaction-rank:best'));
  return Number.isFinite(value) && value > 0 ? value : null;
}

export default App;
