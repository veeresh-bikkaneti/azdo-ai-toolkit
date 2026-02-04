using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;
using AzDoPbiAnalyzer.Core.Models;

namespace AzDoPbiAnalyzer.Core.Analyzers;

public class RequirementsAnalyzer
{
    public List<string> ExtractRequirements(PBIData pbi)
    {
        var requirements = new List<string>();
        var description = StripHtml(pbi.Description);

        // Look for numbered lists or bullet points
        var listPatterns = new[]
        {
            @"\d+\.\s+(.+?)(?=\n\d+\.|\n-|\n\*|$)",
            @"[-*]\s+(.+?)(?=\n-|\n\*|\n\d+\.|$)"
        };

        foreach (var pattern in listPatterns)
        {
            var matches = Regex.Matches(description, pattern, RegexOptions.Singleline);
            foreach (Match match in matches)
            {
                var req = match.Groups[1].Value.Trim();
                if (req.Length > 10 && !requirements.Contains(req))
                {
                    requirements.Add(req);
                }
            }
        }

        // If no structured list found, extract sentences with keywords
        if (requirements.Count == 0)
        {
            var keywords = new[]
            {
                "must", "should", "shall", "need to", "required to",
                "enable", "allow", "support", "provide", "implement"
            };

            var sentences = description.Split(new[] { '.', '!', '?' }, StringSplitOptions.RemoveEmptyEntries);
            foreach (var sentence in sentences)
            {
                var lower = sentence.ToLower();
                if (keywords.Any(k => lower.Contains(k)))
                {
                    var trimmed = sentence.Trim();
                    if (trimmed.Length > 20)
                    {
                        requirements.Add(trimmed);
                    }
                }
            }
        }

        return requirements.Take(10).ToList();
    }

    public List<string> ExtractDeliverables(PBIData pbi)
    {
        var deliverables = new List<string>();
        var criteria = StripHtml(pbi.AcceptanceCriteria);

        if (string.IsNullOrWhiteSpace(criteria))
        {
            return new List<string> { "Implementation of all requirements", "Unit tests", "Documentation" };
        }

        var patterns = new[]
        {
            @"\[[ x]\]\s+(.+?)(?=\n|$)",
            @"\d+\.\s+(.+?)(?=\n\d+\.|\n-|$)",
            @"[-*]\s+(.+?)(?=\n-|\n\*|$)"
        };

        foreach (var pattern in patterns)
        {
            var matches = Regex.Matches(criteria, pattern, RegexOptions.Singleline | RegexOptions.IgnoreCase);
            foreach (Match match in matches)
            {
                var deliverable = match.Groups[1].Value.Trim();
                if (deliverable.Length > 5)
                {
                    deliverables.Add(deliverable);
                }
            }
        }

        return deliverables.Count > 0 ? deliverables : ExtractRequirements(pbi);
    }

    public List<string> ExtractDependencies(PBIData pbi)
    {
        var dependencies = new List<string>();

        // Related items
        var parents = pbi.RelatedItems.Where(r => r.Relationship == "Parent");
        var predecessors = pbi.RelatedItems.Where(r => r.Relationship == "Predecessor");

        dependencies.AddRange(parents.Select(p => $"Parent: {p.Title} ({p.Type})"));
        dependencies.AddRange(predecessors.Select(p => $"Depends on: {p.Title} ({p.Type})"));

        // Description analysis
        var description = StripHtml(pbi.Description).ToLower();
        var keywords = new[] { "depends on", "requires", "prerequisite", "blocked by", "needs" };

        foreach (var keyword in keywords)
        {
            if (description.Contains(keyword))
            {
                var sentences = pbi.Description.Split(new[] { '.', '!', '?' }, StringSplitOptions.RemoveEmptyEntries);
                foreach (var sentence in sentences)
                {
                    if (sentence.ToLower().Contains(keyword))
                    {
                        dependencies.Add(StripHtml(sentence).Trim());
                        break;
                    }
                }
            }
        }

        return dependencies.Count > 0 ? dependencies : new List<string> { "No explicit dependencies identified" };
    }

    public bool IsCritical(PBIData pbi)
    {
        return pbi.Priority == 1 ||
               pbi.Tags.Any(t => new[] { "critical", "high-priority", "p0", "p1" }.Contains(t.ToLower()));
    }

    private string StripHtml(string html)
    {
        if (string.IsNullOrEmpty(html)) return string.Empty;
        
        var text = Regex.Replace(html, "<[^>]*>", " ");
        text = text.Replace("&nbsp;", " ")
                   .Replace("&amp;", "&")
                   .Replace("&lt;", "<")
                   .Replace("&gt;", ">")
                   .Replace("  ", " ");
                   
        return text.Trim();
    }
}
