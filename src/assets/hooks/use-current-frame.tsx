import { type CallbackListener, type PlayerRef } from "@remotion/player";
import { useCallback, useSyncExternalStore } from "react";

export const useCurrentPlayerFrame = (player: PlayerRef) => {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (!player) {
        return () => undefined;
      }
      const updater: CallbackListener<"frameupdate"> = () => {
        onStoreChange();
      };
      player.addEventListener("frameupdate", updater);
      return () => {
        player.removeEventListener("frameupdate", updater);
      };
    },
    [player]
  );
  const data = useSyncExternalStore<number>(
    subscribe,
    () => player.getCurrentFrame() ?? 0,
    () => 0
  );
  return data;
};
