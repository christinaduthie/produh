import { confluenceCreatePage } from '../integrations/atlassian.js';

export async function createUniqueConfluencePage(spaceKey: string, baseTitle: string, html: string) {
  let attempt = 1;
  while (attempt <= 50) {
    const title = `${baseTitle}_${attempt}`;
    try {
      return await confluenceCreatePage(spaceKey, title, html);
    } catch (err: any) {
      const duplicate =
        err?.response?.status === 400 &&
        typeof err?.response?.data?.message === 'string' &&
        err.response.data.message.includes('already exists');
      if (duplicate) {
        attempt += 1;
        continue;
      }
      throw err;
    }
  }
  throw new Error('Unable to create unique Confluence page title');
}
