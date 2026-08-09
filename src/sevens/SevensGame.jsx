import {
  useEffect,
  useRef,
  useState,
} from "react";

import StartScreen from "./StartScreen";
import RuleScreen from "./RuleScreen";
import Sevens from "./Sevens";
import { setupSevensGame } from "./sevensLogic";

import {
  createSevensAudioManager,
  warmUpSevensAudio,
} from "./audioManager";

function SevensGame({ navigate }) {
  const [phase, setPhase] =
    useState("start");

  const [hands, setHands] = useState([]);

  const [
    openingSevens,
    setOpeningSevens,
  ] = useState([]);

  const [
    firstPlayerIndex,
    setFirstPlayerIndex,
  ] = useState(0);

  const [gameId, setGameId] =
    useState(0);

  /*
    七並べの画面を開いた時点で、
    52枚のWebPカード画像を
    バックグラウンドで先読みする。

    読み込み完了は待たないので、
    スタート画面の操作はそのまま可能。
  */
  useEffect(() => {
    const ranks = [
      "A",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
      "9",
      "T",
      "J",
      "Q",
      "K",
    ];

    const suitNumbers = [
      1,
      2,
      3,
      4,
    ];

    for (const rank of ranks) {
      for (const suitNumber of suitNumbers) {
        const image = new Image();

        image.src =
          `/cards_webp/card_${rank}${suitNumber}.webp`;
      }
    }
  }, []);

  /*
    SevensGameが存在している間、
    同じAudioオブジェクトを保持する。

    StartScreenからRuleScreen、
    RuleScreenからSevensへ移動しても、
    Audioは作り直されない。
  */
  const audioManagerRef = useRef(null);

  if (audioManagerRef.current === null) {
    audioManagerRef.current =
      createSevensAudioManager();
  }

  const setupNewGame = () => {
    const game = setupSevensGame(4);

    setHands(game.hands);

    setOpeningSevens(
      game.openingSevens,
    );

    setFirstPlayerIndex(
      game.firstPlayerIndex,
    );

    setGameId(
      (currentGameId) =>
        currentGameId + 1,
    );
  };

  /*
    開始画面のゲームスタートでは
    まだゲームを生成せず、
    ルール説明画面へ移動する。
  */
  const handleOpenRules = () => {
    setPhase("rules");
  };

  /*
    ルール画面のOKボタンを押した時に、
    音声準備とゲーム生成を行う。
  */
  const handleConfirmRules = async () => {
    /*
      OKボタンのクリック操作中に
      カード音を無音再生してデコードする。
    */
    await warmUpSevensAudio(
      audioManagerRef.current,
    );

    /*
      ウォームアップ直後のスマホ側処理を
      少しだけ待ってから開幕する。
    */
    await new Promise((resolve) => {
      window.setTimeout(resolve, 300);
    });

    setupNewGame();
    setPhase("playing");
  };

  const handleRestart = () => {
    /*
      音声は作り直さない。
      同じaudioManagerを使い続ける。

      2回目以降のゲームでは
      ルール説明を再表示せず、
      そのまま新しいゲームを始める。
    */
    setupNewGame();
  };

  if (phase === "start") {
    return (
      <StartScreen
        onStart={handleOpenRules}
      />
    );
  }

  if (phase === "rules") {
    return (
      <RuleScreen
        onConfirm={
          handleConfirmRules
        }
      />
    );
  }

  if (phase === "playing") {
    return (
      <Sevens
        key={gameId}
        navigate={navigate}
        hands={hands}
        openingSevens={
          openingSevens
        }
        firstPlayerIndex={
          firstPlayerIndex
        }
        onRestart={handleRestart}
        audioManager={
          audioManagerRef.current
        }
      />
    );
  }

  return null;
}

export default SevensGame;