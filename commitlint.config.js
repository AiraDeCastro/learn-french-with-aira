/**
 * Conventional Commits (https://www.conventionalcommits.org/) enforced via
 * the commit-msg hook in .husky/commit-msg. Format:
 *
 *   <type>(<optional scope>): <subject>
 *
 * e.g. "feat(reader): add tap-to-translate word lookup"
 *      "fix(streak): correct timezone used for daily reset"
 *      "chore(deps): bump prisma to 7.10.0"
 */
module.exports = {
  extends: ["@commitlint/config-conventional"],
};
