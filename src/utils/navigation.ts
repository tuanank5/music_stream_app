import type { Href } from "expo-router";

type BackRouter = {
  canDismiss: () => boolean;
  dismiss: (count?: number) => void;
  replace: (href: Href) => void;
};

// Router actions are queued. Two taps before the first pop is applied must
// not enqueue another pop against a stack that is about to become empty.
export function createBackAction(router: BackRouter, fallback: Href) {
  let pending = false;
  return {
    reset() {
      pending = false;
    },
    go() {
      if (pending) return;
      pending = true;
      if (router.canDismiss()) router.dismiss(1);
      else router.replace(fallback);
    },
  };
}
