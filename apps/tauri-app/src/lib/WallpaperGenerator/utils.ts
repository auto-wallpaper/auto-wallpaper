import { log } from "~/utils/log";

export const sleep = (t: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, t));

export const generateRandomString = (length: number) => {
  const characters = "0123456789abcdefghijklmnopqrstuvwxyz_";
  let randomString = "";

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    randomString += characters.charAt(randomIndex);
  }

  return randomString;
};

export const gql = (str: TemplateStringsArray) => str.join("");

export const tryUntilSuccess = ({ maxTries, waitBetween }: { maxTries?: number; waitBetween?: number } = {}) => async <T>(
  cb: (lastErr: Error | null, fails: number) => Promise<T> | T,
): Promise<T | undefined> => {
  let fails = 0;
  let lastErr: Error | null = null;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      const result = await cb(lastErr, fails);

      return result;
    } catch (e) {
      fails++;
      lastErr = e as never;

      if (maxTries && fails >= maxTries) {
        void log.wallpaperGeneration.error(e)
        throw e
      }

      if (waitBetween) await sleep(waitBetween)
    }
  }
};
