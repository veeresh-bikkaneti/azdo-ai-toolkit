using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.TeamFoundation.WorkItemTracking.WebApi;
using Microsoft.VisualStudio.Services.Common;
using Microsoft.VisualStudio.Services.WebApi;
using AzDoPbiAnalyzer.Core.Models;

namespace AzDoPbiAnalyzer.Core.Clients;

public class AzDoClient
{
    private readonly WorkItemTrackingHttpClient _client;

    public AzDoClient(string orgUrl, string pat)
    {
        var connection = new VssConnection(new Uri(orgUrl), new VssBasicCredential(string.Empty, pat));
        _client = connection.GetClient<WorkItemTrackingHttpClient>();
    }

    public async Task<PBIData> GetWorkItemAsync(int id)
    {
        var wi = await _client.GetWorkItemAsync(id, expand: Microsoft.TeamFoundation.WorkItemTracking.WebApi.Models.WorkItemExpand.Relations);

        return new PBIData
        {
            Id = wi.Id ?? 0,
            Title = wi.Fields.ContainsKey("System.Title") ? wi.Fields["System.Title"].ToString() : "",
            Description = wi.Fields.ContainsKey("System.Description") ? wi.Fields["System.Description"].ToString() : "",
            AcceptanceCriteria = wi.Fields.ContainsKey("Microsoft.VSTS.Common.AcceptanceCriteria") ? wi.Fields["Microsoft.VSTS.Common.AcceptanceCriteria"].ToString() : "",
            Priority = wi.Fields.ContainsKey("Microsoft.VSTS.Common.Priority") ? Convert.ToInt32(wi.Fields["Microsoft.VSTS.Common.Priority"]) : 4,
            State = wi.Fields.ContainsKey("System.State") ? wi.Fields["System.State"].ToString() : "",
            AreaPath = wi.Fields.ContainsKey("System.AreaPath") ? wi.Fields["System.AreaPath"].ToString() : "",
            Tags = wi.Fields.ContainsKey("System.Tags") ? wi.Fields["System.Tags"].ToString().Split(';').Select(t => t.Trim()).ToList() : new(),
            // Mapping relations would go here
        };
    }

    public async Task<bool> TestConnectionAsync()
    {
        try 
        {
            // Simple call to verify auth
            await _client.GetWorkItemAsync(1); // May fail if ID 1 doesn't exist but 401/403 is what we check
            return true;
        }
        catch (VssUnauthorizedException)
        {
            return false;
        }
        catch
        {
            // If ID doesn't exist it might throw 404, which means auth is fine
            return true;
        }
    }
}
