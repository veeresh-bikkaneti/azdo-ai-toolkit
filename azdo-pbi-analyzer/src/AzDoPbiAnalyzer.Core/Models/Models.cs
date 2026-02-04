using System;
using System.Collections.Generic;

namespace AzDoPbiAnalyzer.Core.Models;

public record PBIMetadata(string Organization, string Project, int WorkItemId);

public record PBIData
{
    public int Id { get; init; }
    public string Title { get; init; } = string.Empty;
    public string Description { get; init; } = string.Empty;
    public string AcceptanceCriteria { get; init; } = string.Empty;
    public int Priority { get; init; }
    public string State { get; init; } = string.Empty;
    public string AssignedTo { get; init; } = string.Empty;
    public DateTime CreatedDate { get; init; }
    public DateTime ChangedDate { get; init; }
    public string AreaPath { get; init; } = string.Empty;
    public string IterationPath { get; init; } = string.Empty;
    public List<string> Tags { get; init; } = new();
    public List<RelatedItem> RelatedItems { get; init; } = new();
    public string? BusinessValue { get; init; }
    public List<WorkItemRelation> Relations { get; init; } = new();
}

public class WorkItemRelation
{
    public string Rel { get; set; } = string.Empty;
    public string Url { get; set; } = string.Empty;
    public Dictionary<string, object>? Attributes { get; set; }
}

public record RelatedItem(int Id, string Type, string Relationship, string Title, string State);

public record TestCase
{
    public string Id { get; init; } = string.Empty;
    public string Title { get; init; } = string.Empty;
    public TestCategory Category { get; init; }
    public TestPriority Priority { get; init; }
    public List<string> Tags { get; init; } = new();
    public List<TestStep> Steps { get; init; } = new();
    public string ExpectedResult { get; init; } = string.Empty;
    public string? EstimatedTime { get; init; }
    public bool AutomationCandidate { get; init; }
}

public record TestStep(int StepNumber, string Action, string ExpectedResult, string? TestData = null);

public enum TestCategory
{
    Sanity,
    Smoke,
    Regression,
    E2E,
    Integration
}

public enum TestPriority
{
    Critical,
    High,
    Medium,
    Low
}

public record TestCoverageSummary(
    int TotalGenerated,
    Dictionary<TestCategory, int> ByCategoryCount,
    int ExistingTestsFound,
    int CoverageGap,
    int AutomationCandidates
);

public record AnalysisReport
{
    public PBIData Pbi { get; init; } = new();
    public PBIMetadata Metadata { get; init; } = new(string.Empty, string.Empty, 0);
    public List<string> Requirements { get; init; } = new();
    public List<string> Deliverables { get; init; } = new();
    public List<string> Dependencies { get; init; } = new();
    public List<TestCase> TestCases { get; init; } = new();
    public TestCoverageSummary Coverage { get; init; } = new(0, new(), 0, 0, 0);
    public List<TestUpdateRecommendation> TestUpdateRecommendations { get; init; } = new();
    public DateTime GeneratedAt { get; init; }
}

public record TestUpdateRecommendation(
    int TestCaseId,
    string TestCaseTitle,
    string Reason,
    string SuggestedAction
);
