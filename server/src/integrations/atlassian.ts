import axios from 'axios';
import FormData from 'form-data';
import { ENV } from '../config/env';


const auth = {
username: ENV.ATLASSIAN.EMAIL,
password: ENV.ATLASSIAN.TOKEN
};


export async function confluenceCreatePage(spaceKey: string, title: string, storageHtml: string){
const url = `${ENV.ATLASSIAN.BASE_URL}/wiki/rest/api/content`;
const body = {
type: 'page',
title,
space: { key: spaceKey },
body: { storage: { value: storageHtml, representation: 'storage' } }
};
const { data } = await axios.post(url, body, { auth });
return { id: data.id, link: `${ENV.ATLASSIAN.BASE_URL}/wiki${data._links.webui}` };
}


export async function confluenceAttach(pageId: string, filename: string, fileBuffer: Buffer) {
const url = `${ENV.ATLASSIAN.BASE_URL}/wiki/rest/api/content/${pageId}/child/attachment`;
const form = new FormData();
form.append('file', fileBuffer, { filename });
const headers = { ...form.getHeaders(), 'X-Atlassian-Token': 'no-check' };
const { data } = await axios.post(url, form, {
auth,
headers
});
return data;
}


export async function jiraCreateIssue(fields: any){
const url = `${ENV.ATLASSIAN.BASE_URL}/rest/api/3/issue`;
const { data } = await axios.post(url, { fields }, { auth });
return data; // { key }
}


export async function jiraLinkIssues(inward: string, outward: string, type: string){
const url = `${ENV.ATLASSIAN.BASE_URL}/rest/api/3/issueLink`;
const body = {
type: { name: type },
inwardIssue: { key: inward },
outwardIssue: { key: outward }
};
await axios.post(url, body, { auth });
}
