using Xunit;
using AzDoPbiAnalyzer.Core.Utils;

namespace AzDoPbiAnalyzer.Tests;

public class UrlParserTests
{
    [Fact]
    public void Parse_ShouldExtractDetails_FromStandardUrl()
    {
        // Arrange
        var url = "https://dev.azure.com/myorg/myproject/_workitems/edit/12345";

        // Act
        var result = UrlParser.Parse(url);

        // Assert
        Assert.Equal("myorg", result.Organization);
        Assert.Equal("myproject", result.Project);
        Assert.Equal(12345, result.WorkItemId);
    }

    [Fact]
    public void Parse_ShouldExtractDetails_FromQueryParam()
    {
        // Arrange
        var url = "https://dev.azure.com/myorg/myproject/_workitems?id=54321";

        // Act
        var result = UrlParser.Parse(url);

        // Assert
        Assert.Equal("myorg", result.Organization);
        Assert.Equal("myproject", result.Project);
        Assert.Equal(54321, result.WorkItemId);
    }

    [Fact]
    public void Parse_ShouldExtractDetails_FromVisualStudioUrl()
    {
        // Arrange
        var url = "https://myorg.visualstudio.com/myproject/_workitems/edit/999";

        // Act
        var result = UrlParser.Parse(url);

        // Assert
        Assert.Equal("myorg", result.Organization);
        Assert.Equal("myproject", result.Project);
        Assert.Equal(999, result.WorkItemId);
    }
    [Fact]
    public void Parse_ShouldExtractDetails_FromEncodedProjectName()
    {
        // Arrange
        var url = "https://dev.azure.com/myorg/my%20project/_workitems/edit/12345";

        // Act
        var result = UrlParser.Parse(url);

        // Assert
        Assert.Equal("myorg", result.Organization);
        Assert.Equal("my project", result.Project);
        Assert.Equal(12345, result.WorkItemId);
    }
}
