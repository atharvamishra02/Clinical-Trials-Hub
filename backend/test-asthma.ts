import { MeSHHierarchyService } from './src/services/MeSHHierarchyService.js';

async function testAsthma() {
    console.log('--- Testing Asthma (D001249) ---');
    const term = 'asthma';
    const uid = await MeSHHierarchyService.getMeshUid(term);
    console.log(`NCBI UID for "${term}":`, uid);
    
    if (uid) {
        const descriptorUI = await MeSHHierarchyService.getDescriptorUI(uid);
        console.log(`Descriptor UI:`, descriptorUI);
        
        if (descriptorUI) {
            const descendants = await MeSHHierarchyService.getAllDescendants(descriptorUI);
            console.log(`Found ${descendants.length} descendants:`);
            console.log(descendants);
        }
    }
}

testAsthma().catch(console.error);
