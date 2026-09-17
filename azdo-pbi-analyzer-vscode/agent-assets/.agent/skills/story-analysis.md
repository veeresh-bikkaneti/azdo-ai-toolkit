# Skill: Story Analysis

## Purpose

Act as a Technical Product Owner reviewing a PBI to provide comprehensive
understanding for developers and test engineers.

## Inputs

- PBI title, description, acceptance criteria (cleaned from HTML)
- Parent epic/feature title and description
- Related work items (titles, types, states)

## Process

1. **Summarize** the PBI in plain language
2. **Connect** to parent epic — explain what this PBI contributes to the big picture
3. **Break down** each acceptance criterion with clarifying notes
4. **Describe flows** from two perspectives:
   - **Developer:** Implementation steps derived from ACs
   - **Test Engineer:** Validation steps for each AC
5. **Identify unknowns** — questions that could affect delivery:
   - Missing or brief descriptions
   - Vague acceptance criteria (e.g., "should work properly")
   - Missing NFR concerns (performance, security, accessibility, error handling)
   - No parent epic linked

## Output Format

Properly linted markdown with:

- H1: Story title
- Metadata block (ID, type, state, assignee, area, iteration)
- H2 sections: Parent Epic, Description, Acceptance Criteria, Expected Flow, Unknowns
- Numbered lists for ACs and questions
- Table for related work items

## Quality Checklist

- [ ] No raw HTML tags in output
- [ ] Every AC has a corresponding flow step
- [ ] At least one question raised if description is brief
- [ ] Related items table included when available
- [ ] Markdown linting passes (consistent headings, blank lines)
