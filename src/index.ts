import * as core from "@actions/core"
import * as github from "@actions/github"

import { isCommitState, setupOctokit } from "./utils"

async function main() {
  const state = core.getInput("status", { required: true })
  const sha = core.getInput("sha", { required: true })
  const context = core.getInput("context") || github.context.workflow
  const description = core.getInput("description")
  const githubToken = process.env.GITHUB_TOKEN ?? core.getInput("github_token")

  const { owner, repo } = github.context.repo
  const target_url = `https://github.com/${owner}/${repo}/actions/runs/${process.env.GITHUB_RUN_ID}`

  if (!githubToken) {
    core.setFailed("Please add the GITHUB_TOKEN")
    return
  }

  if (!isCommitState(state)) {
    core.setFailed(
      'Unexpected state value. State value need to be ("error", "failure", "pending", "success"),',
    )
    return
  }

  const octokit = setupOctokit(githubToken)

  await octokit.rest.repos.createCommitStatus({
    allowForks: false,
    context,
    description,
    owner,
    repo,
    sha,
    state,
    target_url,
  })
}

main().catch((error) => {
  core.error(error as string)
  core.setFailed("Unexpected error, something wrong.")
})
