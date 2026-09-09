import chalk from "chalk";
import ora from "ora";
import { analyzeGitHubRepo } from "@breakguard/core";

export interface RepoCommandOptions {
  token?: string;
  json?: boolean;
}

export async function repoCommand(repoUrlOrSlug: string, options: RepoCommandOptions = {}) {
  const spinner = ora({
    text: `Connecting to GitHub API for "${repoUrlOrSlug}"...`,
    color: "cyan",
  }).start();

  try {
    const report = await analyzeGitHubRepo(repoUrlOrSlug, {
      token: options.token,
      onProgress: (msg) => {
        spinner.text = msg;
      },
    });

    spinner.succeed(chalk.green("GitHub Repository QA Analysis complete!\n"));

    if (options.json) {
      console.log(JSON.stringify(report, null, 2));
      return;
    }

    const { repo, languages, commits, pullRequests, qaScore, dependencies } = report;

    // Header & Summary Box
    console.log(chalk.bold.cyan("🛡️  BreakGuard — GitHub Repository QA & Health Report"));
    console.log(chalk.gray("━".repeat(70)));
    console.log(`${chalk.bold("Repository:")}   ${chalk.white.bold(repo.fullName)} (${repo.htmlUrl})`);
    console.log(`${chalk.bold("Description:")}  ${chalk.gray(repo.description)}`);
    console.log(
      `${chalk.bold("License:")}      ${repo.license ? chalk.green(repo.license) : chalk.yellow("None")}` +
        `    ${chalk.bold("Default Branch:")} ${chalk.cyan(repo.defaultBranch)}`
    );
    console.log(
      `${chalk.bold("Community:")}    ⭐ ${chalk.yellow(repo.stars.toLocaleString())} stars  │  🍴 ${chalk.cyan(
        repo.forks.toLocaleString()
      )} forks  │  ⚠️ ${chalk.red(repo.openIssuesCount.toLocaleString())} open issues`
    );
    console.log(chalk.gray("━".repeat(70)));

    // QA Score Badge
    const scoreColor =
      qaScore.totalScore >= 80 ? chalk.green.bold : qaScore.totalScore >= 60 ? chalk.yellow.bold : chalk.red.bold;
    console.log(`\n${chalk.bold("⭐ Overall QA Health Score:")} ${scoreColor(`${qaScore.totalScore}/100 [Grade: ${qaScore.grade}]`)}`);
    console.log(
      `   • Maintenance Activity:    ${chalk.cyan(`${qaScore.maintenanceScore}/25`)} (Last commit: ${commits.lastCommitDate.slice(0, 10)})`
    );
    console.log(
      `   • Issue & PR Health:       ${chalk.cyan(`${qaScore.issueResolutionScore}/25`)} (PR Merge Rate: ${pullRequests.mergeRatePercent}%)`
    );
    console.log(
      `   • Docs & License:          ${chalk.cyan(`${qaScore.documentationScore}/20`)}`
    );
    console.log(
      `   • Dependency Freshness:    ${chalk.cyan(`${qaScore.dependencyRiskScore}/30`)} (${dependencies.totalDirectDependencies} direct packages)`
    );

    // Languages
    const langEntries = Object.entries(languages);
    if (langEntries.length > 0) {
      console.log(`\n${chalk.bold.magenta("🌐 Language Breakdown:")}`);
      const langStr = langEntries
        .slice(0, 5)
        .map(([name, data]) => `${chalk.white(name)}: ${chalk.cyan(data.percentage + "%")}`)
        .join("  │  ");
      console.log(`   ${langStr}`);
    }

    // Dependencies
    if (dependencies.dependenciesList.length > 0) {
      console.log(`\n${chalk.bold.blue("📦 Direct Dependencies Manifest (package.json):")}`);
      const depListPreview = dependencies.dependenciesList
        .slice(0, 8)
        .map((d) => `${chalk.white(d.name)} ${chalk.gray(d.versionSpec)}`)
        .join(", ");
      console.log(`   ${depListPreview}${dependencies.dependenciesList.length > 8 ? chalk.gray(" ... and more") : ""}`);
    }

    // Highlights
    if (qaScore.highlights.length > 0) {
      console.log(`\n${chalk.bold.green("✨ QA Highlights:")}`);
      for (const h of qaScore.highlights) {
        console.log(`   ${chalk.green("✔")} ${h}`);
      }
    }

    // Warnings
    if (qaScore.warnings.length > 0) {
      console.log(`\n${chalk.bold.yellow("⚠️ Actionable QA Recommendations:")}`);
      for (const w of qaScore.warnings) {
        console.log(`   ${chalk.yellow("!")} ${w}`);
      }
    }

    // Official Badge Markdown
    console.log(`\n${chalk.bold.cyan("🏷️ Official GitHub README Badge Markdown:")}`);
    console.log(chalk.gray("   (Copy and paste this into your repository README.md)"));
    console.log(`   ${chalk.green(qaScore.badgeMarkdown)}\n`);

  } catch (err: any) {
    spinner.fail(chalk.red("GitHub Repository QA Analysis failed."));
    console.error(chalk.red(`\nError: ${err.message}\n`));
  }
}
