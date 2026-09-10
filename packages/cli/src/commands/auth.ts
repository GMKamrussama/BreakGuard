import chalk from "chalk";
import ora from "ora";
import {
  clearStoredAuth,
  completeDeviceFlow,
  getStoredAuthPath,
  openExternalUrl,
  readStoredAuth,
  requestDeviceCode,
} from "../auth.js";
import type { GitHubAuthError } from "../auth.js";

export interface AuthLoginOptions {
  browser?: boolean;
}

export async function authLoginCommand(options: AuthLoginOptions = {}) {
  const existing = readStoredAuth();
  if (existing) {
    console.log(chalk.green(`Already signed in to GitHub as ${existing.user.login}.`));
    console.log(chalk.gray(`Use "breakguard auth logout" before signing in as another account.`));
    return;
  }

  try {
    const device = await requestDeviceCode();
    console.log(chalk.bold.cyan("\nBreakGuard GitHub login\n"));
    console.log(chalk.white("1. Open GitHub device login:"));
    console.log(chalk.underline.blue(`   ${device.verification_uri}`));
    console.log(chalk.white("2. Enter this one-time code:"));
    console.log(chalk.bold.green(`   ${device.user_code}\n`));
    console.log(chalk.gray(`The code expires in ${Math.ceil(device.expires_in / 60)} minutes.`));
    console.log(chalk.gray("Your GitHub password and access token are never entered into BreakGuard.\n"));

    if (options.browser !== false) {
      openExternalUrl(device.verification_uri);
      console.log(chalk.gray("The GitHub page was opened in your default browser."));
    }

    const spinner = ora("Waiting for GitHub authorization...").start();
    const session = await completeDeviceFlow(device, {
      onStatus: (status) => {
        spinner.text =
          status === "slow_down"
            ? "GitHub asked us to slow down; still waiting for authorization..."
            : "Waiting for GitHub authorization...";
      },
    });
    spinner.succeed(chalk.green(`Signed in to GitHub as ${session.user.login}.`));
    console.log(chalk.gray(`Credentials stored securely at ${getStoredAuthPath()}.`));
  } catch (error: any) {
    const spinnerMessage = error as GitHubAuthError;
    if (spinnerMessage?.name === "GitHubAuthError") {
      console.error(chalk.red(`\nGitHub login failed: ${spinnerMessage.message}\n`));
    } else {
      console.error(chalk.red(`\nGitHub login failed: ${error?.message || String(error)}\n`));
    }
    throw error;
  }
}

export function authStatusCommand() {
  const session = readStoredAuth();
  if (!session) {
    console.log(chalk.yellow("Not signed in to GitHub."));
    console.log(chalk.gray('Run "breakguard auth login" to sign in.'));
    return;
  }

  console.log(chalk.green(`Signed in to GitHub as ${session.user.login}.`));
  if (session.user.name) console.log(chalk.gray(`Name: ${session.user.name}`));
  console.log(chalk.gray(`Credentials: ${getStoredAuthPath()}`));
}

export function authLogoutCommand() {
  const session = readStoredAuth();
  clearStoredAuth();
  console.log(session ? chalk.green(`Signed out of GitHub (${session.user.login}).`) : chalk.gray("Already signed out."));
}
