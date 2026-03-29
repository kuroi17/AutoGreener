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
  const slotKey = new Date(pushTime)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(".000Z", "Z");
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
      
      - name: Resolve owner identity
        id: owner
        # Fetch the owner's numeric GitHub user ID via the API so we can build the
        # ID+username noreply email required for contribution graph attribution.
        # Falls back to the plain username format if the API call fails.
        run: |
          owner_name="\${{ github.repository_owner }}"
          api_response=$(curl -sf -H "Authorization: token \${{ secrets.GITHUB_TOKEN }}" "https://api.github.com/users/${"$"}owner_name") || true
          owner_id=$(echo "${"$"}api_response" | grep '"id":' | head -1 | grep -o '[0-9]*') || true
          if [ -z "${"$"}owner_id" ]; then
            echo "Warning: could not fetch owner ID, using plain noreply email"
            owner_email="${"$"}owner_name@users.noreply.github.com"
          else
            owner_email="${"$"}{owner_id}+${"$"}{owner_name}@users.noreply.github.com"
          fi
          echo "name=${"$"}owner_name" >> "${"$"}GITHUB_OUTPUT"
          echo "email=${"$"}owner_email" >> "${"$"}GITHUB_OUTPUT"
      
      - name: Configure Git
        run: |
          git config user.name "\${{ steps.owner.outputs.name }}"
          git config user.email "\${{ steps.owner.outputs.email }}"
          git config --global --add safe.directory "\${{ github.workspace }}"
      
      - name: Create automated commit
        run: |
          mkdir -p autogreener
          author_name="\${{ steps.owner.outputs.name }}"
          author_email="\${{ steps.owner.outputs.email }}"
          marker_file="autogreener/.pushclock-${scheduleId}-${slotKey}.done"
          if [ -f "${"$"}marker_file" ]; then
            echo "Schedule slot already executed (${scheduleId} @ ${slotKey}), skipping duplicate trigger"
            exit 0
          fi
          echo "schedule=${scheduleId} slot=${slotKey} created_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)" > "${"$"}marker_file"
          commit_errors=0
          for i in $(seq 1 ${safePushCount}); do
            timestamp="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
            # Portable unique nonce: run ID + attempt + loop index + random seed.
            nonce="${"$"}{GITHUB_RUN_ID}-${"$"}{GITHUB_RUN_ATTEMPT}-${"$"}i-${"$"}RANDOM"
            echo "schedule=${scheduleId} repo=${repoName} branch=${branch} run=${"$"}{GITHUB_RUN_ID} attempt=${"$"}i/${safePushCount} at=${"$"}timestamp nonce=${"$"}nonce" >> autogreener/activity.log
            echo "${"$"}timestamp ${"$"}nonce" > autogreener/run-${"$"}{GITHUB_RUN_ID}-${"$"}i.txt
            git add -A autogreener
            if GIT_AUTHOR_NAME="${"$"}author_name" GIT_AUTHOR_EMAIL="${"$"}author_email" GIT_COMMITTER_NAME="${"$"}author_name" GIT_COMMITTER_EMAIL="${"$"}author_email" GIT_AUTHOR_DATE="${"$"}timestamp" GIT_COMMITTER_DATE="${"$"}timestamp" git commit --allow-empty -m "${escapedMessage} (#${"$"}i/${safePushCount}) [schedule:${scheduleId}] [slot:${slotKey}]"; then
              echo "Commit ${"$"}i/${safePushCount} created"
            else
              echo "Warning: commit ${"$"}i/${safePushCount} failed" >&2
              commit_errors=$((commit_errors + 1))
            fi
            sleep 1
          done
          if [ "${"$"}commit_errors" -gt 0 ]; then
            echo "Warning: ${"$"}commit_errors commit(s) failed out of ${safePushCount}" >&2
          fi
      
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
