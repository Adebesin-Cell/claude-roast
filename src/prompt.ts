const ENTER = ["\r", "\n"];
const CTRL_C = "";
const BACKSPACE = ["", "\b"];

export const promptSecret = (question: string) =>
  new Promise<string>((resolve, reject) => {
    if (!process.stdin.isTTY) {
      reject(new Error("Cannot prompt: stdin is not a TTY."));
      return;
    }

    process.stdout.write(question);
    let input = "";

    const cleanup = () => {
      process.stdin.removeListener("data", onData);
      process.stdin.setRawMode(false);
      process.stdin.pause();
    };

    const onData = (chunk: Buffer) => {
      const s = chunk.toString("utf8");
      for (const ch of s) {
        if (ENTER.includes(ch)) {
          cleanup();
          process.stdout.write("\n");
          resolve(input);
          return;
        }
        if (ch === CTRL_C) {
          cleanup();
          process.stdout.write("\n");
          reject(new Error("Cancelled."));
          return;
        }
        if (BACKSPACE.includes(ch)) {
          if (input.length) {
            input = input.slice(0, -1);
            process.stdout.write("\b \b");
          }
          continue;
        }
        input += ch;
        process.stdout.write("•");
      }
    };

    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on("data", onData);
  });
