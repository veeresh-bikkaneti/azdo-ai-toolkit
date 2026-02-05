import { WorkItem } from './azdoClient';

export class TestGenerator {

    generateGherkin(workItem: WorkItem): string {
        const id = workItem.id;
        const title = workItem.fields['System.Title'];
        // Strip HTML tags for cleaner output
        const ac = this.stripHtml(workItem.fields['Microsoft.VSTS.Common.AcceptanceCriteria'] || '');

        return `@pbi-${id}
Feature: ${title}

  As a user
  I want to [achieve goal]
  So that [benefit]

  # Generated from PBI ${id} Acceptance Criteria
  # ${ac.replace(/\n/g, '\n  # ')}

  Scenario: Success Path
    Given [precondition]
    When [action]
    Then [result]
`;
    }

    generateCypress(workItem: WorkItem): string {
        const id = workItem.id;
        const title = workItem.fields['System.Title'];

        return `describe('PBI ${id}: ${title}', () => {
  
  beforeEach(() => {
    // Setup
    cy.visit('/');
  });

  it('should handle the happy path', () => {
    // Generated test stub
    // Step 1: Given [precondition]
    // cy.login();

    // Step 2: When [action]
    // cy.get('[data-testid="some-element"]').click();

    // Step 3: Then [result]
    // cy.contains('Success').should('be.visible');
  });

});
`;
    }

    private stripHtml(html: string): string {
        return html.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
    }
}
