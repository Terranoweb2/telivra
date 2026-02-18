import { NextRequest, NextResponse } from "next/server";
import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

const DEPLOY_SECRET = process.env.DEPLOY_SECRET || "8825d84896081a6e606bdff3c81f336f4053c551eb800fa0d32ccc77cba7f596";

async function run(cmd: string, cwd: string, timeoutMs = 300000) {
  const { stdout, stderr } = await execAsync(cmd, {
    cwd,
    timeout: timeoutMs,
    env: { ...process.env, PATH: process.env.PATH + ":/usr/local/bin:/usr/bin" },
  });
  return { stdout: stdout.trim(), stderr: stderr.trim() };
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-deploy-secret") || req.nextUrl.searchParams.get("secret");

  if (secret !== DEPLOY_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const APP_DIR = process.cwd();
  const logs: string[] = [];
  const log = (msg: string) => {
    console.log(`[Deploy] ${msg}`);
    logs.push(msg);
  };

  try {
    log("Starting deployment...");

    // 1. Git pull
    log("Pulling latest code...");
    const pull = await run("git fetch origin && git reset --hard origin/claude/analyze-project-8IHsf", APP_DIR);
    log(`Git: ${pull.stdout}`);

    // 2. Install dependencies
    log("Installing dependencies...");
    const install = await run("npm ci --production=false 2>/dev/null || npm install", APP_DIR, 180000);
    log(`npm: done (${install.stdout.split("\n").length} lines)`);

    // 3. Prisma
    log("Generating Prisma client...");
    await run("npx prisma generate", APP_DIR);
    log("Prisma generate: done");

    log("Pushing DB schema...");
    await run("npx prisma db push --accept-data-loss", APP_DIR, 60000);
    log("Prisma db push: done");

    // 4. Build
    log("Building Next.js (this takes a while)...");
    const build = await run("NODE_ENV=production npm run build", APP_DIR, 300000);
    log(`Build: done`);

    // 5. Restart PM2
    log("Restarting PM2...");
    await run("pm2 restart t-delivery || pm2 start ecosystem.config.js", APP_DIR);
    log("PM2 restarted");

    log("Deployment complete!");

    return NextResponse.json({ success: true, logs }, { status: 200 });
  } catch (error: any) {
    log(`ERROR: ${error.message}`);
    return NextResponse.json(
      { success: false, logs, error: error.message },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-deploy-secret") || req.nextUrl.searchParams.get("secret");

  if (secret !== DEPLOY_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    status: "ready",
    message: "POST to this endpoint with x-deploy-secret header to trigger deployment",
  });
}
