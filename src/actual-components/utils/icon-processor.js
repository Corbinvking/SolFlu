// Icon processing utility
export async function createIconAtlas(planeIcon, shipIcon) {
    // Create a canvas to combine the icons
    const canvas = document.createElement('canvas');
    canvas.width = 256;  // Two 128x128 icons side by side
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    // Function to process an icon
    const processIcon = async (iconSrc) => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                // Create a temporary canvas for processing
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = 128;
                tempCanvas.height = 128;
                const tempCtx = tempCanvas.getContext('2d');

                // Draw and invert colors
                tempCtx.drawImage(img, 0, 0, 128, 128);
                const imageData = tempCtx.getImageData(0, 0, 128, 128);
                const data = imageData.data;

                // Invert colors and make white
                for (let i = 0; i < data.length; i += 4) {
                    // If pixel is not transparent
                    if (data[i + 3] > 0) {
                        // Make white
                        data[i] = 255;     // R
                        data[i + 1] = 255; // G
                        data[i + 2] = 255; // B
                    }
                }

                tempCtx.putImageData(imageData, 0, 0);
                resolve(tempCanvas);
            };
            img.onerror = reject;
            img.src = iconSrc;
        });
    };

    try {
        // Process both icons
        const processedPlane = await processIcon(planeIcon);
        const processedShip = await processIcon(shipIcon);

        // Draw them side by side in the atlas
        ctx.drawImage(processedPlane, 0, 0);
        ctx.drawImage(processedShip, 128, 0);

        // Convert to data URL
        return canvas.toDataURL('image/png');
    } catch (error) {
        console.error('Error creating icon atlas:', error);
        throw error;
    }
}

// Helper function to load an image
async function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';  // Enable CORS
        img.onload = () => resolve(img);
        img.onerror = (e) => {
            console.error('Failed to load image:', src, e);
            reject(new Error(`Failed to load image: ${src}`));
        };
        img.src = src;
    });
}

// Function to load the icon atlas
export async function loadIconAtlas(planePath, shipPath) {
    console.log('Loading icon atlas from paths:', { planePath, shipPath });
    
    try {
        // Create a canvas to combine the icons
        const canvas = document.createElement('canvas');
        canvas.width = 64;  // Total width for both icons
        canvas.height = 32; // Height for single icon

        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#FFFFFF';  // Set fill color to white
        
        // Load both images
        const [planeImage, shipImage] = await Promise.all([
            loadImage(planePath),
            loadImage(shipPath)
        ]);

        console.log('Images loaded successfully:', {
            plane: `${planeImage.width}x${planeImage.height}`,
            ship: `${shipImage.width}x${shipImage.height}`
        });

        // Function to process and draw icon
        const drawIcon = (img, x, width) => {
            // Create temporary canvas for processing
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = width;
            tempCanvas.height = 32;
            const tempCtx = tempCanvas.getContext('2d');

            // Draw and process the icon
            tempCtx.drawImage(img, 0, 0, width, 32);
            
            // Get image data
            const imageData = tempCtx.getImageData(0, 0, width, 32);
            const data = imageData.data;

            // Convert to white silhouette
            for (let i = 0; i < data.length; i += 4) {
                if (data[i + 3] > 0) {  // If pixel is not transparent
                    data[i] = 255;      // R
                    data[i + 1] = 255;  // G
                    data[i + 2] = 255;  // B
                }
            }

            // Put processed image back
            tempCtx.putImageData(imageData, 0, 0);
            
            // Draw to main canvas
            ctx.drawImage(tempCanvas, x, 0);
        };

        // Draw both icons
        drawIcon(planeImage, 0, 32);   // Plane on left
        drawIcon(shipImage, 32, 32);   // Ship on right

        console.log('Atlas created successfully');
        return canvas;
    } catch (error) {
        console.error('Failed to load icon atlas:', error);
        throw error;
    }
} 