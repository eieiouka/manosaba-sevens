export default function useCardAnimation({
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
}) {
  const animateCardToBoard = ({
    card,
    ownerIndex,
    onLanding,
  }) => {
    const tableElement = tableRef.current;

    const targetElement =
      tableElement?.querySelector(
        `[data-board-suit="${card.suit}"][data-board-rank="${card.rank}"]`,
      );

    if (!tableElement || !targetElement) {
      onLanding();
      return;
    }

    const targetCenter =
      getElementCenterRelativeTo(
        targetElement,
        tableElement,
      );

    if (!targetCenter) {
      onLanding();
      return;
    }

    const flyingCardId =
      `normal-${ownerIndex}-${card.suit}-${card.rank}-${Date.now()}`;

    playCardPlaySound();

    setFlyingCards((currentFlyingCards) => [
      ...currentFlyingCards,
      {
        ...card,
        id: flyingCardId,
        ownerIndex,
        targetLeft: targetCenter.left,
        targetTop: targetCenter.top,
        targetWidth:
          targetElement.offsetWidth,
        targetHeight:
          targetElement.offsetHeight,
        settled: false,
      },
    ]);

    window.setTimeout(() => {
      /*
        先に盤面へカードを追加する。
      */
      onLanding();

      /*
        Reactとブラウザに盤面を描画させるため、
        2フレーム待つ。
      */
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          /*
            飛行処理はここで終了扱いにする。

            カードの表示自体は消さず、
            着地点に静止させたまま残す。
          */
          setFlyingCards(
            (currentFlyingCards) =>
              currentFlyingCards.map(
                (flyingCard) =>
                  flyingCard.id ===
                  flyingCardId
                    ? {
                        ...flyingCard,
                        settled: true,
                      }
                    : flyingCard,
              ),
          );

          /*
            着地点で500ms静止させてから、
            表示用の飛行カードを削除する。
          */
          window.setTimeout(() => {
            setFlyingCards(
              (currentFlyingCards) =>
                currentFlyingCards.filter(
                  (flyingCard) =>
                    flyingCard.id !==
                    flyingCardId,
                ),
            );
          }, 200);
        });
      });
    }, 720);
  };

  const burstPlayer = ({
    playerIndex,
    cards,
  }) => {
    if (cards.length === 0) {
      return;
    }

    playBurstVoice(playerIndex);

    const burstCardCount = cards.length;

    setBurstCardCounts((currentCounts) => ({
      ...currentCounts,
      [playerIndex]: burstCardCount,
    }));

    const tableElement = tableRef.current;

    const burstId =
      `burst-${playerIndex}-${Date.now()}`;

    const nextFlyingCards = cards
      .map((card, index) => {
        const targetElement =
          tableElement?.querySelector(
            `[data-board-suit="${card.suit}"][data-board-rank="${card.rank}"]`,
          );

        if (!tableElement || !targetElement) {
          return null;
        }

        const targetCenter =
          getElementCenterRelativeTo(
            targetElement,
            tableElement,
          );

        if (!targetCenter) {
          return null;
        }

        return {
          ...card,
          id: `${burstId}-${index}`,
          burstId,
          ownerIndex: playerIndex,
          targetLeft: targetCenter.left,
          targetTop: targetCenter.top,
          targetWidth:
            targetElement.offsetWidth,
          targetHeight:
            targetElement.offsetHeight,
          settled: false,
        };
      })
      .filter(Boolean);

    /*
      飛行開始前に、
      バーストしたプレイヤーの手札を消す。
    */
    if (playerIndex === 0) {
      setHand([]);
      setSelectedCard(null);
    } else {
      const cpuIndex = playerIndex - 1;

      setCpuHands((currentCpuHands) =>
        currentCpuHands.map(
          (cpuHand, index) =>
            index === cpuIndex
              ? []
              : cpuHand,
        ),
      );
    }

    const nextBurstPlayers = [
      ...burstPlayers,
      playerIndex,
    ].filter(
      (value, index, array) =>
        array.indexOf(value) === index,
    );

    setBurstPlayers(nextBurstPlayers);

    setFlyingCards((currentFlyingCards) => [
      ...currentFlyingCards,
      ...nextFlyingCards,
    ]);

    window.setTimeout(() => {
      /*
        バーストした全カードを
        先に盤面へ追加する。
      */
      setBoard((currentBoard) => {
        const nextBoard = {
          spades: [
            ...currentBoard.spades,
          ],
          hearts: [
            ...currentBoard.hearts,
          ],
          diamonds: [
            ...currentBoard.diamonds,
          ],
          clubs: [
            ...currentBoard.clubs,
          ],
        };

        cards.forEach((card) => {
          if (
            !nextBoard[card.suit].includes(
              card.rank,
            )
          ) {
            nextBoard[card.suit].push(
              card.rank,
            );
          }
        });

        Object.keys(nextBoard).forEach(
          (suit) => {
            nextBoard[suit].sort(
              (rankA, rankB) =>
                rankA - rankB,
            );
          },
        );

        return nextBoard;
      });

      /*
        Reactとブラウザに盤面を描画させるため、
        2フレーム待つ。
      */
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          /*
            バーストの飛行処理は
            ここで終了扱いにする。

            カードの表示は着地点に残す。
          */
          setFlyingCards(
            (currentFlyingCards) =>
              currentFlyingCards.map(
                (flyingCard) =>
                  flyingCard.burstId ===
                  burstId
                    ? {
                        ...flyingCard,
                        settled: true,
                      }
                    : flyingCard,
              ),
          );

          /*
            着地点で500ms静止させてから、
            バーストの飛行カードを削除する。
          */
          window.setTimeout(() => {
            setFlyingCards(
              (currentFlyingCards) =>
                currentFlyingCards.filter(
                  (flyingCard) =>
                    flyingCard.burstId !==
                    burstId,
                ),
            );
          }, 500);
        });
      });

      const remainingPlayers = [
        0,
        1,
        2,
        3,
      ].filter(
        (playerIndexValue) =>
          !nextBurstPlayers.includes(
            playerIndexValue,
          ),
      );

      if (remainingPlayers.length === 1) {
        setWinnerType("survived");
        setWinnerIndex(
          remainingPlayers[0],
        );
        return;
      }

      setCurrentPlayerIndex(
        getNextPlayerIndex(
          playerIndex,
          nextBurstPlayers,
        ),
      );
    }, 720);
  };

  return {
    animateCardToBoard,
    burstPlayer,
  };
}