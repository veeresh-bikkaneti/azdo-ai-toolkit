/**
 * Data models for Azure DevOps work items and test cases
 */

export interface PBIMetadata {
    organization: string;
    project: string;
    workItemId: number;
}

export interface PBIData {
    id: number;
    title: string;
    description: string;
    acceptanceCriteria: string;
    priority: number;
    state: string;
    assignedTo: string;
    createdDate: string;
    changedDate: string;
    areaPath: string;
    iterationPath: string;
    tags: string[];
    relatedItems: RelatedItem[];
    businessValue?: string;
}

export interface RelatedItem {
    id: number;
    type: WorkItemType;
    relationship: RelationshipType;
    title: string;
    state: string;
}

export type WorkItemType =
    | 'Epic'
    | 'Feature'
    | 'Product Backlog Item'
    | 'User Story'
    | 'Bug'
    | 'Task'
    | 'Test Case';

export type RelationshipType =
    | 'Parent'
    | 'Child'
    | 'Related'
    | 'Tests'
    | 'Tested By'
    | 'Predecessor'
    | 'Successor';

export interface TestCase {
    id: string;
    title: string;
    category: TestCategory;
    priority: TestPriority;
    tags: string[];
    steps: TestStep[];
    expectedResult: string;
    estimatedTime?: string;
    automationCandidate: boolean;
}

export type TestCategory = 'sanity' | 'smoke' | 'regression' | 'e2e' | 'integration';

export type TestPriority = 'critical' | 'high' | 'medium' | 'low';

export interface TestStep {
    stepNumber: number;
    action: string;
    expectedResult: string;
    testData?: string;
}

export interface TestCoverageSummary {
    totalGenerated: number;
    byCategoryCount: Record<TestCategory, number>;
    existingTestsFound: number;
    coverageGap: number;
    automationCandidates: number;
}

export interface AnalysisReport {
    pbi: PBIData;
    metadata: PBIMetadata;
    requirements: string[];
    deliverables: string[];
    dependencies: string[];
    testCases: TestCase[];
    coverage: TestCoverageSummary;
    testUpdateRecommendations: TestUpdateRecommendation[];
    // NEW: Gherkin & Role-Based Data
    gherkin: string;
    roleInsights?: {
        productOwner: string[];
        developer: string[];
        qa: string[];
    };
    generatedAt: string;
}

export interface TestUpdateRecommendation {
    testCaseId: number;
    testCaseTitle: string;
    reason: string;
    suggestedAction: 'update' | 'retire' | 'review';
}
