using System;
using System.Text.RegularExpressions;
using AzDoPbiAnalyzer.Core.Models;

namespace AzDoPbiAnalyzer.Core.Utils;

public static class UrlParser
{
    public static PBIMetadata Parse(string url)
    {
        if (string.IsNullOrWhiteSpace(url))
            throw new ArgumentException("URL cannot be empty");

        // Format 1: https://dev.azure.com/{org}/{project}/_workitems/edit/{id}
        var devAzureMatch = Regex.Match(url, @"dev\.azure\.com/([^/]+)/([^/]+)/_workitems/edit/(\d+)", RegexOptions.IgnoreCase);
        if (devAzureMatch.Success)
        {
            return new PBIMetadata(
                devAzureMatch.Groups[1].Value,
                Uri.UnescapeDataString(devAzureMatch.Groups[2].Value),
                int.Parse(devAzureMatch.Groups[3].Value)
            );
        }

        // Format 2: https://{org}.visualstudio.com/{project}/_workitems/edit/{id}
        var visualStudioMatch = Regex.Match(url, @"([^.]+)\.visualstudio\.com/([^/]+)/_workitems/edit/(\d+)", RegexOptions.IgnoreCase);
        if (visualStudioMatch.Success)
        {
            return new PBIMetadata(
                visualStudioMatch.Groups[1].Value,
                Uri.UnescapeDataString(visualStudioMatch.Groups[2].Value),
                int.Parse(visualStudioMatch.Groups[3].Value)
            );
        }
        
        // Format 3: Query param style https://dev.azure.com/{org}/{project}/_workitems?id={id}
        var queryMatch = Regex.Match(url, @"dev\.azure\.com/([^/]+)/([^/]+)/_workitems\?id=(\d+)", RegexOptions.IgnoreCase);
        if (queryMatch.Success)
        {
            return new PBIMetadata(
                queryMatch.Groups[1].Value,
                Uri.UnescapeDataString(queryMatch.Groups[2].Value),
                int.Parse(queryMatch.Groups[3].Value)
            );
        }

        throw new ArgumentException("Invalid Azure DevOps URL format");
    }
}
