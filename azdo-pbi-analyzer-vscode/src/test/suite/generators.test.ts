import * as assert from 'assert';
import { ManualTestGenerator } from '../../generators/ManualTestGenerator';
import { TestScenarioGenerator, TestScenario } from '../../generators/TestScenarioGenerator';
import { GherkinGenerator } from '../../generators/GherkinGenerator';
import { CypressGenerator } from '../../generators/CypressGenerator';
import { PlaywrightGenerator } from '../../generators/PlaywrightGenerator';
import { PbiAnalyzer } from '../../analyzers/PbiAnalyzer';

suite('Generators Test Suite', () => {
    // --- HTML Stripping ---

    test('PbiAnalyzer.stripHtml removes tags and decodes entities', () => {
        const analyzer = new PbiAnalyzer();
        const result = analyzer.stripHtml(
            '<p>Hello &amp; <strong>world</strong></p><br/><div>Line&nbsp;2</div>'
        );
        assert.ok(!result.includes('<'));
        assert.ok(!result.includes('&amp;'));
        assert.ok(!result.includes('&nbsp;'));
        assert.ok(result.includes('Hello & world'));
        assert.ok(result.includes('Line 2'));
    });

    test('PbiAnalyzer.stripHtml handles empty input', () => {
        const analyzer = new PbiAnalyzer();
        assert.strictEqual(analyzer.stripHtml(''), '');
        assert.strictEqual(analyzer.stripHtml(null as any), '');
    });

    test('PbiAnalyzer.stripHtml handles Azure DevOps rich text', () => {
        const analyzer = new PbiAnalyzer();
        const azureHtml =
            '<div>As a user</div><div>I want to login</div><div><br></div><div>So that I can access the dashboard</div>';
        const result = analyzer.stripHtml(azureHtml);
        assert.ok(result.includes('As a user'));
        assert.ok(result.includes('I want to login'));
        assert.ok(result.includes('access the dashboard'));
        assert.ok(!result.includes('<div>'));
    });

    // --- AC Parsing ---

    test('PbiAnalyzer.parseAcceptanceCriteria extracts <li> items', () => {
        const analyzer = new PbiAnalyzer();
        const html = '<ul><li>User can login with valid credentials</li><li>User sees error for invalid credentials</li></ul>';
        const result = analyzer.parseAcceptanceCriteria(html);
        assert.strictEqual(result.length, 2);
        assert.ok(result[0].includes('User can login'));
        assert.ok(result[1].includes('User sees error'));
    });

    test('PbiAnalyzer.parseAcceptanceCriteria handles <div> fallback', () => {
        const analyzer = new PbiAnalyzer();
        const html = '<div>First criterion here</div><div>Second criterion here</div>';
        const result = analyzer.parseAcceptanceCriteria(html);
        assert.ok(result.length >= 2);
        assert.ok(result[0].includes('First criterion'));
    });

    test('PbiAnalyzer.parseAcceptanceCriteria handles empty input', () => {
        const analyzer = new PbiAnalyzer();
        assert.deepStrictEqual(analyzer.parseAcceptanceCriteria(''), []);
    });

    // --- Tag Assignment ---

    test('TestScenarioGenerator assigns critical tag for auth criteria', () => {
        const generator = new TestScenarioGenerator();
        const scenarios = generator.generate(['User can login with credentials']);
        assert.strictEqual(scenarios[0].tag, 'critical');
    });

    test('TestScenarioGenerator assigns smoke tag for display criteria', () => {
        const generator = new TestScenarioGenerator();
        const scenarios = generator.generate(['Dashboard should display user profile']);
        assert.strictEqual(scenarios[0].tag, 'smoke');
    });

    test('TestScenarioGenerator assigns non-regression for generic criteria', () => {
        const generator = new TestScenarioGenerator();
        const scenarios = generator.generate(['Items should be sorted alphabetically']);
        assert.strictEqual(scenarios[0].tag, 'non-regression');
    });

    test('TestScenarioGenerator generates scenarios with tags', () => {
        const generator = new TestScenarioGenerator();
        const criteria = ['User can login', 'User can logout'];
        const scenarios = generator.generate(criteria);

        assert.strictEqual(scenarios.length, 2);
        assert.ok(scenarios[0].title.includes('AC1'));
        assert.ok(scenarios[1].title.includes('AC2'));
        assert.ok(scenarios[0].tag);
        assert.ok(scenarios[1].tag);
    });

    // --- Manual Test Generator ---

    test('ManualTestGenerator generates markdown with summary table', () => {
        const generator = new ManualTestGenerator();
        const output = generator.generate('Test PBI', []);
        assert.ok(output.includes('# Manual Test Cases'));
        assert.ok(output.includes('**PBI:** Test PBI'));
    });

    test('ManualTestGenerator includes CSV block', () => {
        const generator = new ManualTestGenerator();
        const scenarios: TestScenario[] = [{
            title: 'Verify Login',
            steps: ['Enter username', 'Enter password', 'Click Login'],
            expected: 'Dashboard shown',
            tag: 'critical',
        }];

        const output = generator.generate('Test PBI', scenarios);
        assert.ok(output.includes('```csv'));
        assert.ok(output.includes('Test Case'));
        assert.ok(output.includes('Verify Login'));
    });

    test('ManualTestGenerator CSV has correct structure', () => {
        const generator = new ManualTestGenerator();
        const scenarios: TestScenario[] = [{
            title: 'Verify Login',
            steps: ['Enter username', 'Click Login'],
            expected: 'Dashboard shown',
            tag: 'smoke',
        }];

        const csv = generator.generateCsv(scenarios);
        const lines = csv.split('\n').filter((l) => l.trim().length > 0);

        // Header + 2 steps
        assert.strictEqual(lines.length, 3);

        const row1 = lines[1].split(',');
        assert.strictEqual(row1[1], 'Test Case');
    });

    test('ManualTestGenerator escapes special characters', () => {
        const generator = new ManualTestGenerator();
        const scenarios: TestScenario[] = [{
            title: 'Title, with comma',
            steps: ['Step "with quotes"'],
            expected: 'Expected\nmultiline',
            tag: 'non-regression',
        }];

        const output = generator.generate('Test', scenarios);
        assert.ok(output.includes('"Title, with comma"'));
        assert.ok(output.includes('"Step ""with quotes"""'));
    });

    // --- Gherkin Generator ---

    test('GherkinGenerator includes tag annotations', () => {
        const generator = new GherkinGenerator();
        const scenarios: TestScenario[] = [{
            title: 'Test Login',
            steps: ['enter credentials'],
            expected: 'user is logged in',
            tag: 'critical',
        }];

        const output = generator.generate('Auth Feature', scenarios);
        assert.ok(output.includes('@critical'));
        assert.ok(output.includes('Feature: Auth Feature'));
    });

    // --- Cypress Generator ---

    test('CypressGenerator generates pseudo-code for smoke/critical', () => {
        const generator = new CypressGenerator();
        const scenarios: TestScenario[] = [
            { title: 'Login test', steps: ['go to login'], expected: 'logged in', tag: 'critical' },
            { title: 'Sort test', steps: ['sort items'], expected: 'sorted', tag: 'non-regression' },
        ];

        const output = generator.generate('My Feature', scenarios);
        assert.ok(output.includes('Login test'));
        assert.ok(!output.includes('Sort test')); // non-regression excluded
        assert.ok(output.includes('cy.visit'));
    });

    // --- Playwright Generator ---

    test('PlaywrightGenerator generates pseudo-code for smoke/critical', () => {
        const generator = new PlaywrightGenerator();
        const scenarios: TestScenario[] = [
            { title: 'Login test', steps: ['go to login'], expected: 'logged in', tag: 'smoke' },
            { title: 'Sort test', steps: ['sort items'], expected: 'sorted', tag: 'non-regression' },
        ];

        const output = generator.generate('My Feature', scenarios);
        assert.ok(output.includes('Login test'));
        assert.ok(!output.includes('Sort test'));
        assert.ok(output.includes('page.goto'));
        assert.ok(output.includes('@playwright/test'));
    });
});
