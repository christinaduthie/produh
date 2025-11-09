import axios from 'axios';
import qs from 'querystring';
import { ENV } from '../config/env';


async function getToken(){
const url = `https://login.microsoftonline.com/${ENV.MS.TENANT_ID}/oauth2/v2.0/token`;
const body = qs.stringify({
client_id: ENV.MS.CLIENT_ID,
client_secret: ENV.MS.CLIENT_SECRET,
scope: 'https://graph.microsoft.com/.default',
grant_type: 'client_credentials'
});
const { data } = await axios.post(url, body, { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
return data.access_token as string;
}


export async function teamsListMessages(teamId: string, channelId: string){
const token = await getToken();
const url = `https://graph.microsoft.com/v1.0/teams/${teamId}/channels/${channelId}/messages?$top=50`;
const { data } = await axios.get(url, { headers: { Authorization: `Bearer ${token}` }});
return data.value as any[];
}


export async function teamsPostMessage(teamId: string, channelId: string, text: string){
const token = await getToken();
const url = `https://graph.microsoft.com/v1.0/teams/${teamId}/channels/${channelId}/messages`;
const { data } = await axios.post(url, { body: { content: text } }, { headers: { Authorization: `Bearer ${token}` }});
return data;
}