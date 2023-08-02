import { demoImageSrc } from './image.usage.js';

export default {
    beforeDemo: ['md:"The same as `image` view but with "'],
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
