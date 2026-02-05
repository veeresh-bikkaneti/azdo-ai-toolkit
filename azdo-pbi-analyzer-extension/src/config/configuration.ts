import * as vscode from 'vscode';

export class ConfigurationManager {
    private static readonly KEY_PAT = 'azdo-pbi-analyzer.pat';
    private static readonly KEY_ORG = 'azdo-pbi-analyzer.orgUrl';
    private static readonly KEY_PROJECT = 'azdo-pbi-analyzer.project';

    constructor(private context: vscode.ExtensionContext) { }

    async setPat(pat: string): Promise<void> {
        await this.context.secrets.store(ConfigurationManager.KEY_PAT, pat);
    }

    async getPat(): Promise<string | undefined> {
        return await this.context.secrets.get(ConfigurationManager.KEY_PAT);
    }

    async setOrgUrl(url: string): Promise<void> {
        await this.context.globalState.update(ConfigurationManager.KEY_ORG, url);
    }

    getOrgUrl(): string | undefined {
        return this.context.globalState.get<string>(ConfigurationManager.KEY_ORG);
    }

    async setProject(project: string): Promise<void> {
        await this.context.globalState.update(ConfigurationManager.KEY_PROJECT, project);
    }

    getProject(): string | undefined {
        return this.context.globalState.get<string>(ConfigurationManager.KEY_PROJECT);
    }

    async configure(): Promise<boolean> {
        const orgUrl = await vscode.window.showInputBox({
            prompt: 'Enter Azure DevOps Organization URL (e.g., https://dev.azure.com/myorg)',
            value: this.getOrgUrl() || ''
        });
        if (!orgUrl) return false;

        const project = await vscode.window.showInputBox({
            prompt: 'Enter Project Name',
            value: this.getProject() || ''
        });
        if (!project) return false;

        const pat = await vscode.window.showInputBox({
            prompt: 'Enter Personal Access Token (PAT)',
            password: true,
            placeHolder: 'Leave empty to keep existing PAT'
        });

        await this.setOrgUrl(orgUrl);
        await this.setProject(project);
        if (pat) {
            await this.setPat(pat);
        }

        return true;
    }
}
