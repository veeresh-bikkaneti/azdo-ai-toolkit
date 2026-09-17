# Skill: Test Planning

## Purpose

Generate manual test cases from acceptance criteria in Azure DevOps Test Plan
bulk import format with proper tagging.

## Inputs

- PBI title
- Test scenarios with tags (smoke/critical/non-regression)

## Tag Assignment Rules

| Tag | Keywords | Priority |
| --- | --- | --- |
| `critical` | login, auth, password, payment, checkout, security, permission, role, access, token, session, encrypt, delete, remove, data loss | 1 |
| `smoke` | display, show, render, page load, navigate, view, visible, appear, open, launch, homepage, landing | 2 |
| `non-regression` | Everything else | 3 |

## Output Format

### Markdown Document

1. **Summary Table** — All test cases with tag, steps summary, expected result
2. **Detailed Test Cases** — Each TC with numbered steps and expected result
3. **CSV Block** — Azure DevOps bulk import compatible CSV in a fenced code block

### CSV Columns

```
ID, Work Item Type, Title, Test Step, Step Action, Step Expected, Priority, Assigned To, State, Tags
```

- Leave ID blank for new test cases
- First step row has Type=`Test Case`, Title, Priority, State=`Design`, Tags
- Subsequent step rows have only step number, action, and expected (on last step)

## Reference

- [Azure DevOps Bulk Import](https://learn.microsoft.com/en-us/azure/devops/test/bulk-import-export-test-cases?view=azure-devops)
