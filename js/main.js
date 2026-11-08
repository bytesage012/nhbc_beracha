import {CONFIG} from './config.js';
import {readStream, configured, playerUrl} from './db.js';
const $ = id => document.getElementById(id);
let lastSignature='';
function renderCountdown(){
  const diff=new Date(CONFIG.eventStart).getTime()-Date.now();
  const target=$('countdown');
  if(diff<=0){target.textContent='The celebration has begun';return;}
  const d=Math.floor(diff/86400000),h=Math.floor(diff/3600000)%24,m=Math.floor(diff/60000)%60,s=Math.floor(diff/1000)%60;
  target.textContent=`${d}d : ${String(h).padStart(2,'0')}h : ${String(m).padStart(2,'0')}m : ${String(s).padStart(2,'0')}s`;
}
function renderStream(stream){
  const status=stream?.status||'upcoming',id=stream?.video_id;
  const signature=`${status}:${id||''}`;
  $('live-badge').textContent=status==='live'?'● LIVE NOW':status==='ended'?'EVENT ENDED':'UPCOMING';
  $('live-badge').className='stream-badge '+status;
  $('stream-heading').textContent=status==='live'?'Join the praise live':status==='ended'?'Thank you for celebrating with us':'The praise is coming';
  $('stream-description').textContent=status==='live'?'Experience BERACHA 2026 right here.':status==='ended'?'Thank you for being part of this celebration. Watch the recording if available.':'The livestream will appear here when our team activates it.';
  $('announcement').textContent=stream?.announcement||'';
  $('announcement').hidden=!stream?.announcement;
  if(signature===lastSignature)return;
  lastSignature=signature;
  const player=$('player-container');
  player.replaceChildren();
  if(id && (status==='live'||status==='ended')){
    const iframe=document.createElement('iframe');
    iframe.src=playerUrl(id); iframe.title='BERACHA 2026 YouTube livestream'; iframe.loading='lazy';
    iframe.allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    iframe.referrerPolicy='strict-origin-when-cross-origin'; iframe.allowFullscreen=true;
    player.append(iframe);
    $('youtube-link').href=`https://www.youtube.com/watch?v=${encodeURIComponent(id)}`;
    $('youtube-link').hidden=false;
  } else {
    const placeholder=document.createElement('div');placeholder.className='player-placeholder';
    const img=document.createElement('img');img.src='/assets/church-logo.jpg';img.alt='New Heritage Baptist Church logo';
    const text=document.createElement('p');text.textContent=status==='ended'?'The broadcast has ended.':'Waiting for the livestream to begin';
    placeholder.append(img,text);player.append(placeholder);
    $('youtube-link').hidden=true;
  }
}
async function refresh(){
  if(!configured()){$('connection-state').textContent='Livestream connection pending setup';renderStream(null);return;}
  try {const data=await readStream();renderStream(data);$('connection-state').textContent='Livestream status updated';}
  catch(err){$('connection-state').textContent='Unable to refresh livestream. Retrying shortly.';console.error(err);}
}
renderCountdown();setInterval(renderCountdown,1000);refresh();setInterval(()=>{if(!document.hidden)refresh();},CONFIG.pollingMs);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
$('share-button').addEventListener('click',async()=>{
  const data={title:CONFIG.eventName,text:'Celebrate 11 years with New Heritage Baptist Church, Ilorin!',url:location.href};
  try{if(navigator.share)await navigator.share(data);else {await navigator.clipboard.writeText(location.href);$('share-button').textContent='Link copied!';setTimeout(()=>$('share-button').textContent='Share event',2500);}}catch(err){if(err.name!=='AbortError')console.error(err);}
});
