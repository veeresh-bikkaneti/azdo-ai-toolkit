using AzDoPbiAnalyzer.Core.Models;

namespace AzDoPbiAnalyzer.Core.Analyzers;

public class ImpactAnalyzer
{
    public ImpactReport AnalyzeImpact(PBIData pbi, List<LinkedItem> linkedItems)
    {
        var report = new ImpactReport();

        // 1. Identify Existing Test Cases (Regression Candidates)
        var existingTests = linkedItems.Where(i => i.RelationType.Contains("TestedBy")).ToList();
        report.RegressionCandidates = existingTests.Select(t => t.Id).ToList();

        // 2. Identify Dependencies
        var parents = linkedItems.Where(i => i.RelationType.Contains("Hierarchy-Reverse")).ToList(); // Parent
        var related = linkedItems.Where(i => i.RelationType.Contains("Related")).ToList();

        // 3. Determine Smoke Eligibility
        bool isHighPriority = pbi.Priority <= 2;
        bool isCriticalTag = pbi.Tags.Contains("Critical", StringComparer.OrdinalIgnoreCase);
        
        report.IsSmokeCandidate = isHighPriority || isCriticalTag;
        report.ComplexityScore = CalculateComplexity(pbi, linkedItems);

        return report;
    }

    private int CalculateComplexity(PBIData pbi, List<LinkedItem> linkedItems)
    {
        int score = 1;
        // Bump score for dependencies
        score += linkedItems.Count(i => i.RelationType.Contains("Related"));
        // Bump score for length of description (heuristic)
        if (pbi.Description.Length > 1000) score++;
        return score;
    }
}

public class ImpactReport
{
    public List<int> RegressionCandidates { get; set; } = new();
    public bool IsSmokeCandidate { get; set; }
    public int ComplexityScore { get; set; }
}
