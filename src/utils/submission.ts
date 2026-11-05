export function createSubmissionKey(nextKey: () => string) {
  let previous: { signature: string; key: string } | undefined;
  return {
    get(...scope: string[]) {
      const signature = JSON.stringify(scope);
      if (previous?.signature !== signature)
        previous = { signature, key: nextKey() };
      return previous.key;
    },
    clear() {
      previous = undefined;
    },
  };
}
