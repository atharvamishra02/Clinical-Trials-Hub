import { MeSHHierarchyService } from './src/services/MeSHHierarchyService.js';
import dotenv from 'dotenv';
dotenv.config();

const testTerm = process.argv[2] || 'lung cancer';

async function test() {
    console.log(`\n========================================`);
    console.log(`[TEST] Resolving MeSH Hierarchy for: "${testTerm}"`);
    console.log(`========================================\n`);

    try {
        const result = await MeSHHierarchyService.resolveFullMeSH(testTerm);

        if (result) {
            console.log(`[✓] SUCCESS`);
            console.log(`    MeSH Term:      ${result.term}`);
            console.log(`    MeSH UID:       ${result.uid}`);
        } else {
            console.log(`[✗] FAILED: Could not resolve hierarchy for "${testTerm}"`);
        }
    } catch (err) {
        console.error(`[!] ERROR:`, err);
    }
    console.log(`\n========================================\n`);
}

test();
