#!/usr/bin/env node
/**
 * Check Layer Boundaries
 *
 * Validates that src/lib/** does not import from src/app/** or src/components/**
 * (except for allowed re-export type files).
 *
 * Uses ESLint's import/no-restricted-paths rule for accurate detection.
 *
 * Usage: node scripts/check-layer-boundaries.mjs
 * Exit code: 0 if no violations, 1 if violations found
 */

import { execSync } from 'child_process';

const TARGET_RULE = 'import/no-restricted-paths';

try {
    // Run ESLint on src/lib with JSON output
    const result = execSync('npx eslint src/lib --ext .ts,.tsx --format json', {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'], // Capture stderr too
        maxBuffer: 1024 * 1024 * 10, // 10MB buffer for large outputs
    });

    const files = JSON.parse(result);

    // Filter only import/no-restricted-paths violations
    const violations = files.flatMap((file) =>
        file.messages
            .filter((msg) => msg.ruleId === TARGET_RULE)
            .map((msg) => ({
                file: file.filePath.replace(process.cwd() + '/', ''),
                line: msg.line,
                message: msg.message,
            }))
    );

    if (violations.length > 0) {
        console.error(`\n❌ ${violations.length} layer boundary violation(s) found:\n`);
        violations.forEach((v) => {
            console.error(`  ${v.file}:${v.line}`);
            console.error(`    → ${v.message}\n`);
        });
        console.error('Fix: Import from @/lib/domain/projects instead of @/components or @/app');
        process.exit(1);
    }

    console.log('✅ No layer boundary violations (ESLint import/no-restricted-paths)');
    process.exit(0);
} catch (error) {
    // ESLint returns non-zero for lint errors, but we still get JSON output
    if (error.stdout) {
        try {
            const files = JSON.parse(error.stdout);
            const violations = files.flatMap((file) =>
                file.messages
                    .filter((msg) => msg.ruleId === TARGET_RULE)
                    .map((msg) => ({
                        file: file.filePath.replace(process.cwd() + '/', ''),
                        line: msg.line,
                        message: msg.message,
                    }))
            );

            if (violations.length > 0) {
                console.error(`\n❌ ${violations.length} layer boundary violation(s) found:\n`);
                violations.forEach((v) => {
                    console.error(`  ${v.file}:${v.line}`);
                    console.error(`    → ${v.message}\n`);
                });
                console.error('Fix: Import from @/lib/domain/projects instead of @/components or @/app');
                process.exit(1);
            }

            // Other ESLint errors but no boundary violations
            console.log('✅ No layer boundary violations (ESLint import/no-restricted-paths)');
            process.exit(0);
        } catch {
            // JSON parse failed - real error
            console.error('ESLint execution error:', error.message);
            process.exit(1);
        }
    }

    console.error('ESLint execution error:', error.message);
    process.exit(1);
}
