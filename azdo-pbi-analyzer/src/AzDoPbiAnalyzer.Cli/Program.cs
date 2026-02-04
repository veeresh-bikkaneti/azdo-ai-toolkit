using System.CommandLine;
using AzDoPbiAnalyzer.Core.Clients;
using AzDoPbiAnalyzer.Core.Analyzers;
using AzDoPbiAnalyzer.Core.Generators;
using AzDoPbiAnalyzer.Core.Models;
using AzDoPbiAnalyzer.Core.Utils;
using dotenv.net;

namespace AzDoPbiAnalyzer.Cli;

class Program
{
    static async Task<int> Main(string[] args)
    {
        // Load .env file if it exists (PAT and other secrets)
        DotEnv.Load(options: new DotEnvOptions(ignoreExceptions: true));
        var urlOption = new Option<string>(
            name: "--url", 
            description: "The Azure DevOps PBI URL")
        {
            IsRequired = true
        };

        var patOption = new Option<string>(
            name: "--pat",
            description: "Azure DevOps Personal Access Token");

        var outputOption = new Option<string>(
            name: "--output",
            description: "Output directory");
            
        outputOption.SetDefaultValue("./reports");
        outputOption.AddAlias("-o");

        var mockOption = new Option<bool>(
            name: "--mock",
            description: "Run in mock mode (no API connection)");

        var rootCommand = new RootCommand("Azure DevOps PBI Analyzer CLI");
        rootCommand.AddOption(urlOption);
        rootCommand.AddOption(patOption);
        rootCommand.AddOption(outputOption);
        rootCommand.AddOption(mockOption);

        rootCommand.SetHandler(async (string url, string pat, string output, bool mock) =>
        {
            await RunAnalysis(url, pat, output, mock);
        }, urlOption, patOption, outputOption, mockOption);

        return await rootCommand.InvokeAsync(args);
    }

    static async Task RunAnalysis(string url, string pat, string output, bool mock)
    {
        Console.WriteLine($"analyzing PBI: {url}");

        PBIData pbiData;

        if (mock)
        {
            Console.WriteLine("Running in MOCK mode");
            pbiData = new PBIData
            {
                Id = 12345,
                Title = "Mock PBI",
                Description = "As a user I want to do X so that Y. 1. Requirement A 2. Requirement B",
                AcceptanceCriteria = "- [ ] Deliverable 1\n- [ ] Deliverable 2",
                Priority = 1,
                State = "New",
                Tags = new() { "Mock", "Critical" },
                Relations = new List<WorkItemRelation> 
                { 
                    new() { Rel = "System.LinkTypes.Hierarchy-Forward", Url = "https://dev.azure.com/org/p/_apis/wit/workItems/12346" }, // Child
                    new() { Rel = "Microsoft.VSTS.Common.TestedBy-Forward", Url = "https://dev.azure.com/org/p/_apis/wit/workItems/12347" } // Test Case
                }
            };
        }
        else
        {
            if (string.IsNullOrEmpty(pat))
            {
                pat = Environment.GetEnvironmentVariable("AZURE_DEVOPS_PAT") ?? "";
            }

            if (string.IsNullOrEmpty(pat))
            {
                Console.WriteLine("Error: PAT is required.");
                Console.WriteLine("Please provide via:");
                Console.WriteLine("  1. --pat flag");
                Console.WriteLine("  2. AZURE_DEVOPS_PAT in .env file");
                Console.WriteLine("  3. AZURE_DEVOPS_PAT environment variable");
                Console.WriteLine("\nSee .env.example for template.");
                return;
            }

            try 
            {
                var metadata = UrlParser.Parse(url);
                Console.WriteLine($"Parsed: {metadata.Organization}/{metadata.Project} - Work Item #{metadata.WorkItemId}");
                
                var orgUrl = $"https://dev.azure.com/{metadata.Organization}";
                var client = new AzDoClient(orgUrl, pat);
                
                pbiData = await client.GetWorkItemAsync(metadata.WorkItemId);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error fetching PBI: {ex.Message}");
                return;
            }
        }
        
        // 1. Core Requirements Analysis
        var reqAnalyzer = new RequirementsAnalyzer();
        var requirements = reqAnalyzer.ExtractRequirements(pbiData);
        var deliverables = reqAnalyzer.ExtractDeliverables(pbiData);
        var isCritical = reqAnalyzer.IsCritical(pbiData);

        Console.WriteLine($"Found {requirements.Count} requirements and {deliverables.Count} deliverables.");

        // 2. Deep Analysis (Linked Items & Impact)
        var linker = new LinkedItemAnalyzer();
        var linkedItems = linker.ExtractLinkedItems(pbiData);
        Console.WriteLine($"Found {linkedItems.Count} linked items.");

        var impactAnalyzer = new ImpactAnalyzer();
        var impactReport = impactAnalyzer.AnalyzeImpact(pbiData, linkedItems);
        
        if (impactReport.IsSmokeCandidate) Console.WriteLine("🔥 SMOKE CANDIDATE IDENTIFIED");
        if (impactReport.RegressionCandidates.Any()) 
            Console.WriteLine($"⚠️  REGRESSION RISK: {impactReport.RegressionCandidates.Count} existing test cases may need updates.");

        // 3. Test Generation
        var generator = new TestGenerator();
        var (testCases, coverage) = generator.GenerateTestSuite(pbiData, requirements, deliverables, isCritical);

        Console.WriteLine($"Generated {testCases.Count} test cases.");
        foreach(var test in testCases)
        {
            Console.WriteLine($"- [{test.Id}] {test.Title} ({test.Priority})");
        }
        
        // TODO: Save to JSON/Markdown with full details (skipped for brevity)
    }
}
