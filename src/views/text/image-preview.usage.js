import { demoImageSrc } from './image.usage.js';

export default {
    beforeDemo: ['md:"Similar to the `image` view but displays as a block with the image centered. The block has a checkered background to highlight image transparency."'],
    demo: {
        view: 'image-preview',
        src: demoImageSrc,
        height: 100
    },
    examples: [
        {
            title: 'Src is not defined',
            demo: 'image-preview'
        },
        {
            title: 'Bad url',
            demo: 'image-preview{ src: "<bad url>" }'
        }
    ]
};
