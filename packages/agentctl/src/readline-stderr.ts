import { createInterface, type Interface } from "node:readline/promises";
import { stdin as input, stderr } from "node:process";

export function createStderrReadLine(): {
  readLine: (prompt: string) => Promise<string>;
  close: () => void;
} {
  const rl: Interface = createInterface({ input, output: stderr, terminal: true });
  return {
    readLine: async (prompt: string) => {
      const answer = await rl.question(prompt);
      return answer.trimEnd();
    },
    close: () => {
      rl.close();
    }
  };
}
