using AzDoPbiAnalyzer.Core.Models;
using Microsoft.VisualStudio.Services.WebApi;

namespace AzDoPbiAnalyzer.Core.Analyzers;

public class LinkedItemAnalyzer
{
    public List<LinkedItem> ExtractLinkedItems(PBIData pbi)
    {
        var linkedItems = new List<LinkedItem>();

        // This is a placeholder for the actual extraction logic
        // In a real implementation, we would inspect pbi.Relations
        // For now, we simulate finding associated items

        if (pbi.Relations != null)
        {
            foreach (var relation in pbi.Relations)
            {
                // Logic to map relation type to internal LinkedItem
                // e.g. "System.LinkTypes.Hierarchy-Forward" -> Child
                // "Microsoft.VSTS.Common.TestedBy-Forward" -> Test Case
                
                linkedItems.Add(new LinkedItem 
                { 
                    Id = ExtractIdFromUrl(relation.Url), 
                    RelationType = relation.Rel,
                    Url = relation.Url
                });
            }
        }

        return linkedItems;
    }

    private int ExtractIdFromUrl(string url)
    {
        if (string.IsNullOrEmpty(url)) return 0;
        var parts = url.Split('/');
        if (int.TryParse(parts.Last(), out int id))
        {
            return id;
        }
        return 0;
    }
}

public class LinkedItem
{
    public int Id { get; set; }
    public string RelationType { get; set; } = string.Empty;
    public string Url { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty; // Would need separate fetch
}
