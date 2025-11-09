import 'dotenv/config';


export const ENV = {
PORT: parseInt(process.env.PORT || '5050', 10),
NODE_ENV: process.env.NODE_ENV || 'development',
MOCK_MODE: process.env.MOCK_MODE === 'true',
MOCK_DISCOVERY: process.env.MOCK_DISCOVERY === 'true',
DB_URL: process.env.DATABASE_URL!,
ENC_KEY: process.env.ENCRYPTION_KEY || 'dev_key_please_change',


ATLASSIAN: {
BASE_URL: process.env.ATLASSIAN_BASE_URL || '',
EMAIL: process.env.ATLASSIAN_EMAIL || '',
TOKEN: process.env.ATLASSIAN_API_TOKEN || '',
JIRA_PROJECT_KEY: process.env.ATLASSIAN_JIRA_PROJECT_KEY || '',
CONF_SPACE_KEY: process.env.ATLASSIAN_CONFLUENCE_SPACE_KEY || ''
},
MS: {
TENANT_ID: process.env.MS_TENANT_ID || '',
CLIENT_ID: process.env.MS_CLIENT_ID || '',
CLIENT_SECRET: process.env.MS_CLIENT_SECRET || '',
TEAM_ID: process.env.MS_TEAM_ID || '',
CHANNEL_ID: process.env.MS_CHANNEL_ID || ''
},
GEMINI: {
KEY: process.env.GEMINI_API_KEY || '',
MODEL: process.env.GEMINI_MODEL || 'gemini-1.5-pro'
}
};
