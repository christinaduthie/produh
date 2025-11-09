export function confluenceStorageBody(opts: { title: string; html: string; }) {
    return {
    type: 'page',
    title: opts.title,
    space: { key: '' }, // filled per call
    body: {
    storage: { value: opts.html, representation: 'storage' }
    }
    };
    }