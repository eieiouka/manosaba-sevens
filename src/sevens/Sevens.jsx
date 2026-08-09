import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import SevensBoard from "./components/SevensBoard";
import OpponentArea from "./components/OpponentArea";
import PlayerHand from "./components/PlayerHand";
import TurnControls from "./components/TurnControls";
import FlyingCards from "./components/FlyingCards";
import useOpeningAnimation from "./hooks/useOpeningAnimation";
import useCpuTurn from "./hooks/useCpuTurn";
import useAudio from "./hooks/useAudio";
import useCardAnimation from "./hooks/useCardAnimation";
import useRoundFlow from "./hooks/useRoundFlow";
import usePlayerTurn from "./hooks/usePlayerTurn";
import useBurstCheck from "./hooks/useBurstCheck";
import useGameScale from "./hooks/useGameScale";

import {
  GAME_WIDTH,
  GAME_HEIGHT,
  PAGE_PADDING,
  TOTAL_ROUNDS,
  ROUND_SCORE_STORAGE_KEY,
  ROUND_NUMBER_STORAGE_KEY,
  playerNames,
  suits,
  emptyBoard,
  openingSourcePositions,
  opponents,
} from "./constants/sevensConstants";

import calculateRoundResult from "./utils/calculateRoundResult";

import {
  isPlayable,
  getNextPlayerIndex,
  getElementCenterRelativeTo,
} from "./utils/sevensUtils";

import FinalMatchResult from "./components/FinalMatchResult";
import RoundScoreNotebook from "./components/RoundScoreNotebook";
import "./Sevens.css";

const navigationEntry =
  window.performance
    .getEntriesByType("navigation")
    .find(
      (entry) =>
        entry.entryType === "navigation",
    );

if (navigationEntry?.type === "reload") {
  window.sessionStorage.removeItem(
    ROUND_SCORE_STORAGE_KEY,
  );

  window.sessionStorage.removeItem(
    ROUND_NUMBER_STORAGE_KEY,
  );
}

function calculateGameScale() {
  const viewportWidth =
    window.visualViewport?.width ?? window.innerWidth;

  const viewportHeight =
    window.visualViewport?.height ?? window.innerHeight;

  const availableWidth = Math.max(
    viewportWidth - PAGE_PADDING * 2,
    1,
  );

  const availableHeight = Math.max(
    viewportHeight - PAGE_PADDING * 2,
    1,
  );

  return Math.min(
    availableWidth / GAME_WIDTH,
    availableHeight / GAME_HEIGHT,
    1,
  );
}

function loadSavedRoundScores() {
  try {
    const savedValue = window.sessionStorage.getItem(
      ROUND_SCORE_STORAGE_KEY,
    );

    if (!savedValue) {
      return [];
    }

    const parsedValue = JSON.parse(savedValue);

    return Array.isArray(parsedValue)
      ? parsedValue
      : [];
  } catch {
    return [];
  }
}

function loadCurrentRoundNumber() {
  try {
    const savedValue = window.sessionStorage.getItem(
      ROUND_NUMBER_STORAGE_KEY,
    );

    const parsedValue = Number(savedValue);

    if (
      Number.isInteger(parsedValue) &&
      parsedValue >= 1 &&
      parsedValue <= TOTAL_ROUNDS
    ) {
      return parsedValue;
    }

    return 1;
  } catch {
    return 1;
  }
}

function Sevens({
  navigate,
  hands,
  openingSevens,
  firstPlayerIndex,
  onRestart,
  audioManager,
}) {
  const playerHand = hands[0] ?? [];
  const initialCpuHands = [
    hands[1] ?? [],
    hands[2] ?? [],
    hands[3] ?? [],
  ];

  const [board, setBoard] = useState(emptyBoard);
  const [hand, setHand] = useState(playerHand);

  const [cpuHands, setCpuHands] = useState(
    initialCpuHands
  );

  const [currentPlayerIndex, setCurrentPlayerIndex] =
    useState(firstPlayerIndex);

  const [selectedCard, setSelectedCard] = useState(null);
  const [passes, setPasses] = useState(3);

  const [cpuPasses, setCpuPasses] = useState([
    3,
    3,
    3,
  ]);

  const [isMobileLayout, setIsMobileLayout] =
    useState(() =>
      window.matchMedia(
        "(max-width: 600px)",
      ).matches,
    );

  useEffect(() => {
    const mobileMediaQuery =
      window.matchMedia(
        "(max-width: 600px)",
      );

    const updateMobileLayout = () => {
      setIsMobileLayout(
        mobileMediaQuery.matches,
      );
    };

    updateMobileLayout();

    mobileMediaQuery.addEventListener(
      "change",
      updateMobileLayout,
    );

    return () => {
      mobileMediaQuery.removeEventListener(
        "change",
        updateMobileLayout,
      );
    };
  }, []);

  const gameScale = useGameScale(
    calculateGameScale,
  );

  const appliedGameScale =
    isMobileLayout ? 1 : gameScale;

  const [openingDone, setOpeningDone] =
    useState(false);

  const [flyingCards, setFlyingCards] =
    useState([]);

  /*
    settledになったカードは、着地点で表示だけを
    続けているカードなので、ゲーム進行の待機判定から
    除外する。
  */
  const activeFlyingCards = useMemo(
    () =>
      flyingCards.filter(
        (flyingCard) =>
          !flyingCard.settled,
      ),
    [flyingCards],
  );

  const [burstPlayers, setBurstPlayers] =
    useState([]);

  const [burstCardCounts, setBurstCardCounts] =
    useState({});

  const [winnerIndex, setWinnerIndex] =
    useState(null);

  const [winnerType, setWinnerType] =
    useState(null);

  const [currentRound, setCurrentRound] =
    useState(loadCurrentRoundNumber);

  const [savedRoundScores, setSavedRoundScores] =
    useState(loadSavedRoundScores);

  const [roundResult, setRoundResult] =
    useState(null);

  const [finalResultVisible, setFinalResultVisible] =
    useState(false);

  const roundRecordedRef = useRef(false);

  const [turnSeconds, setTurnSeconds] = useState(3);

  const [
    passPopupPlayerIndex,
    setPassPopupPlayerIndex,
  ] = useState(null);

  const passDelayTimerRef = useRef(null);
  const playerTurnCountRef = useRef(0);
  const forcePlayerActionRef = useRef(null);

  const {
    playPassVoice,
    playCardPlaySound,
    playBurstVoice,
    playFinishVoice,
    playChampionVoice,
  } = useAudio(audioManager);

  const tableRef = useRef(null);

  const showPassPopupThenAdvance = (playerIndex) => {
    if (passDelayTimerRef.current !== null) {
      window.clearTimeout(passDelayTimerRef.current);
    }

    setPassPopupPlayerIndex(playerIndex);
    playPassVoice(playerIndex);

    passDelayTimerRef.current = window.setTimeout(() => {
      setPassPopupPlayerIndex(null);

      setCurrentPlayerIndex(
        getNextPlayerIndex(
          playerIndex,
          burstPlayers,
        ),
      );

      passDelayTimerRef.current = null;
    }, 1000);
  };

  useOpeningAnimation({
    openingDone,
    openingSevens,
    firstPlayerIndex,
    tableRef,
    getElementCenterRelative:
      getElementCenterRelativeTo,
    playCardPlaySound,
    setHand,
    setCpuHands,
    setFlyingCards,
    setBoard,
    setCurrentPlayerIndex,
    setOpeningDone,
  });

  useEffect(() => {
    return () => {
      if (passDelayTimerRef.current !== null) {
        window.clearTimeout(
          passDelayTimerRef.current
        );
      }
    };
  }, []);

  const {
    animateCardToBoard,
    burstPlayer,
  } = useCardAnimation({
    tableRef,
    burstPlayers,
    setBurstPlayers,
    setBurstCardCounts,
    setFlyingCards,
    setBoard,
    setHand,
    setCpuHands,
    setSelectedCard,
    setCurrentPlayerIndex,
    getNextPlayerIndex,
    getElementCenterRelativeTo,
    playCardPlaySound,
    playBurstVoice,
    setWinnerIndex,
    setWinnerType,
  });

  const sortedHand = useMemo(() => {
    const suitOrder = {
      spades: 1,
      hearts: 2,
      diamonds: 3,
      clubs: 4,
    };

    return [...hand].sort((cardA, cardB) => {
      const suitDifference =
        suitOrder[cardA.suit] -
        suitOrder[cardB.suit];

      if (suitDifference !== 0) {
        return suitDifference;
      }

      return cardA.rank - cardB.rank;
    });
  }, [hand]);

  useCpuTurn({
    openingDone,
    currentPlayerIndex,
    board,
    cpuHands,
    cpuPasses,
    winnerIndex,
    flyingCards: activeFlyingCards,
    burstPlayers,
    passPopupPlayerIndex,
    hand,

    isPlayable,
    getNextPlayerIndex,
    burstPlayer,
    animateCardToBoard,
    playFinishVoice,
    showPassPopupThenAdvance,

    setCpuHands,
    setBoard,
    setCpuPasses,
    setWinnerType,
    setWinnerIndex,
    setCurrentPlayerIndex,
  });

  useBurstCheck({
    openingDone,
    winnerIndex,
    flyingCards: activeFlyingCards,
    passPopupPlayerIndex,
    currentPlayerIndex,
    burstPlayers,
    hand,
    board,
    passes,
    isPlayable,
    burstPlayer,
  });

  useEffect(() => {
    if (winnerIndex === null) {
      return;
    }

    if (!winnerType) {
      return;
    }

    if (roundRecordedRef.current) {
      return;
    }

    roundRecordedRef.current = true;

    const nextRoundResult = calculateRoundResult({
      currentRound,
      winnerIndex,
      winnerType,
      hand,
      cpuHands,
      burstPlayers,
      burstCardCounts,
    });

    setRoundResult(nextRoundResult);
  }, [
    winnerIndex,
    winnerType,
    currentRound,
    hand,
    cpuHands,
    burstPlayers,
    burstCardCounts,
  ]);

  const {
    goToNextRound,
    showFinalResult,
    restartGame,
  } = useRoundFlow({
    roundResult,
    savedRoundScores,
    currentRound,
    playChampionVoice,
    onRestart,
    setSavedRoundScores,
    setCurrentRound,
    setRoundResult,
    setFinalResultVisible,
    setWinnerType,
    setWinnerIndex,
    roundRecordedRef,
  });

  const handleBackToHub = () => {
    window.sessionStorage.removeItem(
      ROUND_SCORE_STORAGE_KEY,
    );

    window.sessionStorage.removeItem(
      ROUND_NUMBER_STORAGE_KEY,
    );

    window.location.href =
      "https://manosaba-cardgame-hub.vercel.app/";
  };

  const {
    selectCard,
    playCard,
    passTurn,
  } = usePlayerTurn({
    openingDone,
    currentPlayerIndex,
    winnerIndex,
    board,
    hand,
    selectedCard,
    passes,
    burstPlayers,
    flyingCards: activeFlyingCards,
    passPopupPlayerIndex,
    playerTurnCountRef,
    forcePlayerActionRef,
    isPlayable,
    animateCardToBoard,
    getNextPlayerIndex,
    showPassPopupThenAdvance,
    playFinishVoice,
    setHand,
    setSelectedCard,
    setBoard,
    setWinnerType,
    setWinnerIndex,
    setCurrentPlayerIndex,
    setPasses,
    setTurnSeconds,
  });

  return (
    <main className="sevensPage">
      <div
        className={`sevensGameFrame ${
          isMobileLayout
            ? "mobileGameFrame"
            : ""
        }`}
        style={
          isMobileLayout
            ? undefined
            : {
                width:
                  GAME_WIDTH *
                  appliedGameScale,
                height:
                  GAME_HEIGHT *
                  appliedGameScale,
              }
        }
      >
        <div
          className={`sevensGameCanvas ${
            activeFlyingCards.length > 0
              ? "cardAnimationRunning"
              : ""
          } ${
            isMobileLayout
              ? "mobileGameCanvas"
              : ""
          }`}
          style={
            isMobileLayout
              ? undefined
              : {
                  transform: `scale(${appliedGameScale})`,
                }
          }
        >
          <header className="sevensHeader">
            <button
              type="button"
              className="backButton"
              onClick={handleBackToHub}
            >
              ← HUBへ戻る
            </button>

            <div className="sevensTitle">
              <span>MANOSABA CARD GAMES</span>
              <h1>SEVENS</h1>
              <p>七並べ</p>
            </div>

            <button
              type="button"
              className="restartButton"
              onClick={restartGame}
            >
              やり直す
            </button>
          </header>

          <section
            ref={tableRef}
            className="sevensTable"
          >
            <FlyingCards
              flyingCards={flyingCards}
              openingSourcePositions={
                openingSourcePositions
              }
            />

            <OpponentArea
              opponents={opponents}
              openingDone={openingDone}
              currentPlayerIndex={
                currentPlayerIndex
              }
              burstPlayers={burstPlayers}
              burstCardCounts={burstCardCounts}
              cpuHands={cpuHands}
              cpuPasses={cpuPasses}
              passPopupPlayerIndex={
                passPopupPlayerIndex
              }
            />

            <SevensBoard
              suits={suits}
              board={board}
              isPlayable={isPlayable}
            />

            <section className="playerArea">
              <PlayerHand
                sortedHand={sortedHand}
                openingDone={openingDone}
                currentPlayerIndex={
                  currentPlayerIndex
                }
                board={board}
                selectedCard={selectedCard}
                burstPlayers={burstPlayers}
                burstCardCounts={
                  burstCardCounts
                }
                isPlayable={isPlayable}
                onSelectCard={selectCard}
                onPlayCard={playCard}
              />

              <TurnControls
                openingDone={openingDone}
                currentPlayerIndex={
                  currentPlayerIndex
                }
                flyingCards={
                  activeFlyingCards
                }
                passPopupPlayerIndex={
                  passPopupPlayerIndex
                }
                burstPlayers={burstPlayers}
                selectedCard={selectedCard}
                passes={passes}
                turnSeconds={turnSeconds}
                isFirstPlayerTurn={
                  playerTurnCountRef.current === 0
                }
                onPlayCard={() => playCard()}
                onPassTurn={passTurn}
              />
            </section>
          </section>

          {winnerIndex !== null &&
            roundResult !== null &&
            !finalResultVisible && (
              <RoundScoreNotebook
                roundNumber={currentRound}
                savedRoundScores={
                  savedRoundScores
                }
                roundResult={roundResult}
                onNextRound={goToNextRound}
                onFinishMatch={showFinalResult}
              />
            )}

          {finalResultVisible &&
            roundResult !== null && (
              <FinalMatchResult
                savedRoundScores={
                  savedRoundScores
                }
                roundResult={roundResult}
                onRestart={restartGame}
                onBackToHub={handleBackToHub}
              />
            )}
        </div>
      </div>
    </main>
  );
}

export default Sevens;