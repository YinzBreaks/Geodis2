import path from "node:path"
import { discoverContentIssues } from "../src/schemas/content-validation"

const root = path.resolve(process.cwd(), "content")
const issues = discoverContentIssues(root)

if (issues.length > 0) {
  console.error(`Content validation failed with ${issues.length} issue(s):`)
  for (const issue of issues) {
    console.error(`- ${issue.file}: ${issue.message}`)
  }
  process.exitCode = 1
} else {
  console.log("Content validation passed.")
}
