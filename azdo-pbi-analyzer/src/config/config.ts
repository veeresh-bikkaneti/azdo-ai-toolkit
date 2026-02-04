import { config } from 'dotenv';

config();

export interface Config {
    azureDevOpsPAT: string;
    openAIKey?: string;
    githubToken?: string;
    outputDirectory: string;
    enableAIEnhancement: boolean;
    verbose: boolean;
}

class ConfigManager {
    private static instance: ConfigManager;
    private _config: Config;

    private constructor() {
        this._config = this.loadConfig();
    }

    public static getInstance(): ConfigManager {
        if (!ConfigManager.instance) {
            ConfigManager.instance = new ConfigManager();
        }
        return ConfigManager.instance;
    }

    private loadConfig(): Config {
        const azureDevOpsPAT = process.env.AZURE_DEVOPS_PAT;

        if (!azureDevOpsPAT) {
            throw new Error(
                'AZURE_DEVOPS_PAT environment variable is required. ' +
                'Please create a .env file or set the environment variable.'
            );
        }

        return {
            azureDevOpsPAT,
            openAIKey: process.env.OPENAI_API_KEY,
            githubToken: process.env.GITHUB_TOKEN,
            outputDirectory: process.env.OUTPUT_DIR || './reports',
            enableAIEnhancement: false, // Default to template-based
            verbose: false,
        };
    }

    public get config(): Config {
        return this._config;
    }

    public updateConfig(updates: Partial<Config>): void {
        this._config = { ...this._config, ...updates };
    }

    public validate(): boolean {
        if (!this._config.azureDevOpsPAT) {
            console.error('❌ Azure DevOps PAT is required');
            return false;
        }

        if (this._config.enableAIEnhancement && !this._config.openAIKey) {
            console.warn('⚠️  AI enhancement enabled but no OpenAI API key found');
            console.warn('   Falling back to template-based generation');
            this._config.enableAIEnhancement = false;
        }

        return true;
    }
}

export const configManager = ConfigManager.getInstance();
export const getConfig = (): Config => configManager.config;
