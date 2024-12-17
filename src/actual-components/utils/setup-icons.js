import { createIconAtlas } from './icon-processor';

export async function ensureIconsSetup() {
    console.log('Starting icon setup verification...');
    
    try {
        // First verify the icons exist in the public directory
        const planeIconPath = '/icons/plane.png';
        const shipIconPath = '/icons/ship.png';

        // Test loading the icons
        const planeResponse = await fetch(planeIconPath);
        if (!planeResponse.ok) {
            console.error('Plane icon not found at:', planeIconPath);
            return false;
        }

        const shipResponse = await fetch(shipIconPath);
        if (!shipResponse.ok) {
            console.error('Ship icon not found at:', shipIconPath);
            return false;
        }

        console.log('Icon files verified successfully');
        return true;

    } catch (error) {
        console.error('Error during icon setup verification:', error);
        return false;
    }
} 