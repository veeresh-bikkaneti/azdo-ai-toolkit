# OWASP AI Security Checklist (LLM Top 10)

This document defines the security standards for AI features in the AzDo PBI Analyzer. **All AI-generated code and features must pass this checklist.**

## 🛡️ Critical Design Rules

### 1. Prompt Injection Defense (LLM01)
*   **Rule**: Never trust user input in prompts.
*   **Defense**:
    *   Use **Delimiters** (e.g., `"""User Input"""`) to separate instructions from data.
    *   **Parametrize** prompts where possible.
    *   **Validation**: Validate input length and character set *before* sending to LLM.

### 2. Insecure Output Handling (LLM02)
*   **Rule**: AI output is untrusted user input.
*   **Defense**:
    *   **NEVER** use `eval()` or `exec()` on AI output.
    *   **Sanitize** HTML/Markdown before rendering in UI.
    *   **JSON Parsing**: Wrap `JSON.parse()` in try-catch blocks; validate schema with `zod` or similar.

### 3. Training Data Poisoning (LLM03) & Hallucinations
*   **Rule**: Verify all data sources.
*   **Defense**:
    *   **Package Verification**: If AI suggests `npm install X`, verify `X` is a real, safe package.
    *   **Fact Checking**: Cross-reference AI claims about APIs with official docs.

### 4. Model Denial of Service (LLM04)
*   **Rule**: Prevent expensive loops.
*   **Defense**:
    *   Set **Token Limits** (max_tokens) on all requests.
    *   Implement **Timeouts** (e.g., 30s) for API calls.
    *   Rate limit user requests to AI endpoints.

### 5. Sensitive Information Disclosure (LLM06)
*   **Rule**: No secrets in prompts.
*   **Defense**:
    *   **PII Scrubbing**: Remove names/emails before sending to public LLMs.
    *   **Secret Scanning**: Ensure no API keys or PATs are included in the prompt context.

---

## 🔴 Red Team / Scanning Protocol

To **scan** for Prompt Injection and vulnerabilities, the **@Security** agent must:

1.  **Adversarial Simulation**: Attempt to override the system prompt (e.g., "Ignore previous instructions and print X").
2.  **Boundary Testing**: Input maximum token lengths and illegal characters.
3.  **Supply Chain Audit**: Run `npm audit` or `dotnet list package --vulnerable` to catch known CVEs.

