# PBI Analyzer — Memory

## Context

This extension connects to Azure DevOps to analyze Product Backlog Items (PBIs)
and generate structured test artifacts.

## Key Decisions

- **PAT Resolution:** `.env` file → VS Code secrets → user prompt
- **Tag System:** smoke (UI/display), critical (auth/security/data), non-regression (default)
- **Automation Scope:** Only smoke and critical scenarios get pseudo-code
- **Output Format:** All artifacts are properly linted markdown
- **Folder Structure:** `pbi/{id}/` in workspace root

## Azure DevOps Field Mapping

| Field | API Key | Notes |
| --- | --- | --- |
| Title | `System.Title` | Plain text |
| Description | `System.Description` | Returns HTML, must strip |
| Acceptance Criteria | `Microsoft.VSTS.Common.AcceptanceCriteria` | Returns HTML, must parse |
| Type | `System.WorkItemType` | PBI, Bug, Task, etc. |
| State | `System.State` | New, Active, Closed, etc. |
| Assigned To | `System.AssignedTo` | Object with `displayName` |
| Area Path | `System.AreaPath` | Hierarchy string |
| Iteration Path | `System.IterationPath` | Sprint path |
| Parent Link | `System.LinkTypes.Hierarchy-Reverse` | In relations array |

## HTML Parsing Strategy

Azure DevOps returns rich HTML in description and AC fields. The parsing uses
three strategies in order:

1. **Extract `<li>` items** — Works for ordered/unordered lists
2. **Split on block elements** — `</div>`, `</p>`, `<br>` as line separators
3. **Single criterion fallback** — Treat entire content as one criterion

## Vague Language Detection

These patterns trigger questions in the Unknowns section:

- "should work", "properly", "correctly", "as expected", "appropriate"

## NFR Keywords Checked

If these are absent from description + ACs, a question is raised:

- performance, security, accessibility, error, validation, logging
