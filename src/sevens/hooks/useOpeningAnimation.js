import { useEffect } from "react";

export default function useOpeningAnimation({
  openingDone,
  openingSevens,
  firstPlayerIndex,
  tableRef,
  getElementCenterRelative,
  playCardPlaySound,
  setHand,
  setCpuHands,
  setFlyingCards,
  setBoard,
  setCurrentPlayerIndex,
  setOpeningDone,
}) {
  useEffect(() => {
    if (openingDone) {
      return undefined;
    }

    if (
      !openingSevens ||
      openingSevens.length === 0
    ) {
      setCurrentPlayerIndex(
        firstPlayerIndex,
      );

      setOpeningDone(true);

      return undefined;
    }

    let cancelled = false;
    const timers = [];

    const suitOrder = {
      spades: 0,
      hearts: 1,
      diamonds: 2,
      clubs: 3,
    };

    const orderedSevens = [
      ...openingSevens,
    ].sort(
      (cardA, cardB) =>
        suitOrder[cardA.suit] -
        suitOrder[cardB.suit],
    );

    /*
      Sevens画面を表示してから、
      初回描画が落ち着くまで少し待つ。
    */
    const openingStartDelay = 800;

    /*
      7は600ms間隔で順番に出す。

      CSSの飛行アニメーションは700ms。
      20msの余裕を持たせて、
      720ms後に着地扱いにする。
    */
    const launchInterval = 600;
    const flightDuration = 720;

    /*
      着地した飛行カードを、
      その場に表示しておく時間。
    */
    const landingHoldDuration = 500;

    orderedSevens.forEach(
      (card, index) => {
        const launchDelay =
          openingStartDelay +
          index * launchInterval;

        const landingDelay =
          launchDelay +
          flightDuration;

        const flyingCardId =
          `opening-${card.ownerIndex}-${card.suit}-7-${index}`;

        const launchTimer =
          window.setTimeout(() => {
            if (cancelled) {
              return;
            }

            const tableElement =
              tableRef.current;

            const targetElement =
              tableElement?.querySelector(
                `[data-board-suit="${card.suit}"][data-board-rank="7"]`,
              );

            if (
              !tableElement ||
              !targetElement
            ) {
              return;
            }

            const targetCenter =
              getElementCenterRelative(
                targetElement,
                tableElement,
              );

            if (!targetCenter) {
              return;
            }

            /*
              7を飛ばし始める前に、
              所有者の手札から7を削除する。
            */
            if (card.ownerIndex === 0) {
              setHand((currentHand) =>
                currentHand.filter(
                  (handCard) =>
                    handCard.suit !==
                      card.suit ||
                    handCard.rank !== 7,
                ),
              );
            } else {
              const cpuIndex =
                card.ownerIndex - 1;

              setCpuHands(
                (currentCpuHands) =>
                  currentCpuHands.map(
                    (
                      cpuHand,
                      currentCpuIndex,
                    ) => {
                      if (
                        currentCpuIndex !==
                        cpuIndex
                      ) {
                        return cpuHand;
                      }

                      return cpuHand.filter(
                        (handCard) =>
                          handCard.suit !==
                            card.suit ||
                          handCard.rank !==
                            7,
                      );
                    },
                  ),
              );
            }

            playCardPlaySound();

            setFlyingCards(
              (currentFlyingCards) => [
                ...currentFlyingCards,
                {
                  ...card,
                  id: flyingCardId,
                  targetLeft:
                    targetCenter.left,
                  targetTop:
                    targetCenter.top,
                  targetWidth:
                    targetElement.offsetWidth,
                  targetHeight:
                    targetElement.offsetHeight,
                  settled: false,
                },
              ],
            );
          }, launchDelay);

        const landingTimer =
          window.setTimeout(() => {
            if (cancelled) {
              return;
            }

            /*
              飛行カードを残したまま、
              先に盤面へ7を追加する。
            */
            setBoard((currentBoard) => {
              if (
                currentBoard[
                  card.suit
                ]?.includes(7)
              ) {
                return currentBoard;
              }

              return {
                ...currentBoard,
                [card.suit]: [
                  ...currentBoard[
                    card.suit
                  ],
                  7,
                ],
              };
            });

            /*
              盤面側の7を描画させるため、
              2フレーム待つ。
            */
            window.requestAnimationFrame(
              () => {
                window.requestAnimationFrame(
                  () => {
                    /*
                      飛行処理は終了扱いにするが、
                      表示は着地点に残す。
                    */
                    setFlyingCards(
                      (
                        currentFlyingCards,
                      ) =>
                        currentFlyingCards.map(
                          (
                            flyingCard,
                          ) =>
                            flyingCard.id ===
                            flyingCardId
                              ? {
                                  ...flyingCard,
                                  settled:
                                    true,
                                }
                              : flyingCard,
                        ),
                    );

                    /*
                      着地点で1秒静止してから、
                      この7の飛行カードだけ削除する。

                      openingDoneの変更後も削除処理を
                      続ける必要があるため、
                      このタイマーはtimersには入れない。
                    */
                    window.setTimeout(() => {
                      setFlyingCards(
                        (
                          currentFlyingCards,
                        ) =>
                          currentFlyingCards.filter(
                            (
                              flyingCard,
                            ) =>
                              flyingCard.id !==
                              flyingCardId,
                          ),
                      );
                    }, landingHoldDuration);
                  },
                );
              },
            );
          }, landingDelay);

        timers.push(
          launchTimer,
          landingTimer,
        );
      },
    );

    /*
      最後の7が着地してから100ms後に、
      通常のゲーム進行を開始する。

      着地した7はsettledになっているため、
      表示が残っていても進行を止めない。
    */
    const finishDelay =
      openingStartDelay +
      (orderedSevens.length - 1) *
        launchInterval +
      flightDuration +
      100;

    const finishTimer =
      window.setTimeout(() => {
        if (cancelled) {
          return;
        }

        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(
            () => {
              /*
                ここではflyingCardsを
                空にしない。

                各7は着地から1秒後に
                個別に削除される。
              */
              setCurrentPlayerIndex(
                firstPlayerIndex,
              );

              setOpeningDone(true);
            },
          );
        });
      }, finishDelay);

    timers.push(finishTimer);

    return () => {
      cancelled = true;

      timers.forEach((timer) => {
        window.clearTimeout(timer);
      });
    };
  }, [
    openingDone,
    openingSevens,
    firstPlayerIndex,
    tableRef,
    getElementCenterRelative,
    playCardPlaySound,
    setHand,
    setCpuHands,
    setFlyingCards,
    setBoard,
    setCurrentPlayerIndex,
    setOpeningDone,
  ]);
}