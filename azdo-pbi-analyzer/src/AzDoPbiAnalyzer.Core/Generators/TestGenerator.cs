using System;
using System.Collections.Generic;
using System.Linq;
using AzDoPbiAnalyzer.Core.Models;

namespace AzDoPbiAnalyzer.Core.Generators;

public class TestGenerator
{
    private readonly SanityTestTemplate _sanityTemplate = new();
    private readonly SmokeTestTemplate _smokeTemplate = new();
    private readonly RegressionTestTemplate _regressionTemplate = new();
    private readonly E2ETestTemplate _e2eTemplate = new();

    public (List<TestCase> TestCases, TestCoverageSummary Coverage) GenerateTestSuite(
        PBIData pbi, 
        List<string> requirements, 
        List<string> deliverables, 
        bool isCritical)
    {
        var testCases = new List<TestCase>();

        testCases.AddRange(_sanityTemplate.Generate(pbi, requirements));
        testCases.AddRange(_smokeTemplate.Generate(pbi, isCritical));
        testCases.AddRange(_regressionTemplate.Generate(pbi, requirements));
        testCases.AddRange(_e2eTemplate.Generate(pbi, deliverables));

        var taggedTests = TagTests(testCases, pbi);
        var coverage = CalculateCoverage(taggedTests);

        return (taggedTests, coverage);
    }

    private TestCoverageSummary CalculateCoverage(List<TestCase> testCases)
    {
        var byCategory = new Dictionary<TestCategory, int>();
        foreach (TestCategory cat in Enum.GetValues(typeof(TestCategory)))
        {
            byCategory[cat] = testCases.Count(t => t.Category == cat);
        }

        return new TestCoverageSummary(
            testCases.Count,
            byCategory,
            0,
            0,
            testCases.Count(t => t.AutomationCandidate)
        );
    }

    private List<TestCase> TagTests(List<TestCase> testCases, PBIData pbi)
    {
        var result = new List<TestCase>();
        foreach (var test in testCases)
        {
            var tags = new HashSet<string>(test.Tags);

            if (pbi.Priority == 1) tags.Add("p1");
            
            foreach (var tag in pbi.Tags.Take(2)) tags.Add(tag);

            var areaParts = pbi.AreaPath.Split('\\');
            if (areaParts.Length > 0)
            {
                tags.Add(areaParts.Last().ToLower().Replace(" ", "-"));
            }

            if ((test.Category == TestCategory.Smoke || test.Category == TestCategory.Sanity) && 
                !tags.Contains("automated"))
            {
                tags.Add("automation-ready");
            }

            result.Add(test with { Tags = tags.ToList() });
        }
        return result;
    }
}

// Templates

public class SanityTestTemplate
{
    public IEnumerable<TestCase> Generate(PBIData pbi, List<string> requirements)
    {
        var list = new List<TestCase>();
        
        list.Add(new TestCase
        {
            Id = $"SANITY-{pbi.Id}-001",
            Title = $"Verify {pbi.Title} - Feature Availability",
            Category = TestCategory.Sanity,
            Priority = TestPriority.High,
            Tags = new() { "sanity", "quick-check" },
            Steps = new() 
            {
                new(1, "Navigate to feature", "Feature accessible"),
                new(2, "Verify UI elements", "Elements visible"),
                new(3, "Check console", "No errors")
            },
            ExpectedResult = "Feature available",
            EstimatedTime = "2 minutes",
            AutomationCandidate = true
        });

        // Add more logic here mirroring the TS implementation...
        return list;
    }
}

public class SmokeTestTemplate
{
    public IEnumerable<TestCase> Generate(PBIData pbi, bool isCritical)
    {
        var list = new List<TestCase>();
        
        if (isCritical || pbi.Priority == 1)
        {
            list.Add(new TestCase
            {
                Id = $"SMOKE-{pbi.Id}-001",
                Title = $"Smoke Test: {pbi.Title} - Core Functionality",
                Category = TestCategory.Smoke,
                Priority = TestPriority.Critical,
                Tags = new() { "smoke", "critical", "automated" },
                Steps = new()
                {
                    new(1, "Execute critical flow", "Flow completes"),
                    new(2, "Verify response time", "<3s")
                },
                ExpectedResult = "Critical function works",
                EstimatedTime = "1 minute",
                AutomationCandidate = true
            });
        }
        
        return list;
    }
}

public class RegressionTestTemplate
{
    public IEnumerable<TestCase> Generate(PBIData pbi, List<string> requirements)
    {
        var list = new List<TestCase>();
        
        list.Add(new TestCase
        {
            Id = $"REGRESSION-{pbi.Id}-001",
            Title = $"Regression: {pbi.Title} - Basic Regression",
            Category = TestCategory.Regression,
            Priority = TestPriority.Medium,
            Tags = new() { "regression" },
            Steps = new() { new(1, "Verify existing functionality", "Works as before") },
            ExpectedResult = "No regressions",
            EstimatedTime = "5 minutes",
            AutomationCandidate = true
        });

        return list;
    }
}

public class E2ETestTemplate
{
    public IEnumerable<TestCase> Generate(PBIData pbi, List<string> deliverables)
    {
        var list = new List<TestCase>();
        
        list.Add(new TestCase
        {
            Id = $"E2E-{pbi.Id}-001",
            Title = $"E2E: {pbi.Title} - User Journey",
            Category = TestCategory.E2E,
            Priority = TestPriority.High,
            Tags = new() { "e2e", "journey" },
            Steps = deliverables.Select((d, i) => new TestStep(i + 1, $"Complete: {d}", "Success")).ToList(),
            ExpectedResult = "Journey complete",
            EstimatedTime = "10 minutes",
            AutomationCandidate = true
        });

        return list;
    }
}
