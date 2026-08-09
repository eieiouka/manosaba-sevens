import {
  memo,
  useLayoutEffect,
  useRef,
} from "react";

const suitFileNumbers = {
  spades: 1,
  hearts: 2,
  diamonds: 3,
  clubs: 4,
};

function getRankFileName(rank) {
  if (rank === 1) {
    return "A";
  }

  if (rank === 10) {
    return "T";
  }

  if (rank === 11) {
    return "J";
  }

  if (rank === 12) {
    return "Q";
  }

  if (rank === 13) {
    return "K";
  }

  return String(rank);
}

function getCardImagePath(suit, rank) {
  const suitFileNumber =
    suitFileNumbers[suit];

  if (!suitFileNumber) {
    return "";
  }

  return `/cards_webp/card_${getRankFileName(
    rank,
  )}${suitFileNumber}.webp`;
}

const FlyingCard = memo(function FlyingCard({
  flyingCard,
  sourcePosition,
}) {
  const cardRef = useRef(null);

  useLayoutEffect(() => {
    const cardElement = cardRef.current;

    if (!cardElement) {
      return;
    }

    /*
      着地後は、飛行カードと盤面カードの
      実際の描画位置を比較して補正する。
    */
    if (flyingCard.settled) {
      const tableElement =
        cardElement.closest(
          ".sevensTable",
        );

      const targetElement =
        tableElement?.querySelector(
          `[data-board-suit="${flyingCard.suit}"][data-board-rank="${flyingCard.rank}"]`,
        );

      if (
        !tableElement ||
        !targetElement
      ) {
        return;
      }

      const tableRect =
        tableElement.getBoundingClientRect();

      const targetRect =
        targetElement.getBoundingClientRect();

      const cardRect =
        cardElement.getBoundingClientRect();

      /*
        PC版ではゲーム画面全体が
        transform: scale(...)される。

        画面上の差を、
        CSS内部の座標へ戻す。
      */
      const scaleX =
        tableElement.offsetWidth > 0
          ? tableRect.width /
            tableElement.offsetWidth
          : 1;

      const scaleY =
        tableElement.offsetHeight > 0
          ? tableRect.height /
            tableElement.offsetHeight
          : 1;

      const correctionX =
        (targetRect.left -
          cardRect.left) /
        scaleX;

      const correctionY =
        (targetRect.top -
          cardRect.top) /
        scaleY;

      cardElement.style.setProperty(
        "--settled-correction-x",
        `${correctionX}px`,
      );

      cardElement.style.setProperty(
        "--settled-correction-y",
        `${correctionY}px`,
      );

      return;
    }

    /*
      CSSの50%などが実際に何pxになったかを、
      ブラウザに計算させてから取得する。
    */
    const startLeft =
      cardElement.offsetLeft;

    const startTop =
      cardElement.offsetTop;

    const moveX =
      flyingCard.targetLeft -
      startLeft;

    const moveY =
      flyingCard.targetTop -
      startTop;

    cardElement.style.setProperty(
      "--opening-move-x",
      `${moveX}px`,
    );

    cardElement.style.setProperty(
      "--opening-move-y",
      `${moveY}px`,
    );

    /*
      移動量を設定してから
      アニメーションを開始する。
    */
    cardElement.classList.add(
      "openingFlyingCardReady",
    );
  }, [
    flyingCard.suit,
    flyingCard.rank,
    flyingCard.targetLeft,
    flyingCard.targetTop,
    flyingCard.settled,
  ]);

  const className = [
    "openingFlyingCard",
    flyingCard.settled
      ? "settledFlyingCard"
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      ref={cardRef}
      className={className}
      style={{
        "--opening-start-left":
          sourcePosition?.left ?? "50%",

        "--opening-start-top":
          sourcePosition?.top ?? "50%",

        /*
          飛行カードのサイズを、
          盤面スロットの実寸へ合わせる。
        */
        "--flying-card-width":
          `${
            flyingCard.targetWidth ??
            92
          }px`,

        "--flying-card-height":
          `${
            flyingCard.targetHeight ??
            138
          }px`,

        /*
          着地後は盤面スロットの
          中心座標へ直接置く。
        */
        "--settled-left":
          `${
            flyingCard.targetLeft
          }px`,

        "--settled-top":
          `${
            flyingCard.targetTop
          }px`,

        /*
          実際に描画された盤面カードとの
          差分を入れる。

          初回描画時は0pxで、
          useLayoutEffectで正確な値へ更新する。
        */
        "--settled-correction-x":
          "0px",

        "--settled-correction-y":
          "0px",
      }}
    >
      <img
        className="flyingCardImage"
        src={getCardImagePath(
          flyingCard.suit,
          flyingCard.rank,
        )}
        alt=""
        draggable={false}
        decoding="async"
      />
    </div>
  );
});

function FlyingCards({
  flyingCards,
  openingSourcePositions,
}) {
  return (
    <>
      {flyingCards.map(
        (flyingCard) => {
          const sourcePosition =
            openingSourcePositions[
              flyingCard.ownerIndex
            ];

          return (
            <FlyingCard
              key={flyingCard.id}
              flyingCard={flyingCard}
              sourcePosition={
                sourcePosition
              }
            />
          );
        },
      )}
    </>
  );
}

export default memo(FlyingCards);