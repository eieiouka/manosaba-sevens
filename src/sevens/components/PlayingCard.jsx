import { memo, useState } from "react";

const suits = [
  {
    id: "spades",
    symbol: "♠",
    fileNumber: 1,
  },
  {
    id: "hearts",
    symbol: "♥",
    fileNumber: 2,
  },
  {
    id: "diamonds",
    symbol: "♦",
    fileNumber: 3,
  },
  {
    id: "clubs",
    symbol: "♣",
    fileNumber: 4,
  },
];

function getRankFileName(rank) {
  if (rank === 1) return "A";
  if (rank === 10) return "T";
  if (rank === 11) return "J";
  if (rank === 12) return "Q";
  if (rank === 13) return "K";

  return String(rank);
}

function getCardImagePath(suitId, rank) {
  const suit = suits.find(
    (item) => item.id === suitId,
  );

  if (!suit) {
    return "";
  }

  return `/card_webp/card_${getRankFileName(rank)}${suit.fileNumber}.webp`;
}

function getRankLabel(rank) {
  if (rank === 1) return "A";
  if (rank === 11) return "J";
  if (rank === 12) return "Q";
  if (rank === 13) return "K";

  return String(rank);
}

function PlayingCard({
  suit,
  rank,
  onClick,
  onCardClick,
  selected = false,
  playable = false,
  small = false,
  style,
}) {
  const [imageFailed, setImageFailed] =
    useState(false);

  const suitData = suits.find(
    (item) => item.id === suit,
  );

  const className = [
    "sevensCard",
    selected ? "selectedCard" : "",
    playable ? "playableCard" : "",
    small ? "smallCard" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const handleClick = onCardClick
    ? () => {
        onCardClick(
          suit,
          rank,
          selected,
        );
      }
    : onClick;

  return (
    <button
      type="button"
      className={className}
      style={style}
      onClick={handleClick}
      disabled={!handleClick}
      aria-label={`${suitData?.symbol ?? ""}${getRankLabel(rank)}`}
    >
      {!imageFailed ? (
        <img
          src={getCardImagePath(suit, rank)}
          alt={`${suitData?.symbol ?? ""}${getRankLabel(rank)}`}
          onError={() => {
            setImageFailed(true);
          }}
        />
      ) : (
        <div
          className={`fallbackCard ${
            suitData?.id === "hearts" ||
            suitData?.id === "diamonds"
              ? "fallbackRed"
              : "fallbackBlack"
          }`}
        >
          <div className="fallbackCorner">
            <span>{getRankLabel(rank)}</span>
            <strong>{suitData?.symbol}</strong>
          </div>

          <div className="fallbackCenter">
            {suitData?.symbol}
          </div>

          <div className="fallbackCorner fallbackBottom">
            <span>{getRankLabel(rank)}</span>
            <strong>{suitData?.symbol}</strong>
          </div>
        </div>
      )}
    </button>
  );
}

function arePlayingCardPropsEqual(previousProps, nextProps) {
  return (
    previousProps.suit === nextProps.suit &&
    previousProps.rank === nextProps.rank &&
    previousProps.onClick === nextProps.onClick &&
    previousProps.onCardClick ===
      nextProps.onCardClick &&
    previousProps.selected === nextProps.selected &&
    previousProps.playable === nextProps.playable &&
    previousProps.small === nextProps.small &&
    previousProps.style?.zIndex ===
      nextProps.style?.zIndex &&
    previousProps.style?.["--hand-index"] ===
      nextProps.style?.["--hand-index"] &&
    previousProps.style?.["--opening-start-left"] ===
      nextProps.style?.["--opening-start-left"] &&
    previousProps.style?.["--opening-start-top"] ===
      nextProps.style?.["--opening-start-top"] &&
    previousProps.style?.["--opening-end-left"] ===
      nextProps.style?.["--opening-end-left"] &&
    previousProps.style?.["--opening-end-top"] ===
      nextProps.style?.["--opening-end-top"]
  );
}

export default memo(
  PlayingCard,
  arePlayingCardPropsEqual,
);