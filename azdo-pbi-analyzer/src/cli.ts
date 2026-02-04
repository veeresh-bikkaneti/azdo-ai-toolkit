#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import * as fs from 'fs';
import * as path from 'path';
import { configManager, getConfig } from './config/config.js';
import { URLParser } from './utils/url-parser.js';
import { AzureDevOpsClient } from './api/azdo-client.js';
import { RequirementsAnalyzer } from './analyzers/requirements-analyzer.js';
import { TestGenerator } from './generators/test-generator.js';
import { MarkdownReporter } from './reporters/markdown-reporter.js';
import { AnalysisReport } from './models/pbi-data.js';
import { GherkinGenerator } from './generators/gherkin-generator.js';

// --- Secure Local Logger Helper ---
function logTransaction(status: string, details: string) {
    const logFilePath = path.join(process.cwd(), 'AzDo_PBI_Analyzer_Activity_Log.md');
    const timestamp = new Date().toISOString();
    const user = process.env.USERNAME || 'User';

    // Ensure header exists
    if (!fs.existsSync(logFilePath)) {
        const header = `| Timestamp | User | Status | Details |\n|---|---|---|---|\n`;
        fs.writeFileSync(logFilePath, header);
    }

    // Append log entry
    // Sanitize details to prevent breaking markdown table
    const safeDetails = details.replace(/\|/g, '-').replace(/\n/g, ' ');
    const entry = `| ${timestamp} | ${user} | **${status}** | ${safeDetails} |\n`;

    try {
        fs.appendFileSync(logFilePath, entry);
    } catch (error) {
        // Silent failure for logs to avoid loop
    }
}

const program = new Command();

program
    .name('azdo-pbi-analyzer')
    .description('Azure DevOps PBI analyzer and test case generator')
    .version('1.0.0');

program
    .argument('<pbi-url>', 'Azure DevOps PBI URL')
    .option('-o, --output <directory>', 'Output directory for reports', './reports')
    .option('--ai-enhance', 'Enable AI-enhanced test generation')
    .option('-v, --verbose', 'Verbose output')
    .action(async (pbiUrl: string, options) => {
        console.log(chalk.bold.cyan('\n🔍 Azure DevOps PBI Analyzer\n'));
        logTransaction('JOB_STARTED', `Analysis started for: ${pbiUrl}`);

        // Update config with options
        configManager.updateConfig({
            outputDirectory: options.output,
            enableAIEnhancement: options.aiEnhance || false,
            verbose: options.verbose || false,
        });

        // Validate config
        if (!configManager.validate()) {
            logTransaction('FAILURE', 'Configuration validation failed.');
            process.exit(1);
        }

        const config = getConfig();
        let spinner = ora();

        try {
            // Step 1: Parse URL
            spinner.start('Parsing PBI URL...');
            const metadata = URLParser.parse(pbiUrl);
            spinner.succeed(
                `Parsed: ${chalk.yellow(metadata.organization)}/${chalk.yellow(metadata.project)} - ` +
                `Work Item #${chalk.yellow(metadata.workItemId)}`
            );
            logTransaction('IN_PROGRESS', `Parsed PBI URL: ${metadata.organization}/${metadata.project} #${metadata.workItemId}`);

            // Step 2: Connect to Azure DevOps
            spinner.start('Connecting to Azure DevOps...');
            const orgUrl = `https://dev.azure.com/${metadata.organization}`;
            const client = new AzureDevOpsClient(orgUrl, config.azureDevOpsPAT);

            const connected = await client.testConnection();
            if (!connected) {
                throw new Error('Failed to connect to Azure DevOps. Check your PAT token.');
            }
            spinner.succeed('Connected to Azure DevOps');
            logTransaction('IN_PROGRESS', 'Connected to Azure DevOps successfully.');

            // Step 3: Fetch PBI data
            spinner.start(`Fetching PBI #${metadata.workItemId}...`);
            const pbiData = await client.getWorkItem(metadata.workItemId, metadata.project);
            spinner.succeed(`Fetched: ${chalk.green(pbiData.title)}`);

            if (config.verbose) {
                console.log(chalk.gray(`  Priority: ${pbiData.priority}, State: ${pbiData.state}`));
            }

            // Step 4: Fetch related items
            spinner.start('Fetching related work items...');
            const relatedItems = await client.getRelatedWorkItems(metadata.workItemId, metadata.project);
            pbiData.relatedItems = relatedItems;
            spinner.succeed(`Found ${chalk.yellow(relatedItems.length)} related items`);
            logTransaction('IN_PROGRESS', `Fetched ${relatedItems.length} related items.`);

            if (config.verbose && relatedItems.length > 0) {
                relatedItems.slice(0, 5).forEach(item => {
                    console.log(chalk.gray(`  - [${item.type}] ${item.title}`));
                });
                if (relatedItems.length > 5) {
                    console.log(chalk.gray(`  ... and ${relatedItems.length - 5} more`));
                }
            }

            // Step 5: Analyze requirements
            spinner.start('Analyzing requirements...');
            const analyzer = new RequirementsAnalyzer();
            const requirements = analyzer.extractRequirements(pbiData);
            const deliverables = analyzer.extractDeliverables(pbiData);
            const dependencies = analyzer.extractDependencies(pbiData);
            const isCritical = analyzer.isCritical(pbiData);
            spinner.succeed(
                `Analyzed: ${chalk.yellow(requirements.length)} requirements, ` +
                `${chalk.yellow(deliverables.length)} deliverables`
            );
            logTransaction('IN_PROGRESS', `Extracted ${requirements.length} requirements and ${deliverables.length} deliverables.`);

            // Step 6: Generate test cases
            spinner.start('Generating test cases and Gherkin scenarios...');

            const gherkinGenerator = new GherkinGenerator();
            // Generate Gherkin from requirements (or user story if available)
            const gherkinFeature = gherkinGenerator.generateFeature(
                pbiData.title,
                pbiData.description, // Often contains the user story
                requirements
            );
            const gherkinString = gherkinGenerator.toGherkinString(gherkinFeature);

            if (config.enableAIEnhancement) {
                console.log(chalk.yellow('  AI enhancement enabled (not yet implemented)'));
            }

            const testGenerator = new TestGenerator();
            const { testCases, coverage } = testGenerator.generateTestSuite(
                pbiData,
                requirements,
                deliverables,
                isCritical
            );

            const taggedTests = testGenerator.tagTests(testCases, pbiData);
            spinner.succeed(
                `Generated ${chalk.green(testCases.length)} test cases ` +
                `(${chalk.cyan(coverage.automationCandidates)} automation candidates)`
            );
            logTransaction('IN_PROGRESS', `Generated ${testCases.length} test cases with ${coverage.automationCandidates} automation candidates.`);

            if (config.verbose) {
                console.log(chalk.gray(`  Sanity: ${coverage.byCategoryCount.sanity}`));
                console.log(chalk.gray(`  Smoke: ${coverage.byCategoryCount.smoke}`));
                console.log(chalk.gray(`  Regression: ${coverage.byCategoryCount.regression}`));
                console.log(chalk.gray(`  E2E: ${coverage.byCategoryCount.e2e}`));
            }

            // Step 7: Create analysis report
            spinner.start('Generating report...');
            const report: AnalysisReport = {
                pbi: pbiData,
                metadata,
                requirements,
                deliverables,
                dependencies,
                testCases: taggedTests,
                coverage,
                testUpdateRecommendations: [], // Future implementation
                gherkin: gherkinString, // NEW: Added Gherkin data
                generatedAt: new Date().toISOString(),
            };

            // Step 8: Save report
            const reporter = new MarkdownReporter();
            const reportPath = await reporter.saveReport(report, config.outputDirectory);
            spinner.succeed(`Report saved: ${chalk.green(reportPath)}`);
            logTransaction('SUCCESS', `Report generated at: ${reportPath}`);

            // Summary
            console.log(chalk.bold.green('\n✅ Analysis Complete!\n'));
            console.log(chalk.bold('Summary:'));
            console.log(`  PBI: ${pbiData.title}`);
            console.log(`  Test Cases: ${testCases.length}`);
            console.log(`  Automation Ready: ${coverage.automationCandidates}`);
            console.log(`  Report: ${reportPath}\n`);

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            spinner.fail('Analysis failed');
            console.error(chalk.red('\n❌ Error:'), errorMessage);
            console.error(chalk.yellow('\nSee AzDo_PBI_Analyzer_Activity_Log.md for details.\n'));

            logTransaction('FAILURE', `Analysis failed: ${errorMessage}`);

            if (config.verbose && error instanceof Error && error.stack) {
                console.error(chalk.gray(error.stack));
            }

            // Allow finally block to run before exit
            process.exitCode = 1;

        } finally {
            logTransaction('JOB_COMPLETED', 'Analysis process terminated.');
        }
    });

program.parse();

