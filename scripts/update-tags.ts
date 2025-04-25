import * as core from "@actions/core"
import { exec } from "@actions/exec"
import { findPackages } from "find-packages"
import semver from "semver"

async function main() {
  const packages = await findPackages("./")
  const { version } = packages[0].manifest

  if (!version) {
    core.warning("Version is undefined.")
    return
  }

  core.info(`Detected version: ${version}`)

  const tag = `v${version}`
  const major = `v${semver.major(version)}`
  const minor = `v${semver.major(version)}.${semver.minor(version)}`

  core.info("Detaching branch....")
  await exec("git", ["checkout", "--detach"])
  await exec("git", ["add", "--force", "dist"])
  await exec("git", ["commit", "-m", tag, "--quiet"])

  core.info(`Push to ${major}...`)
  await exec("git", ["push", "--force", "origin", `HEAD:refs/heads/${major}`])

  core.info("Creating tags...")
  await exec("git", ["tag", tag, "--force"])
  await exec("git", ["tag", minor, "--force"])
  await exec("git", ["tag", major, "--force"])

  core.info("Push tags...")
  await exec("git", ["push", "--force", "origin", major])
  await exec("git", ["push", "--force", "origin", minor])
  await exec("git", ["push", "--force", "origin", tag])

  core.summary.addHeading("Generate version tags", "2")
  core.summary.addRaw(`Push commit and tags to \`${major}\` branch.`)
  core.summary.addBreak()
  core.summary.addTable([
    [
      { data: "type", header: true },
      { data: "value", header: true },
    ],
    ["major", major],
    ["minor", minor],
    ["patch", tag],
  ])
  core.summary.write()
}

main()
