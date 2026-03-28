import { ChildProcess, spawn } from "child_process";
import { app, dialog } from "electron";
import * as path from "path";
import * as fs from "fs";
import * as net from "net";
import * as http from "http";

let pythonProcess: ChildProcess | null = null;
let backendPort = 8000;
let restartCount = 0;
let intentionalShutdown = false;
let logFile: string | null = null;

const MAX_RESTARTS = 3;

function getLogFile(): string {
  if (!logFile) {
    logFile = path.join(app.getPath("userData"), "donna-electron.log");
  }
  return logFile;
}

function log(msg: string) {
  const line = `${new Date().toISOString()} [sidecar] ${msg}\n`;
  process.stdout.write(line);
  fs.appendFileSync(getLogFile(), line);
}

function getBackendPath(): string {
  if (app.isPackaged) {
    const resourcesPath = process.resourcesPath;
    const backendDir = path.join(resourcesPath, "backend");
    const exe =
      process.platform === "win32" ? "DonnaBackend.exe" : "DonnaBackend";
    return path.join(backendDir, exe);
  }
  // Dev mode: use venv Python if available, fall back to system python3
  const projectRoot = path.join(app.getAppPath(), "..");
  const venvPython =
    process.platform === "win32"
      ? path.join(projectRoot, ".venv", "Scripts", "python.exe")
      : path.join(projectRoot, ".venv", "bin", "python3");
  if (fs.existsSync(venvPython)) {
    return venvPython;
  }
  return "python3";
}

function getBackendArgs(): string[] {
  if (app.isPackaged) {
    return ["--port", String(backendPort)];
  }
  // Dev mode: run run_production.py directly
  const scriptPath = path.join(app.getAppPath(), "..", "run_production.py");
  return [scriptPath, "--port", String(backendPort)];
}

async function findFreePort(startPort: number): Promise<number> {
  for (let port = startPort; port < startPort + 100; port++) {
    const free = await new Promise<boolean>((resolve) => {
      const server = net.createServer();
      server.once("error", () => resolve(false));
      server.once("listening", () => {
        server.close(() => resolve(true));
      });
      server.listen(port, "127.0.0.1");
    });
    if (free) return port;
  }
  throw new Error("No free port found");
}

export async function startBackend(): Promise<number> {
  backendPort = await findFreePort(8000);
  log(`Starting backend on port ${backendPort}`);

  const backendPath = getBackendPath();
  const args = getBackendArgs();

  log(`Backend path: ${backendPath}`);
  log(`Backend args: ${args.join(" ")}`);

  pythonProcess = spawn(backendPath, args, {
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      TIMETRACK_PORT: String(backendPort),
    },
  });

  pythonProcess.stdout?.on("data", (data: Buffer) => {
    const text = data.toString().trim();
    if (text) log(`[backend] ${text}`);
  });

  pythonProcess.stderr?.on("data", (data: Buffer) => {
    const text = data.toString().trim();
    if (text) log(`[backend:err] ${text}`);
  });

  pythonProcess.on("error", (err) => {
    log(`Backend process error: ${err.message}`);
  });

  pythonProcess.on("exit", (code, signal) => {
    log(`Backend exited: code=${code}, signal=${signal}`);
    pythonProcess = null;

    if (intentionalShutdown) return;

    if (restartCount < MAX_RESTARTS) {
      restartCount++;
      log(`Auto-restarting backend (attempt ${restartCount}/${MAX_RESTARTS})`);
      setTimeout(() => startBackend(), 2000);
    } else {
      log("Backend crashed too many times, giving up");
      dialog.showErrorBox(
        "Donna Error",
        `The backend service keeps crashing.\n\nCheck the log file at:\n${getLogFile()}`
      );
    }
  });

  await waitForReady();
  restartCount = 0; // Reset on successful start
  return backendPort;
}

async function waitForReady(timeoutMs = 15000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const ok = await new Promise<boolean>((resolve) => {
        const req = http.get(
          `http://127.0.0.1:${backendPort}/api/init`,
          { timeout: 2000 },
          (res) => {
            res.resume();
            resolve(res.statusCode === 200);
          }
        );
        req.on("error", () => resolve(false));
        req.on("timeout", () => {
          req.destroy();
          resolve(false);
        });
      });
      if (ok) {
        log("Backend is ready");
        return;
      }
    } catch {
      // Not ready yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("Backend failed to start within timeout");
}

export async function stopBackend(): Promise<void> {
  if (!pythonProcess) return;

  intentionalShutdown = true;
  log("Stopping backend...");

  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      log("Backend shutdown timeout, force killing");
      pythonProcess?.kill("SIGKILL");
      pythonProcess = null;
      resolve();
    }, 5000);

    pythonProcess!.once("exit", () => {
      clearTimeout(timeout);
      pythonProcess = null;
      log("Backend stopped");
      resolve();
    });

    if (process.platform === "win32") {
      pythonProcess!.kill();
    } else {
      pythonProcess!.kill("SIGTERM");
    }
  });
}

export function getPort(): number {
  return backendPort;
}
