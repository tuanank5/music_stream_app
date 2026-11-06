// One instance per open composer. Preserve a key across network retries, and
// allocate a new one for an edited payload, a different account or a new form.
export function createRequestCache(generate: () => string) {
  let previous: { signature: string; key: string } | undefined;
  return {
    key(uid: string, fields: unknown) {
      const signature = JSON.stringify([uid, fields]);
      if (previous?.signature !== signature)
        previous = { signature, key: generate() };
      return previous.key;
    },
    reset() {
      previous = undefined;
    },
  };
}
