import { EventEmitter } from "node:events";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import readline from "node:readline";

import type { JsonRpcRequest, JsonRpcResponse, RegistryAgentEntry } from "@consoler/protocol";

export interface JsonRpcNotification {
  jsonrpc: "2.0";
  method: string;
  params?: Record<string, unknown>;
}

export interface AgentClientOptions {
  entry: RegistryAgentEntry;
  onNotification?: (notification: JsonRpcNotification) => void;
}

export class JsonRpcAgentClient {
  private readonly process: ChildProcessWithoutNullStreams;
  private readonly pending = new Map<string | number, {
    resolve: (value: unknown) => void;
    reject: (error: Error) => void;
  }>();
  private nextId = 1;
  private closed = false;

  constructor(private readonly options: AgentClientOptions) {
    const { entry } = options;
    this.process = spawn(entry.command, entry.args, {
      cwd: entry.cwd,
      env: { ...process.env, ...entry.env },
      stdio: ["pipe", "pipe", "pipe"]
    });

    const rl = readline.createInterface({ input: this.process.stdout });
    rl.on("line", (line) => this.handleLine(line));

    this.process.stderr.on("data", (chunk: Buffer) => {
      process.stderr.write(chunk);
    });

    let stdoutEnded = false;
    this.process.stdout.on("end", () => {
      stdoutEnded = true;
    });

    this.process.on("exit", () => {
      this.closed = true;
      const rejectPending = (): void => {
        for (const pending of this.pending.values()) {
          pending.reject(new Error("Agent process exited before response"));
        }
        this.pending.clear();
      };
      if (stdoutEnded) {
        rejectPending();
      } else {
        this.process.stdout.once("end", rejectPending);
        setTimeout(rejectPending, 50);
      }
    });
  }

  async request(method: string, params: Record<string, unknown> = {}): Promise<unknown> {
    if (this.closed) {
      throw new Error("Agent process is not running");
    }
    const id = this.nextId++;
    const payload: JsonRpcRequest = {
      jsonrpc: "2.0",
      id,
      method,
      params
    };
    const line = `${JSON.stringify(payload)}\n`;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.process.stdin.write(line, (error) => {
        if (error) {
          this.pending.delete(id);
          reject(error);
        }
      });
    });
  }

  kill(): void {
    if (!this.closed) {
      this.process.kill();
    }
  }

  private handleLine(line: string): void {
    const trimmed = line.trim();
    if (!trimmed) return;
    let message: JsonRpcResponse & Record<string, unknown>;
    try {
      message = JSON.parse(trimmed) as JsonRpcResponse & Record<string, unknown>;
    } catch {
      return;
    }

    if (typeof message.method === "string") {
      this.options.onNotification?.(message as unknown as JsonRpcNotification);
      return;
    }

    if (message.id === undefined || message.id === null) {
      return;
    }

    const pending = this.pending.get(message.id);
    if (!pending) return;
    this.pending.delete(message.id);

    if (message.error) {
      pending.reject(new Error(message.error.message));
      return;
    }
    pending.resolve(message.result);
  }
}

export class LineBufferParser extends EventEmitter {
  private buffer = "";

  push(chunk: string): void {
    this.buffer += chunk;
    let index = this.buffer.indexOf("\n");
    while (index >= 0) {
      const line = this.buffer.slice(0, index).trim();
      this.buffer = this.buffer.slice(index + 1);
      if (line) {
        this.emit("line", line);
      }
      index = this.buffer.indexOf("\n");
    }
  }
}

export function parseNdjsonLine(line: string): Record<string, unknown> | null {
  try {
    return JSON.parse(line) as Record<string, unknown>;
  } catch {
    return null;
  }
}
