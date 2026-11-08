import crypto from 'node:crypto';

const json=(res,status,body)=>res.status(status).json(body);
const env=()=>({url:process.env.SUPABASE_URL,key:process.env.SUPABASE_SERVICE_ROLE_KEY,secret:process.env.SETTINGS_ENCRYPTION_KEY});
async function request(path,{method='GET',body,token,service=false}={}){
 const {url,key}=env(); const apiKey=service?key:process.env.SUPABASE_ANON_KEY;
 const r=await fetch(`${url}/rest/v1/${path}`,{method,headers:{apikey:apiKey,Authorization:`Bearer ${service?key:token}`, ...(body?{'Content-Type':'application/json',Prefer:'return=representation'}:{})},body:body?JSON.stringify(body):undefined,cache:'no-store'});
 if(!r.ok)throw new Error(`Database operation failed (${r.status})`);return r.status===204?null:r.json();
}
async function authorized(req){
 const token=(req.headers.authorization||'').match(/^Bearer (.+)$/)?.[1];if(!token) return false;
 const r=await fetch(`${env().url}/auth/v1/user`,{headers:{apikey:process.env.SUPABASE_ANON_KEY,Authorization:`Bearer ${token}`},cache:'no-store'});
 if(!r.ok)return false;const user=await r.json();if(!user.id)return false;
 const rows=await request(`admin_users?user_id=eq.${encodeURIComponent(user.id)}&select=user_id`,{service:true});return rows.length>0;
}
function keyBytes(){const s=env().secret;if(!s||!/^[a-f0-9]{64}$/i.test(s))throw new Error('SETTINGS_ENCRYPTION_KEY must be 64 hexadecimal characters');return Buffer.from(s,'hex');}
function encrypt(plain){const iv=crypto.randomBytes(12),cipher=crypto.createCipheriv('aes-256-gcm',keyBytes(),iv),encrypted=Buffer.concat([cipher.update(plain,'utf8'),cipher.final()]);return [iv,cipher.getAuthTag(),encrypted].map(x=>x.toString('base64')).join('.');}
function decrypt(blob){if(!blob)return null;const [i,t,c]=blob.split('.').map(x=>Buffer.from(x,'base64'));const d=crypto.createDecipheriv('aes-256-gcm',keyBytes(),i);d.setAuthTag(t);return Buffer.concat([d.update(c),d.final()]).toString('utf8');}
async function getSettings(){const rows=await request('broadcast_settings?id=eq.1&select=*',{service:true});return rows[0]||{};}
async function saveSettings(data){return request('broadcast_settings?id=eq.1',{method:'PATCH',service:true,body:data});}
async function yt(endpoint,params,key){const url=new URL(`https://www.googleapis.com/youtube/v3/${endpoint}`);Object.entries({...params,key}).forEach(([k,v])=>url.searchParams.set(k,v));const r=await fetch(url,{cache:'no-store'});const d=await r.json();if(!r.ok)throw new Error(d.error?.message||`YouTube error (${r.status})`);return d;}
async function resolveChannel(handle,key){const h=handle.trim().replace(/^https?:\/\/(www\.)?youtube\.com\//i,'').replace(/^@/,'').replace(/\/$/,'');if(!/^[a-zA-Z0-9._-]{3,100}$/.test(h))throw new Error('Enter a valid YouTube @handle');const result=await yt('channels',{part:'snippet',forHandle:h},key);const item=result.items?.[0];if(!item)throw new Error('No channel found for this handle');return {channelId:item.id,title:item.snippet?.title||''};}
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');if(!['GET','POST'].includes(req.method))return json(res,405,{error:'Method not allowed'});
 try{
  if(!env().url||!env().key||!process.env.SUPABASE_ANON_KEY||!env().secret)return json(res,503,{error:'Server settings not configured. See README.'});
  if(!await authorized(req))return json(res,403,{error:'Operator access required'});
  const settings=await getSettings();
  if(req.method==='GET')return json(res,200,{channelHandle:settings.channel_handle||'',channelId:settings.channel_id||'',channelTitle:settings.channel_title||'',hasApiKey:!!settings.api_key_encrypted,autoPublish:!!settings.auto_publish});
  const action=req.body?.action;
  if(action==='save'){
   const handle=String(req.body.channelHandle||'').trim().slice(0,120),id=String(req.body.channelId||'').trim(),key=String(req.body.apiKey||'').trim();
   if(id&&!/^UC[A-Za-z0-9_-]{22}$/.test(id))throw new Error('Channel ID must be a valid UC-prefixed 24-character ID');
   if(key&&(!/^[A-Za-z0-9_-]{20,200}$/.test(key)))throw new Error('Invalid YouTube API key format');
   const changes={channel_handle:handle||null,channel_id:id||null,channel_title:null};
   if(key)changes.api_key_encrypted=encrypt(key);
   if(req.body.clearApiKey===true)changes.api_key_encrypted=null;
   await saveSettings(changes);return json(res,200,{success:true});
  }
  if(action==='resolve'){
   const key=decrypt(settings.api_key_encrypted);if(!key)throw new Error('Save a YouTube API key first');
   const found=await resolveChannel(String(req.body.channelHandle||settings.channel_handle||''),key);
   await saveSettings({channel_handle:String(req.body.channelHandle||settings.channel_handle||'').trim(),channel_id:found.channelId,channel_title:found.title});return json(res,200,found);
  }
  if(action==='check'){
   const key=decrypt(settings.api_key_encrypted);if(!key)throw new Error('Save a YouTube API key first');
   let channelId=settings.channel_id;
   if(!channelId&&settings.channel_handle){const found=await resolveChannel(settings.channel_handle,key);channelId=found.channelId;await saveSettings({channel_id:found.channelId,channel_title:found.title});}
   if(!channelId)throw new Error('Set a YouTube channel handle or ID first');
   const result=await yt('search',{part:'snippet',channelId,eventType:'live',type:'video',maxResults:'5'},key);
   const item=result.items?.find(x=>x.id?.videoId);
   return json(res,200,{videoId:item?.id?.videoId||null,title:item?.snippet?.title||null,checkedAt:new Date().toISOString()});
  }
  return json(res,400,{error:'Unknown action'});
 }catch(err){console.error('Settings request:',err.message);return json(res,400,{error:err.message||'Request failed'});}
}
