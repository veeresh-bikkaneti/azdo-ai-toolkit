import { describe, it, expect } from 'vitest';
import { URLParser } from '../src/utils/url-parser.js';

describe('URLParser', () => {
    describe('parse', () => {
        it('should parse dev.azure.com URL format', () => {
            const url = 'https://dev.azure.com/myorg/myproject/_workitems/edit/12345';
            const result = URLParser.parse(url);

            expect(result.organization).toBe('myorg');
            expect(result.project).toBe('myproject');
            expect(result.workItemId).toBe(12345);
        });

        it('should parse visualstudio.com URL format', () => {
            const url = 'https://myorg.visualstudio.com/myproject/_workitems/edit/67890';
            const result = URLParser.parse(url);

            expect(result.organization).toBe('myorg');
            expect(result.project).toBe('myproject');
            expect(result.workItemId).toBe(67890);
        });

        it('should parse query parameter format', () => {
            const url = 'https://dev.azure.com/myorg/myproject/_workitems?id=11111';
            const result = URLParser.parse(url);

            expect(result.organization).toBe('myorg');
            expect(result.project).toBe('myproject');
            expect(result.workItemId).toBe(11111);
        });

        it('should handle URL-encoded project names', () => {
            const url = 'https://dev.azure.com/myorg/my%20project/_workitems/edit/12345';
            const result = URLParser.parse(url);

            expect(result.project).toBe('my project');
        });

        it('should throw error for invalid URL', () => {
            const url = 'https://invalid.com/something';

            expect(() => URLParser.parse(url)).toThrow('Invalid Azure DevOps URL format');
        });
    });

    describe('isValid', () => {
        it('should return true for valid URLs', () => {
            expect(URLParser.isValid('https://dev.azure.com/org/proj/_workitems/edit/123')).toBe(true);
        });

        it('should return false for invalid URLs', () => {
            expect(URLParser.isValid('https://invalid.com')).toBe(false);
        });
    });

    describe('extractWorkItemId', () => {
        it('should extract work item ID from URL', () => {
            const url = 'https://dev.azure.com/org/proj/_workitems/edit/99999';
            expect(URLParser.extractWorkItemId(url)).toBe(99999);
        });
    });
});
