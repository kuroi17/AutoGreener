/**
 * GitHub Actions Workflow Generator
 * Generates YAML workflow files for scheduled Git pushes
 */

/**
 * Convert push_time to cron expression
 * @param {string} pushTime - ISO 8601 datetime string (e.g., "2024-03-15T14:30:00")
 * @returns {string} - Cron expression (e.g., "30 14 15 3 *")
 */
function convertToCronExpression(pushTime) {
  const date = new Date(pushTime);

  const minute = date.getUTCMinutes();
  const hour = date.getUTCHours();
  const dayOfMonth = date.getUTCDate();
  const month = date.getUTCMonth() + 1; // Months are 0-indexed

  // GitHub Actions cron format: minute hour day month day-of-week
  // For one-time execution, we specify exact date
  return `${minute} ${hour} ${dayOfMonth} ${month} *`;
}

/**
 * Generate GitHub Actions workflow YAML content
 * @param {Object} options - Workflow configuration
 * @param {string} options.scheduleId - Unique schedule ID
 * @param {string} options.repoName - Repository name
 * @param {string} options.branch - Target branch
 * @param {string} options.pushTime - ISO datetime for push
 * @param {string} options.commitMessage - Custom commit message (optional)
 * @returns {string} - YAML workflow content
 */
function generateWorkflowYAML(options) {
  const { scheduleId, repoName, branch, pushTime, commitMessage, pushCount } =
    options;

  const cronExpression = convertToCronExpression(pushTime);
  const workflowName = `PushClock Schedule ${scheduleId}`;
  const defaultMessage = `Automated commit by PushClock - ${new Date(pushTime).toLocaleString()}`;
  const message = commitMessage || defaultMessage;
  const safePushCount = Math.min(Math.max(Number(pushCount) || 1, 1), 20);
  const escapedMessage = message.replaceAll('"', '\\"');

  const yaml = `name: ${workflowName}

on:
  schedule:
    # Runs at ${new Date(pushTime).toLocaleString()} UTC
    - cron: '${cronExpression}'
  workflow_dispatch: # Allows manual trigger

permissions:
  contents: write

jobs:
  auto-commit:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        with:
          ref: ${branch}
          token: \${{ secrets.GITHUB_TOKEN }}
          persist-credentials: true
          fetch-depth: 0
      
      - name: Configure Git
        run: |
          git config user.name "\${{ github.repository_owner }}"
          git config user.email "\${{ github.repository_owner }}@users.noreply.github.com"
          git config --global --add safe.directory "\${{ github.workspace }}"
      
      - name: Create automated commit
        run: |
          set -e
          mkdir -p autogreener
          author_name="\${{ github.repository_owner }}"
          author_email="\${{ github.repository_owner }}@users.noreply.github.com"
          for i in $(seq 1 ${safePushCount}); do
            timestamp="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
            nonce="$(date -u +%s%N)-${"$"}RANDOM-${"$"}i"
            echo "schedule=${scheduleId} repo=${repoName} branch=${branch} run=${"$"}{GITHUB_RUN_ID} attempt=${"$"}i/${safePushCount} at=${"$"}timestamp nonce=${"$"}nonce" >> autogreener/activity.log
            echo "${"$"}timestamp ${"$"}nonce" > autogreener/run-${"$"}{GITHUB_RUN_ID}-${"$"}i.txt
            git add -A autogreener
            GIT_AUTHOR_NAME="${"$"}author_name" GIT_AUTHOR_EMAIL="${"$"}author_email" GIT_COMMITTER_NAME="${"$"}author_name" GIT_COMMITTER_EMAIL="${"$"}author_email" GIT_AUTHOR_DATE="${"$"}timestamp" GIT_COMMITTER_DATE="${"$"}timestamp" git commit --allow-empty -m "${escapedMessage} (#${"$"}i/${safePushCount})"
            sleep 1
          done
      
      - name: Push changes
        run: |
          git push origin HEAD:${branch}
`;

  return yaml;
}

/**
 * Generate workflow file name for a schedule
 * @param {string} scheduleId - Unique schedule ID
 * @returns {string} - Workflow file name
 */
function getWorkflowFileName(scheduleId) {
  return `pushclock-schedule-${scheduleId}.yml`;
}

/**
 * Get workflow file path in repository
 * @param {string} scheduleId - Unique schedule ID
 * @returns {string} - Full path to workflow file
 */
function getWorkflowFilePath(scheduleId) {
  return `.github/workflows/${getWorkflowFileName(scheduleId)}`;
}

/**
 * Generate complete workflow configuration
 * @param {Object} schedule - Schedule object from database
 * @returns {Object} - Workflow configuration
 */
function generateWorkflowConfig(schedule) {
  const workflowYAML = generateWorkflowYAML({
    scheduleId: schedule.id,
    repoName: schedule.repo_name,
    branch: schedule.branch,
    pushTime: schedule.push_time,
    commitMessage: schedule.commit_message,
    pushCount: schedule.push_count,
  });

  return {
    fileName: getWorkflowFileName(schedule.id),
    filePath: getWorkflowFilePath(schedule.id),
    content: workflowYAML,
    branch: schedule.branch,
  };
}

module.exports = {
  convertToCronExpression,
  generateWorkflowYAML,
  getWorkflowFileName,
  getWorkflowFilePath,
  generateWorkflowConfig,
};
