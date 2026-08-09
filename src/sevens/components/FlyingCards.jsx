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

    /*
      着地後はアニメーション用の
      移動量を使わない。
    */
    if (
      !cardElement ||
      flyingCard.settled
    ) {
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
    flyingCard.targetLeft,
    flyingCard.targetTop,
    flyingCard.settled,
  ]);

  const targetWidth =
    flyingCard.targetWidth ?? 92;

  const targetHeight =
    flyingCard.targetHeight ?? 138;

  /*
    targetLeft / targetTopは
    盤面スロットの中心座標。

    幅と高さの半分を引いて、
    盤面スロットの左上座標へ変換する。
  */
  const settledLeft =
    flyingCard.targetLeft -
    targetWidth / 2;

  const settledTop =
    flyingCard.targetTop -
    targetHeight / 2;

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
          `${targetWidth}px`,

        "--flying-card-height":
          `${targetHeight}px`,

        /*
          着地後は盤面スロットの
          左上座標へ直接配置する。
        */
        "--settled-left":
          `${settledLeft}px`,

        "--settled-top":
          `${settledTop}px`,
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