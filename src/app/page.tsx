"use client";
import { useState, useCallback, useEffect, useRef } from "react";

/* ════════════════════════ TYPES ════════════════════════ */
interface Vocab    { word:string; meaning:string; example:string; }
interface Question { type:string; question:string; tip:string; sample:string; vocabulary:Vocab[]; keyPoints:string[]; }
interface Score    { score:number; estimatedLevel:string; strengths:string[]; improvements:string[]; overall:string; }
interface Fav      { id:string; questionText:string; sample:string; topicName:string; level:string; type:string; savedAt:string; }
type Page = "home"|"topic"|"survey"|"level"|"exam"|"done"|"favs"|"guide";

/* ════════════════════════ DATA ════════════════════════ */
const TOPICS = [
  {id:"movies",icon:"🎬",name:"Xem phim"},{id:"music",icon:"🎵",name:"Âm nhạc"},
  {id:"sports",icon:"⚽",name:"Thể thao"},{id:"travel",icon:"✈️",name:"Du lịch"},
  {id:"cooking",icon:"🍳",name:"Nấu ăn"},{id:"reading",icon:"📚",name:"Đọc sách"},
  {id:"technology",icon:"💻",name:"Công nghệ"},{id:"environment",icon:"🌿",name:"Môi trường"},
  {id:"health",icon:"🏃",name:"Sức khỏe"},{id:"shopping",icon:"🛍️",name:"Mua sắm"},
  {id:"family",icon:"👨‍👩‍👧",name:"Gia đình"},{id:"work",icon:"💼",name:"Công việc"},
];
const SQS = [
  {id:"job",q:"Nghề nghiệp của bạn là gì?",multi:false,opts:["Nhân viên văn phòng","Nội trợ","Giáo viên","Học sinh / Sinh viên","Chưa có việc làm"]},
  {id:"study",q:"Nếu là sinh viên, mục đích học tập?",multi:false,opts:["Lấy bằng cấp","Học nâng cao","Học ngôn ngữ","Không áp dụng"]},
  {id:"dwelling",q:"Bạn đang sống ở đâu?",multi:false,opts:["Nhà/căn hộ (một mình)","Nhà/căn hộ (với bạn bè)","Nhà/căn hộ (với gia đình)","Ký túc xá","Nhà tập thể"]},
  {id:"freetime",q:"Bạn làm gì trong thời gian rảnh?",multi:true,opts:["Xem phim","Đi xem hòa nhạc","Đi công viên","Cắm trại","Đi biển","Xem thể thao","Chơi game","Giúp việc nhà"]},
  {id:"hobbies",q:"Sở thích của bạn là gì?",multi:true,opts:["Nghe nhạc","Chơi nhạc cụ","Hát","Nhảy múa","Viết lách","Vẽ tranh","Nấu ăn","Làm vườn","Nuôi thú cưng"]},
  {id:"sports_q",q:"Bạn chơi thể thao hoặc tập thể dục gì?",multi:true,opts:["Bóng đá","Bơi lội","Đi xe đạp","Chạy bộ","Đi bộ","Yoga","Cầu lông","Bóng bàn","Tập gym","Không tập"]},
  {id:"travel_q",q:"Bạn đã từng đi du lịch loại nào?",multi:true,opts:["Công tác trong nước","Công tác nước ngoài","Nghỉ tại nhà","Du lịch trong nước","Du lịch nước ngoài"]},
];
const LEVELS=[
  {id:"IM1",label:"IM1",sub:"Inter. Mid 1"},{id:"IM2",label:"IM2",sub:"Inter. Mid 2"},
  {id:"IM3",label:"IM3",sub:"Inter. Mid 3"},{id:"IH",label:"IH",sub:"Inter. High"},
  {id:"AL",label:"AL",sub:"Adv. Low"},
];
const TYPE_GROUPS=[
  {range:[0,2],tag:"Q1–3",label:"Describe",vi:"Mô tả"},
  {range:[3,5],tag:"Q4–6",label:"Compare",vi:"So sánh"},
  {range:[6,8],tag:"Q7–9",label:"Past Experience",vi:"Kinh nghiệm"},
  {range:[9,11],tag:"Q10–12",label:"Role-play",vi:"Tình huống"},
  {range:[12,14],tag:"Q13–15",label:"Mixed",vi:"Hỗn hợp"},
];
const TMETA:Record<string,{label:string;c:string;bg:string;glow:string}>={
  describe:{label:"Describe",  c:"#38BDF8",bg:"rgba(56,189,248,.15)",  glow:"rgba(56,189,248,.3)"},
  compare: {label:"Compare",   c:"#A78BFA",bg:"rgba(167,139,250,.15)", glow:"rgba(167,139,250,.3)"},
  past:    {label:"Past exp.", c:"#2DD4BF",bg:"rgba(45,212,191,.15)",  glow:"rgba(45,212,191,.3)"},
  roleplay:{label:"Role-play", c:"#FBBF24",bg:"rgba(251,191,36,.15)",  glow:"rgba(251,191,36,.3)"},
  mixed:   {label:"Mixed",     c:"#FB7185",bg:"rgba(251,113,133,.15)", glow:"rgba(251,113,133,.3)"},
};

/* ════════════════════════ STORAGE ════════════════════════ */
const FAV_KEY="opic-favs-v1";
function loadFavs():Fav[]{if(typeof window==="undefined")return[];try{return JSON.parse(localStorage.getItem(FAV_KEY)||"[]");}catch{return[];}}
function saveFavs(f:Fav[]){localStorage.setItem(FAV_KEY,JSON.stringify(f));}

/* ════════════════════════ API ════════════════════════ */
async function callAI(prompt:string,max=2500){
  const r=await fetch("/api/generate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt,maxTokens:max})});
  if(!r.ok)throw new Error("API error");return r.json();
}
async function callScore(question:string,answer:string,level:string):Promise<Score>{
  const r=await fetch("/api/score",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({question,answer,level})});
  if(!r.ok)throw new Error("Score error");return r.json();
}

/* ════════════════════════ TTS ════════════════════════ */
function useTTS(){
  const [idx,setIdx]=useState<number|null>(null);
  const stop=useCallback(()=>{if(typeof window!=="undefined")window.speechSynthesis?.cancel();setIdx(null);},[]);
  const toggle=useCallback((i:number,text:string)=>{
    if(idx===i){stop();return;}stop();
    if(typeof window==="undefined"||!window.speechSynthesis)return;
    setIdx(i);const u=new SpeechSynthesisUtterance(text);u.lang="en-US";u.rate=0.9;
    u.onend=()=>setIdx(null);u.onerror=()=>setIdx(null);window.speechSynthesis.speak(u);
  },[idx,stop]);
  return{speakIdx:idx,toggle,stop};
}

/* ════════════════════════ VIDEO BACKGROUND ════════════════════════ */
function VideoBackground(){
  const vRef=useRef<HTMLVideoElement>(null);
  useEffect(()=>{
    const v=vRef.current;if(!v)return;
    // Try to load HLS via native (Safari) or hls.js
    const hlsUrl="";// Set your HLS stream URL here e.g. "https://your-cdn.com/stream.m3u8"
    if(!hlsUrl)return;
    if(v.canPlayType("application/vnd.apple.mpegurl")){
      v.src=hlsUrl;
    } else {
      import("hls.js").then(({default:Hls})=>{
        if(Hls.isSupported()){
          const hls=new Hls({startLevel:-1,autoStartLoad:true});
          hls.loadSource(hlsUrl);hls.attachMedia(v);
          return()=>hls.destroy();
        }
      }).catch(()=>{});
    }
  },[]);
  return(
    <>
      {/* Animated orbs — always visible */}
      <div aria-hidden style={{position:"fixed",inset:0,zIndex:0,overflow:"hidden",pointerEvents:"none"}}>
        <div style={{position:"absolute",width:700,height:700,borderRadius:"50%",background:"radial-gradient(circle,rgba(56,189,248,.18) 0%,transparent 70%)",top:"-15%",left:"-10%",animation:"orbFloat 18s ease-in-out infinite"}}/>
        <div style={{position:"absolute",width:600,height:600,borderRadius:"50%",background:"radial-gradient(circle,rgba(167,139,250,.14) 0%,transparent 70%)",bottom:"-10%",right:"-5%",animation:"orbFloat2 22s ease-in-out infinite"}}/>
        <div style={{position:"absolute",width:400,height:400,borderRadius:"50%",background:"radial-gradient(circle,rgba(45,212,191,.1) 0%,transparent 70%)",top:"40%",right:"25%",animation:"orbFloat 26s ease-in-out infinite reverse"}}/>
        {/* Noise grain overlay */}
        <div style={{position:"absolute",inset:0,backgroundImage:"url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E\")",opacity:0.4}}/>
      </div>
      {/* HLS video (hidden until loaded) */}
      <video ref={vRef} autoPlay loop muted playsInline aria-hidden
        style={{position:"fixed",inset:0,width:"100%",height:"100%",objectFit:"cover",zIndex:-1,opacity:0.35}}/>
    </>
  );
}

/* ════════════════════════ GLASS ATOMS ════════════════════════ */
const G={
  card:(extra?:React.CSSProperties):React.CSSProperties=>({
    background:"rgba(255,255,255,0.055)",
    backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",
    border:"1px solid rgba(255,255,255,0.12)",
    borderRadius:20,...extra,
  }),
  badge:(c:string,bg:string):React.CSSProperties=>({
    display:"inline-block",padding:"3px 11px",borderRadius:20,
    fontSize:"0.68rem",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.5px",
    color:c,background:bg,border:`1px solid ${c}40`,
  }),
  btn:(variant:"primary"|"ghost"|"sm"|"danger"):React.CSSProperties=>({
    display:"inline-flex",alignItems:"center",gap:6,cursor:"pointer",
    fontFamily:"'DM Sans',sans-serif",fontWeight:600,border:"none",
    transition:"all .2s",
    ...(variant==="primary"?{
      padding:"11px 24px",borderRadius:12,fontSize:"0.9rem",
      background:"linear-gradient(135deg,#38BDF8,#0EA5E9)",color:"#fff",
      boxShadow:"0 4px 20px rgba(56,189,248,0.35)",
    }:variant==="ghost"?{
      padding:"9px 18px",borderRadius:10,fontSize:"0.85rem",
      background:"rgba(255,255,255,0.08)",color:"rgba(255,255,255,0.9)",
      border:"1px solid rgba(255,255,255,0.15)",backdropFilter:"blur(12px)",
    }:variant==="sm"?{
      padding:"6px 14px",borderRadius:8,fontSize:"0.78rem",
      background:"rgba(255,255,255,0.07)",color:"rgba(255,255,255,0.75)",
      border:"1px solid rgba(255,255,255,0.12)",backdropFilter:"blur(8px)",
    }:{
      padding:"6px 13px",borderRadius:8,fontSize:"0.78rem",
      background:"rgba(251,113,133,0.12)",color:"#FB7185",
      border:"1px solid rgba(251,113,133,0.25)",
    }),
  }),
};

/* ════════════════════════ ICONS ════════════════════════ */
const IcoSpeaker=()=><svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M2 4.5v5l4-2.5-4-2.5z" fill="currentColor"/><path d="M8 3.5c1.4.9 2.5 2 2.5 3.5S9.4 10.1 8 11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/><path d="M9.5 1.5c2.5 1.5 3.5 3 3.5 5.5s-1 4-3.5 5.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>;
const IcoPause=()=><svg width="13" height="13" viewBox="0 0 14 14" fill="none"><rect x="2" y="2" width="4" height="10" rx="1" fill="currentColor"/><rect x="8" y="2" width="4" height="10" rx="1" fill="currentColor"/></svg>;
const IcoHeart=(filled:boolean)=><svg width="14" height="14" viewBox="0 0 14 14" fill={filled?"#FB7185":"none"} stroke={filled?"#FB7185":"rgba(255,255,255,0.5)"} strokeWidth="1.5"><path d="M7 12S1 8.5 1 4.5A3 3 0 0 1 7 3.2 3 3 0 0 1 13 4.5C13 8.5 7 12 7 12z"/></svg>;
const IcoCheck=()=><svg width="9" height="9" viewBox="0 0 10 10"><polyline points="1,5 4,8 9,2" stroke="white" strokeWidth="2.2" fill="none"/></svg>;
const Wave=()=><span style={{display:"inline-flex",alignItems:"center",gap:2,marginLeft:3}}>{[8,13,6,10].map((h,i)=><span key={i} style={{display:"inline-block",width:3,height:h,borderRadius:2,background:"#2DD4BF",animation:`wave .7s ease ${[0,.12,.24,.06][i]}s infinite`}}/>)}</span>;

/* ════════════════════════ FLASHCARD ════════════════════════ */
function FlashCards({vocabs}:{vocabs:Vocab[]}){
  const [idx,setIdx]=useState(0);const [flip,setFlip]=useState(false);
  if(!vocabs?.length)return null;const v=vocabs[idx];
  return(
    <div style={{marginTop:16}}>
      <div style={{fontSize:"0.68rem",fontWeight:700,color:"rgba(56,189,248,.8)",textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:10}}>📖 Từ vựng ({vocabs.length} từ)</div>
      <div onClick={()=>setFlip(f=>!f)} style={{...G.card({padding:"22px 18px",textAlign:"center",cursor:"pointer",minHeight:100,transition:"all .28s",background:flip?"rgba(56,189,248,0.1)":"rgba(255,255,255,0.05)",borderColor:flip?"rgba(56,189,248,0.4)":"rgba(255,255,255,0.1)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:8})}}>
        {!flip
          ?<><div style={{fontFamily:"'Sora',sans-serif",fontWeight:700,fontSize:"1.3rem"}}>{v.word}</div><div style={{fontSize:"0.7rem",color:"rgba(255,255,255,0.4)"}}>Nhấn để xem nghĩa</div></>
          :<><div style={{fontFamily:"'Sora',sans-serif",fontWeight:700,fontSize:"1.1rem",color:"#38BDF8",marginBottom:4}}>{v.meaning}</div>{v.example&&<div style={{fontSize:"0.8rem",color:"rgba(255,255,255,0.55)",fontStyle:"italic"}}>"{v.example}"</div>}</>
        }
      </div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:14,marginTop:10}}>
        <button style={{...G.btn("sm"),width:30,height:30,padding:0,justifyContent:"center"}} disabled={idx===0} onClick={()=>{setIdx(i=>Math.max(0,i-1));setFlip(false);}}>←</button>
        <span style={{fontSize:"0.78rem",color:"rgba(255,255,255,0.5)",fontWeight:500}}>{idx+1}/{vocabs.length}</span>
        <button style={{...G.btn("sm"),width:30,height:30,padding:0,justifyContent:"center"}} disabled={idx===vocabs.length-1} onClick={()=>{setIdx(i=>Math.min(vocabs.length-1,i+1));setFlip(false);}}>→</button>
      </div>
    </div>
  );
}

/* ════════════════════════ KEY POINTS ════════════════════════ */
function KeyPoints({points}:{points:string[]}){
  if(!points?.length)return null;
  return(
    <div style={{marginTop:16}}>
      <div style={{fontSize:"0.68rem",fontWeight:700,color:"rgba(167,139,250,.8)",textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:10}}>🔍 Phân tích bài mẫu</div>
      <div style={{display:"grid",gap:7}}>
        {points.map((p,i)=>(
          <div key={i} style={{display:"flex",gap:10,alignItems:"flex-start",...G.card({padding:"10px 14px"})}}>
            <span style={{width:22,height:22,borderRadius:"50%",background:"linear-gradient(135deg,#A78BFA,#7C3AED)",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.68rem",fontWeight:700,flexShrink:0}}>{i+1}</span>
            <span style={{fontSize:"0.84rem",color:"rgba(255,255,255,0.8)",lineHeight:1.55}}>{p}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ════════════════════════ SCORE DISPLAY ════════════════════════ */
function ScoreDisplay({r}:{r:Score}){
  const sc=r.score;
  const[c,glow]=sc>=8?["#2DD4BF","rgba(45,212,191,.3)"]:sc>=6?["#38BDF8","rgba(56,189,248,.3)"]:sc>=4?["#FBBF24","rgba(251,191,36,.3)"]:["#FB7185","rgba(251,113,133,.3)"];
  return(
    <div style={{...G.card({padding:18,marginTop:14,borderColor:`${c}30`,background:`${c}0a`}),animation:"fadeUp .35s ease"}}>
      <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:12}}>
        <div style={{width:58,height:58,borderRadius:"50%",background:`linear-gradient(135deg,${c},${c}99)`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,boxShadow:`0 0 20px ${glow}`}}>
          <span style={{fontFamily:"'Sora',sans-serif",fontWeight:800,fontSize:"1.4rem",color:"#fff"}}>{sc}</span>
        </div>
        <div>
          <div style={{fontFamily:"'Sora',sans-serif",fontWeight:700,color:c,fontSize:"0.95rem",marginBottom:2}}>Điểm: {sc}/10</div>
          <div style={{fontSize:"0.78rem",color:"rgba(255,255,255,0.5)"}}>Tương đương cấp <strong style={{color:"rgba(255,255,255,0.85)"}}>{r.estimatedLevel}</strong></div>
        </div>
      </div>
      <div style={{fontSize:"0.86rem",color:"rgba(255,255,255,0.75)",lineHeight:1.7,marginBottom:12}}>{r.overall}</div>
      {r.strengths?.length>0&&<div style={{marginBottom:10}}>
        <div style={{fontSize:"0.68rem",fontWeight:700,color:c,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:6}}>Điểm mạnh</div>
        {r.strengths.map((s,i)=><div key={i} style={{fontSize:"0.83rem",color:"rgba(255,255,255,0.7)",padding:"2px 0"}}>✓ {s}</div>)}
      </div>}
      {r.improvements?.length>0&&<div>
        <div style={{fontSize:"0.68rem",fontWeight:700,color:"#FBBF24",textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:6}}>Cần cải thiện</div>
        {r.improvements.map((s,i)=><div key={i} style={{fontSize:"0.83rem",color:"rgba(255,255,255,0.65)",padding:"2px 0"}}>↑ {s}</div>)}
      </div>}
    </div>
  );
}

/* ════════════════════════ SAMPLE BLOCK ════════════════════════ */
interface SBP{q:Question;qi:number;level:string;topicName:string;speakIdx:number|null;toggleTTS:(i:number,t:string)=>void;shown:boolean;onToggle:()=>void;isFav:boolean;onToggleFav:()=>void;userAnswer:string;onAnswerChange:(v:string)=>void;score:Score|null;scoring:boolean;onScore:()=>void;vocabOpen:boolean;onVocabToggle:()=>void;kpOpen:boolean;onKpToggle:()=>void;}
function SampleBlock(p:SBP){
  const speaking=p.speakIdx===p.qi;
  return(
    <>
      <div style={{display:"flex",gap:8,alignItems:"center",marginTop:12,flexWrap:"wrap"}}>
        <button style={G.btn("sm")} onClick={p.onToggle}>{p.shown?"▲ Ẩn bài mẫu":"▼ Xem bài mẫu"}</button>
        {p.shown&&<>
          <button style={{...G.btn("sm"),color:speaking?"#2DD4BF":"rgba(255,255,255,0.75)",borderColor:speaking?"rgba(45,212,191,.4)":"rgba(255,255,255,.12)"}} onClick={()=>p.toggleTTS(p.qi,p.q.sample)}>
            {speaking?<IcoPause/>:<IcoSpeaker/>}{speaking?<><span>Đang đọc</span><Wave/></>:"Đọc to"}
          </button>
          {p.q.vocabulary?.length>0&&<button style={{...G.btn("sm"),color:"#38BDF8",borderColor:"rgba(56,189,248,.3)"}} onClick={p.onVocabToggle}>{p.vocabOpen?"Ẩn từ vựng":"📖 Từ vựng"}</button>}
          {p.q.keyPoints?.length>0&&<button style={{...G.btn("sm"),color:"#A78BFA",borderColor:"rgba(167,139,250,.3)"}} onClick={p.onKpToggle}>{p.kpOpen?"Ẩn phân tích":"🔍 Phân tích"}</button>}
          <button style={{...G.btn("sm"),color:p.isFav?"#FB7185":"rgba(255,255,255,0.6)",borderColor:p.isFav?"rgba(251,113,133,.35)":"rgba(255,255,255,.12)",gap:5}} onClick={p.onToggleFav}>{IcoHeart(p.isFav)}{p.isFav?"Đã lưu":"Lưu"}</button>
        </>}
      </div>
      {p.shown&&<div style={{...G.card({padding:18,borderLeft:"3px solid #2DD4BF",background:"rgba(45,212,191,0.07)",marginTop:12}),animation:"fadeUp .3s ease"}}>
        <div style={{fontSize:"0.68rem",fontWeight:700,color:"#2DD4BF",textTransform:"uppercase",letterSpacing:"0.6px",marginBottom:8}}>Bài mẫu — Cấp {p.level}</div>
        <div style={{fontSize:"0.9rem",color:"rgba(255,255,255,0.85)",lineHeight:1.82}}>{p.q.sample}</div>
      </div>}
      {p.shown&&p.vocabOpen&&p.q.vocabulary?.length>0&&<FlashCards vocabs={p.q.vocabulary}/>}
      {p.shown&&p.kpOpen&&p.q.keyPoints?.length>0&&<KeyPoints points={p.q.keyPoints}/>}
      <div style={{marginTop:14,...G.card({padding:16})}}>
        <div style={{fontSize:"0.68rem",fontWeight:700,color:"rgba(255,255,255,.4)",textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:10}}>✦ Luyện viết — Chấm điểm AI</div>
        <textarea value={p.userAnswer} onChange={e=>p.onAnswerChange(e.target.value)} placeholder="Nhập câu trả lời của bạn bằng tiếng Anh..." style={{minHeight:88}}/>
        <div style={{display:"flex",justifyContent:"flex-end",marginTop:10}}>
          <button style={{...G.btn("primary"),opacity:(!p.userAnswer.trim()||p.scoring)?.5:1,cursor:(!p.userAnswer.trim()||p.scoring)?"not-allowed":"pointer"}} onClick={p.onScore} disabled={!p.userAnswer.trim()||p.scoring}>
            {p.scoring?"⏳ Đang chấm...":"✦ Chấm điểm AI"}
          </button>
        </div>
        {p.score&&<ScoreDisplay r={p.score}/>}
      </div>
    </>
  );
}

/* ════════════════════════ QUESTION CARD ════════════════════════ */
function QCard(p:SBP&{showGroup?:boolean}){
  const grp=p.showGroup?TYPE_GROUPS.find(g=>p.qi>=g.range[0]&&p.qi<=g.range[1]):undefined;
  const tm=TMETA[p.q.type]||TMETA.describe;
  return(
    <div style={{...G.card({padding:24,marginBottom:14}),animation:"fadeUp .32s ease"}}>
      {grp&&<div style={{...G.card({padding:"8px 14px",marginBottom:14,background:"rgba(255,255,255,0.04)"}),display:"flex",gap:10,alignItems:"center"}}>
        <span style={{fontSize:"0.7rem",fontWeight:700,color:"rgba(255,255,255,.4)",textTransform:"uppercase",letterSpacing:"0.8px"}}>{grp.tag}</span>
        <span style={{fontFamily:"'Sora',sans-serif",fontWeight:700,fontSize:"0.85rem"}}>{grp.label}</span>
        <span style={{color:"rgba(255,255,255,.35)",fontSize:"0.8rem"}}>— {grp.vi}</span>
      </div>}
      <div style={{display:"flex",alignItems:"flex-start",gap:14,marginBottom:14}}>
        <div style={{width:38,height:38,borderRadius:"50%",background:`linear-gradient(135deg,${tm.c}40,${tm.c}20)`,border:`1px solid ${tm.c}50`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Sora',sans-serif",fontWeight:700,fontSize:"0.88rem",color:tm.c,flexShrink:0}}>{p.qi+1}</div>
        <div style={{flex:1}}>
          <span style={{...G.badge(tm.c,tm.bg),marginBottom:10}}>{tm.label}</span>
          <div style={{...G.card({padding:"15px 18px",borderLeft:`3px solid ${tm.c}60`,background:tm.bg}),fontFamily:"'Sora',sans-serif",fontWeight:600,fontSize:"0.97rem",lineHeight:1.65}}>{p.q.question}</div>
        </div>
      </div>
      <div style={{...G.card({padding:"12px 15px",borderLeft:"3px solid rgba(251,191,36,.5)",background:"rgba(251,191,36,0.08)"}),marginBottom:12}}>
        <div style={{fontSize:"0.68rem",fontWeight:700,color:"#FBBF24",textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:5}}>Gợi ý trả lời</div>
        <div style={{fontSize:"0.86rem",color:"rgba(255,255,255,0.75)",lineHeight:1.65}}>{p.q.tip}</div>
      </div>
      <SampleBlock {...p}/>
    </div>
  );
}

/* ════════════════════════ HEADER ════════════════════════ */
function Header({page,onHome,onGuide,onFavs,favCount}:{page:Page;onHome:()=>void;onGuide:()=>void;onFavs:()=>void;favCount:number}){
  return(
    <header style={{position:"fixed",top:0,left:0,right:0,zIndex:100,padding:"0 28px",height:64,display:"flex",alignItems:"center",justifyContent:"space-between",background:"rgba(5,8,16,0.55)",backdropFilter:"blur(28px)",WebkitBackdropFilter:"blur(28px)",borderBottom:"1px solid rgba(255,255,255,0.08)"}}>
      <div style={{display:"flex",alignItems:"center",gap:12,cursor:"pointer"}} onClick={onHome}>
        <div style={{width:36,height:36,borderRadius:10,background:"linear-gradient(135deg,rgba(56,189,248,.25),rgba(56,189,248,.1))",border:"1px solid rgba(56,189,248,.3)",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Sora',sans-serif",fontWeight:800,fontSize:13,color:"#38BDF8"}}>Op</div>
        <span style={{fontFamily:"'Sora',sans-serif",fontWeight:700,fontSize:"1.1rem",letterSpacing:"-0.2px"}}>OPIc Learn</span>
      </div>
      <nav style={{display:"flex",gap:2,background:"rgba(255,255,255,0.05)",borderRadius:12,padding:"3px",border:"1px solid rgba(255,255,255,0.08)"}}>
        {([["home","Trang chủ"],["guide","Hướng dẫn"]] as [string,string][]).map(([k,v])=>(
          <button key={k} style={{padding:"6px 16px",borderRadius:9,border:"none",cursor:"pointer",fontSize:"0.8rem",fontWeight:500,fontFamily:"'DM Sans',sans-serif",background:page===k?"rgba(255,255,255,0.1)":"transparent",color:page===k?"#fff":"rgba(255,255,255,0.55)",transition:"all .18s"}} onClick={k==="guide"?onGuide:onHome}>{v}</button>
        ))}
        <button style={{padding:"6px 14px",borderRadius:9,border:"none",cursor:"pointer",fontSize:"0.8rem",fontWeight:600,fontFamily:"'DM Sans',sans-serif",background:page==="favs"?"rgba(251,113,133,0.15)":"transparent",color:page==="favs"?"#FB7185":"rgba(255,255,255,0.5)",transition:"all .18s",display:"flex",alignItems:"center",gap:5}} onClick={onFavs}>
          {IcoHeart(favCount>0)}Đã lưu{favCount>0&&<span style={{background:"#FB7185",color:"#fff",borderRadius:20,fontSize:"0.62rem",fontWeight:700,padding:"1px 6px"}}>{favCount}</span>}
        </button>
      </nav>
    </header>
  );
}

/* ════════════════════════ SHARED ════════════════════════ */
const ProgBar=({pct}:{pct:number})=>(
  <div style={{height:3,background:"rgba(255,255,255,0.08)",borderRadius:2,overflow:"hidden",marginBottom:22}}>
    <div style={{height:"100%",width:`${pct}%`,background:"linear-gradient(90deg,#38BDF8,#2DD4BF)",borderRadius:2,transition:"width .45s ease",boxShadow:"0 0 8px rgba(56,189,248,0.5)"}}/>
  </div>
);
const LvGrid=({level,setLevel}:{level:string;setLevel:(v:string)=>void})=>(
  <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8,marginBottom:16}}>
    {LEVELS.map(lv=>(
      <div key={lv.id} style={{...G.card({padding:"12px 8px",background:level===lv.id?"rgba(56,189,248,0.12)":"rgba(255,255,255,0.05)",borderColor:level===lv.id?"rgba(56,189,248,0.5)":"rgba(255,255,255,0.1)"}),cursor:"pointer",textAlign:"center",transition:"all .18s"}} onClick={()=>setLevel(lv.id)}>
        <div style={{fontFamily:"'Sora',sans-serif",fontWeight:700,fontSize:"1rem",color:level===lv.id?"#38BDF8":"rgba(255,255,255,0.85)",marginBottom:2}}>{lv.label}</div>
        <div style={{fontSize:"0.66rem",color:"rgba(255,255,255,0.4)"}}>{lv.sub}</div>
      </div>
    ))}
  </div>
);
const Spinner=()=><div style={{width:44,height:44,border:"3px solid rgba(255,255,255,0.08)",borderTopColor:"#38BDF8",borderRadius:"50%",animation:"spin .75s linear infinite",margin:"0 auto 18px"}}/>;
const TopBar=({title,onBack,extra}:{title:string;onBack:()=>void;extra?:React.ReactNode})=>(
  <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:24}}>
    <button style={G.btn("sm")} onClick={onBack}>← Quay lại</button>
    <span style={{fontFamily:"'Sora',sans-serif",fontWeight:700,fontSize:"0.95rem"}}>{title}</span>
    {extra&&<div style={{marginLeft:"auto"}}>{extra}</div>}
  </div>
);

/* ════════════════════════ MAIN APP ════════════════════════ */
export default function App(){
  const [page,setPage]         = useState<Page>("home");
  const [mode,setMode]         = useState<"topic"|"exam"|null>(null);
  const [topic,setTopic]       = useState<string|null>(null);
  const [topicLv,setTopicLv]   = useState("IM2");
  const [sqIdx,setSqIdx]       = useState(0);
  const [sqAns,setSqAns]       = useState<Record<string,number|number[]>>({});
  const [examLv,setExamLv]     = useState("IM2");
  const [examQs,setExamQs]     = useState<Question[]>([]);
  const [examIdx,setExamIdx]   = useState(0);
  const [topicQs,setTopicQs]   = useState<Question[]>([]);
  const [loading,setLoading]   = useState(false);
  const [favs,setFavs]         = useState<Fav[]>([]);
  const [shown,setShown]       = useState<Record<number,boolean>>({});
  const [vocabOpen,setVocabOpen]= useState<Record<number,boolean>>({});
  const [kpOpen,setKpOpen]     = useState<Record<number,boolean>>({});
  const [answers,setAnswers]   = useState<Record<number,string>>({});
  const [scores,setScores]     = useState<Record<number,Score>>({});
  const [scoring,setScoring]   = useState<Record<number,boolean>>({});
  const {speakIdx,toggle:tts,stop:stopSpeech}=useTTS();

  useEffect(()=>{setFavs(loadFavs());},[]);

  const tp=TOPICS.find(t=>t.id===topic);
  const topicName=tp?.name||"";

  const goHome=useCallback(()=>{
    stopSpeech();setPage("home");setMode(null);setTopic(null);
    setTopicQs([]);setExamQs([]);setExamIdx(0);
    setShown({});setVocabOpen({});setKpOpen({});
    setAnswers({});setScores({});setScoring({});setLoading(false);
    setSqIdx(0);setSqAns({});
  },[stopSpeech]);

  const isFav=(q:string)=>favs.some(f=>f.questionText===q);
  const toggleFav=(q:Question,level:string)=>{
    const ex=favs.find(f=>f.questionText===q.question);
    const next=ex?favs.filter(f=>f.questionText!==q.question):[...favs,{id:Date.now().toString(),questionText:q.question,sample:q.sample,topicName,level,type:q.type,savedAt:new Date().toLocaleDateString("vi-VN")}];
    setFavs(next);saveFavs(next);
  };
  const handleScore=async(qi:number,q:Question,level:string)=>{
    const ans=answers[qi]?.trim();if(!ans)return;
    setScoring(p=>({...p,[qi]:true}));
    try{const r=await callScore(q.question,ans,level);setScores(p=>({...p,[qi]:r}));}
    catch{alert("Lỗi chấm điểm.");}
    finally{setScoring(p=>({...p,[qi]:false}));}
  };

  const curSQ=SQS[sqIdx];
  const canNext=(()=>{const a=sqAns[curSQ?.id];if(curSQ?.multi)return Array.isArray(a)&&a.length>0;return a!==undefined&&a!==null;})();
  const selOpt=(i:number)=>{
    const q=SQS[sqIdx];
    if(q.multi){const cur=(sqAns[q.id] as number[]|undefined)||[];setSqAns(p=>({...p,[q.id]:cur.includes(i)?cur.filter(x=>x!==i):[...cur,i]}));}
    else{setSqAns(p=>({...p,[q.id]:i}));}
  };

  async function startTopic(){
    if(!topic)return;
    setPage("topic");setLoading(true);setTopicQs([]);setShown({});setVocabOpen({});setKpOpen({});setAnswers({});setScores({});
    try{
      const data=await callAI(`You are an OPIc expert. Generate 5 practice questions for the topic "${topicName}" at ${topicLv} level.
Return ONLY valid JSON (no markdown):
{"questions":[{"type":"describe","question":"...","tip":"(Vietnamese tip)...","sample":"(English ${topicLv}, 4-6 natural sentences)...","vocabulary":[{"word":"...","meaning":"...(Vietnamese)","example":"...(English)"},{"word":"...","meaning":"...","example":"..."},{"word":"...","meaning":"...","example":"..."},{"word":"...","meaning":"...","example":"..."},{"word":"...","meaning":"...","example":"..."}],"keyPoints":["Mở bài: ...","Nội dung chính: ...","Chi tiết cụ thể: ...","Kết luận: ..."]},{"type":"compare",...},{"type":"past",...},{"type":"roleplay",...},{"type":"describe",...}]}`,3800);
      setTopicQs(data.questions||[]);
    }catch{alert("Lỗi tải câu hỏi. Thử lại!");goHome();}
    finally{setLoading(false);}
  }

  async function generateExam(){
    setPage("exam");setLoading(true);setExamQs([]);setExamIdx(0);setShown({});setAnswers({});setScores({});
    const profile=SQS.map(q=>{const a=sqAns[q.id];if(q.multi)return `${q.q}: ${((a as number[])||[]).map(i=>q.opts[i]).join(", ")||"N/A"}`;return `${q.q}: ${a!==undefined?q.opts[a as number]:"N/A"}`;}).join("\n");
    try{
      const data=await callAI(`You are an OPIc exam generator. Create a personalised 15-question OPIc exam.
Test taker profile:\n${profile}\nTarget level: ${examLv}
Q1-3: "describe", Q4-6: "compare", Q7-9: "past", Q10-12: "roleplay", Q13-15: "mixed"
Return ONLY valid JSON:
{"questions":[{"type":"describe","question":"...","tip":"(Vietnamese)...","sample":"(English ${examLv} 4-6 sentences)...","vocabulary":[],"keyPoints":[]},... 15 total]}`,5500);
      setExamQs(data.questions||[]);
    }catch{alert("Lỗi tạo đề thi. Thử lại!");goHome();}
    finally{setLoading(false);}
  }

  const qp=(q:Question,qi:number,level:string,showGroup=false)=>({
    q,qi,level,topicName,speakIdx,toggleTTS:tts,
    shown:!!shown[qi],onToggle:()=>setShown(p=>({...p,[qi]:!p[qi]})),
    isFav:isFav(q.question),onToggleFav:()=>toggleFav(q,level),
    userAnswer:answers[qi]||"",onAnswerChange:(v:string)=>setAnswers(p=>({...p,[qi]:v})),
    score:scores[qi]||null,scoring:!!scoring[qi],onScore:()=>handleScore(qi,q,level),
    vocabOpen:!!vocabOpen[qi],onVocabToggle:()=>setVocabOpen(p=>({...p,[qi]:!p[qi]})),
    kpOpen:!!kpOpen[qi],onKpToggle:()=>setKpOpen(p=>({...p,[qi]:!p[qi]})),
    showGroup,
  });

  /* Shared layout wrapper for inner pages */
  const InnerPage=({children,maxW=760}:{children:React.ReactNode;maxW?:number})=>(
    <div style={{minHeight:"100vh",position:"relative"}}>
      <VideoBackground/>
      <Header page={page} onHome={goHome} onGuide={()=>setPage("guide")} onFavs={()=>setPage("favs")} favCount={favs.length}/>
      <div style={{maxWidth:maxW,margin:"0 auto",padding:"88px 20px 48px",minHeight:"100vh"}}>
        {children}
      </div>
    </div>
  );

  const LoadScreen=({text,sub}:{text:string;sub?:string})=>(
    <div style={{textAlign:"center",padding:"80px 20px"}}>
      <Spinner/>
      <p style={{fontSize:"0.95rem",color:"rgba(255,255,255,0.65)",marginBottom:4}}>{text}</p>
      {sub&&<p style={{fontSize:"0.8rem",color:"rgba(255,255,255,0.35)"}}>{sub}</p>}
    </div>
  );

  /* ══ HOME ══ */
  if(page==="home") return(
    <div style={{minHeight:"100vh",position:"relative",overflow:"hidden"}}>
      <VideoBackground/>
      <Header page="home" onHome={goHome} onGuide={()=>setPage("guide")} onFavs={()=>setPage("favs")} favCount={favs.length}/>

      {/* Hero — bottom-left */}
      <div style={{position:"fixed",bottom:0,left:0,right:0,padding:"0 48px 52px",zIndex:10,pointerEvents:"none"}}>
        {/* Gradient fade */}
        <div style={{position:"absolute",inset:0,background:"linear-gradient(to top, rgba(5,8,16,0.92) 0%, rgba(5,8,16,0.6) 50%, transparent 100%)",pointerEvents:"none"}}/>
        <div style={{position:"relative",maxWidth:680,animation:"fadeUp .6s ease"}}>
          <div style={{display:"inline-flex",alignItems:"center",gap:8,background:"rgba(56,189,248,0.12)",border:"1px solid rgba(56,189,248,0.25)",borderRadius:20,padding:"4px 14px",marginBottom:20,backdropFilter:"blur(12px)"}}>
            <span style={{width:7,height:7,borderRadius:"50%",background:"#38BDF8",boxShadow:"0 0 8px #38BDF8",display:"inline-block"}}/>
            <span style={{fontSize:"0.75rem",fontWeight:600,color:"#38BDF8",letterSpacing:"0.5px"}}>AI-Powered OPIc Training</span>
          </div>
          <h1 style={{fontFamily:"'Sora',sans-serif",fontWeight:900,fontSize:"clamp(2.2rem,5vw,3.6rem)",lineHeight:1.08,letterSpacing:"-1.5px",marginBottom:16,color:"#fff",textShadow:"0 2px 30px rgba(0,0,0,0.5)"}}>
            Luyện thi OPIc<br/><span style={{background:"linear-gradient(135deg,#38BDF8 0%,#2DD4BF 100%)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>thông minh hơn.</span>
          </h1>
          <p style={{fontSize:"clamp(0.95rem,2vw,1.1rem)",color:"rgba(255,255,255,0.6)",lineHeight:1.65,marginBottom:28,maxWidth:500}}>Học theo chủ đề hoặc thi thử 15 câu giống đề thật. Kèm flashcard, phân tích bài mẫu và chấm điểm AI.</p>
          <div style={{display:"flex",gap:12,flexWrap:"wrap",pointerEvents:"all"}}>
            <button style={{...G.btn("primary"),fontSize:"0.95rem",padding:"13px 28px"}} onClick={()=>setMode("topic")}>📝 Luyện theo chủ đề</button>
            <button style={{...G.btn("ghost"),fontSize:"0.95rem",padding:"13px 28px"}} onClick={()=>setMode("exam")}>🎯 Thi thử OPIc thật</button>
          </div>
        </div>
      </div>

      {/* Overlay panel slides up from bottom when mode selected */}
      {mode&&(
        <div style={{position:"fixed",bottom:0,left:0,right:0,zIndex:20,maxHeight:"72vh",overflow:"auto",background:"rgba(5,8,16,0.75)",backdropFilter:"blur(32px)",WebkitBackdropFilter:"blur(32px)",borderTop:"1px solid rgba(255,255,255,0.1)",borderRadius:"24px 24px 0 0",padding:"28px",animation:"fadeUp .35s ease"}}>
          <div style={{maxWidth:780,margin:"0 auto"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:22}}>
              <span style={{fontFamily:"'Sora',sans-serif",fontWeight:700,fontSize:"1rem"}}>{mode==="topic"?"📝 Luyện theo chủ đề":"🎯 Thi thử OPIc thật"}</span>
              <button style={G.btn("sm")} onClick={()=>setMode(null)}>✕</button>
            </div>

            {mode==="topic"&&<>
              <div style={{fontSize:"0.8rem",color:"rgba(255,255,255,0.5)",marginBottom:10,fontWeight:600}}>① Cấp độ mong muốn</div>
              <LvGrid level={topicLv} setLevel={setTopicLv}/>
              <div style={{fontSize:"0.8rem",color:"rgba(255,255,255,0.5)",marginBottom:10,fontWeight:600,marginTop:18}}>② Chủ đề luyện tập</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(120px,1fr))",gap:8,marginBottom:20}}>
                {TOPICS.map(t=>(
                  <div key={t.id} style={{...G.card({padding:"12px 8px",background:topic===t.id?"rgba(56,189,248,0.12)":"rgba(255,255,255,0.04)",borderColor:topic===t.id?"rgba(56,189,248,0.45)":"rgba(255,255,255,0.08)"}),cursor:"pointer",textAlign:"center",transition:"all .18s",fontSize:"0.8rem",fontWeight:topic===t.id?600:400,color:topic===t.id?"#38BDF8":"rgba(255,255,255,0.65)"}} onClick={()=>setTopic(t.id)}>
                    <span style={{fontSize:20,display:"block",marginBottom:5}}>{t.icon}</span>{t.name}
                  </div>
                ))}
              </div>
              <div style={{display:"flex",justifyContent:"flex-end"}}>
                <button style={{...G.btn("primary"),opacity:topic?1:0.45,cursor:topic?"pointer":"not-allowed"}} onClick={()=>topic&&startTopic()}>Bắt đầu luyện tập →</button>
              </div>
            </>}

            {mode==="exam"&&<>
              <div style={{display:"flex",gap:14,marginBottom:20}}>
                <span style={{fontSize:26,flexShrink:0}}>📋</span>
                <div>
                  <div style={{fontFamily:"'Sora',sans-serif",fontWeight:700,marginBottom:8}}>Quy trình thi thử</div>
                  <ol style={{paddingLeft:18,color:"rgba(255,255,255,0.55)",fontSize:"0.86rem",lineHeight:2.1}}>
                    <li><strong style={{color:"rgba(255,255,255,0.8)"}}>Khảo sát nền</strong> — 7 câu giống Background Survey thật</li>
                    <li><strong style={{color:"rgba(255,255,255,0.8)"}}>Chọn cấp độ</strong> — IM1 / IM2 / IM3 / IH / AL</li>
                    <li><strong style={{color:"rgba(255,255,255,0.8)"}}>15 câu cá nhân hoá</strong> + bài mẫu, flashcard, chấm điểm</li>
                  </ol>
                </div>
              </div>
              <div style={{display:"flex",justifyContent:"flex-end"}}>
                <button style={G.btn("primary")} onClick={()=>{setSqIdx(0);setSqAns({});setPage("survey");}}>Bắt đầu khảo sát →</button>
              </div>
            </>}
          </div>
        </div>
      )}
    </div>
  );

  /* ══ TOPIC ══ */
  if(page==="topic") return(
    <InnerPage>
      {loading?<LoadScreen text={`AI đang tạo câu hỏi cho "${tp?.name}"...`} sub="Bao gồm từ vựng flashcard và phân tích bài mẫu"/>:(
        <>
          <TopBar title={`${tp?.icon} ${tp?.name} — Cấp ${topicLv}`} onBack={goHome} extra={<button style={G.btn("sm")} onClick={()=>{stopSpeech();setTopicQs([]);setShown({});setVocabOpen({});setKpOpen({});setAnswers({});setScores({});startTopic();}}>🔄 Tạo lại</button>}/>
          {topicQs.map((q,i)=><QCard key={i} {...qp(q,i,topicLv)}/>)}
        </>
      )}
    </InnerPage>
  );

  /* ══ SURVEY ══ */
  if(page==="survey"){
    const q=SQS[sqIdx];const ans=sqAns[q.id];const isMul=q.multi;
    const selArr=isMul?((ans as number[])||[]):[];const selS=isMul?-1:(ans as number??-1);
    return(
      <InnerPage maxW={640}>
        <TopBar title="Khảo sát nền OPIc" onBack={goHome}/>
        {/* Stepper */}
        <div style={{display:"flex",alignItems:"center",marginBottom:24}}>
          {SQS.map((_,i)=>(
            <span key={i} style={{display:"flex",alignItems:"center",flex:i<SQS.length-1?1:"none"}}>
              <span style={{width:26,height:26,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.68rem",fontWeight:700,flexShrink:0,background:i<sqIdx?"rgba(45,212,191,.2)":i===sqIdx?"linear-gradient(135deg,#38BDF8,#0EA5E9)":"rgba(255,255,255,.06)",color:i<sqIdx?"#2DD4BF":i===sqIdx?"#fff":"rgba(255,255,255,.3)",boxShadow:i===sqIdx?"0 0 14px rgba(56,189,248,.4)":"none"}}>{i<sqIdx?"✓":i+1}</span>
              {i<SQS.length-1&&<span style={{flex:1,height:1,background:"rgba(255,255,255,0.08)",minWidth:6}}/>}
            </span>
          ))}
        </div>
        <div style={G.card({padding:28})}>
          <ProgBar pct={(sqIdx/SQS.length)*100}/>
          <div style={{fontSize:"0.68rem",fontWeight:700,color:"rgba(255,255,255,.35)",textTransform:"uppercase",letterSpacing:"0.7px",marginBottom:8}}>Câu {sqIdx+1} / {SQS.length}</div>
          <div style={{fontFamily:"'Sora',sans-serif",fontWeight:600,fontSize:"1.05rem",lineHeight:1.55,marginBottom:18}}>{q.q}</div>
          {isMul&&<p style={{fontSize:"0.75rem",color:"rgba(255,255,255,.35)",marginBottom:12}}>Có thể chọn nhiều đáp án</p>}
          <div style={{display:"grid",gap:8}}>
            {q.opts.map((opt,i)=>{
              const sel=isMul?selArr.includes(i):selS===i;
              return(
                <div key={i} style={{...G.card({padding:"11px 15px",background:sel?"rgba(56,189,248,0.1)":"rgba(255,255,255,0.04)",borderColor:sel?"rgba(56,189,248,0.4)":"rgba(255,255,255,0.08)"}),cursor:"pointer",display:"flex",alignItems:"center",gap:10,fontSize:"0.87rem",fontWeight:sel?500:400,color:sel?"#fff":"rgba(255,255,255,0.65)",transition:"all .18s"}} onClick={()=>selOpt(i)}>
                  {isMul
                    ?<span style={{width:18,height:18,borderRadius:4,border:`1.5px solid ${sel?"#38BDF8":"rgba(255,255,255,.2)"}`,background:sel?"#38BDF8":"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{sel&&<IcoCheck/>}</span>
                    :<span style={{width:18,height:18,borderRadius:"50%",border:`1.5px solid ${sel?"#38BDF8":"rgba(255,255,255,.2)"}`,background:sel?"#38BDF8":"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{sel&&<span style={{width:7,height:7,borderRadius:"50%",background:"#fff",display:"block"}}/>}</span>
                  }{opt}
                </div>
              );
            })}
          </div>
          <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:22}}>
            {sqIdx>0&&<button style={G.btn("ghost")} onClick={()=>setSqIdx(sqIdx-1)}>← Trước</button>}
            <button style={{...G.btn("primary"),opacity:canNext?1:0.45,cursor:canNext?"pointer":"not-allowed"}} onClick={()=>canNext&&(sqIdx<SQS.length-1?setSqIdx(sqIdx+1):setPage("level"))}>
              {sqIdx<SQS.length-1?"Tiếp theo →":"Hoàn thành →"}
            </button>
          </div>
        </div>
      </InnerPage>
    );
  }

  /* ══ LEVEL ══ */
  if(page==="level") return(
    <InnerPage maxW={600}>
      <TopBar title="Chọn cấp độ mục tiêu" onBack={()=>{setSqIdx(SQS.length-1);setPage("survey");}}/>
      <div style={G.card({padding:28})}>
        <p style={{color:"rgba(255,255,255,0.55)",fontSize:"0.87rem",marginBottom:18}}>AI sẽ tạo 15 câu hỏi phù hợp với cấp độ bạn chọn.</p>
        <LvGrid level={examLv} setLevel={setExamLv}/>
        <div style={{...G.card({padding:"13px 15px",background:"rgba(255,255,255,0.03)"}),fontSize:"0.8rem",color:"rgba(255,255,255,0.45)",lineHeight:1.9,marginBottom:18}}>
          <strong style={{color:"rgba(255,255,255,0.65)"}}>Thang điểm:</strong> NL → NM → NH → <strong style={{color:"#38BDF8"}}>IM1 → IM2 → IM3</strong> → IH → AL
        </div>
        <div style={{display:"flex",justifyContent:"flex-end"}}>
          <button style={G.btn("primary")} onClick={generateExam}>🎯 Tạo đề thi (15 câu) →</button>
        </div>
      </div>
    </InnerPage>
  );

  /* ══ EXAM ══ */
  if(page==="exam") return(
    <InnerPage>
      {loading?<LoadScreen text="AI đang tạo đề thi cá nhân hoá..." sub={`Cấp ${examLv} · 15 câu`}/>:(
        examQs.length>0&&<>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
            <button style={G.btn("sm")} onClick={()=>{stopSpeech();goHome();}}>✕ Thoát</button>
            <div style={{textAlign:"center"}}>
              <div style={{fontFamily:"'Sora',sans-serif",fontWeight:700,fontSize:"0.88rem"}}>Đề thi thử · Cấp {examLv}</div>
              <div style={{fontSize:"0.74rem",color:"rgba(255,255,255,.35)"}}>Câu {examIdx+1} / {examQs.length}</div>
            </div>
            <span style={{fontSize:"0.8rem",fontWeight:700,color:"#38BDF8"}}>{Math.round(((examIdx+1)/examQs.length)*100)}%</span>
          </div>
          <ProgBar pct={((examIdx+1)/examQs.length)*100}/>
          <QCard {...qp(examQs[examIdx],examIdx,examLv,true)}/>
          <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:6}}>
            {examIdx>0&&<button style={G.btn("ghost")} onClick={()=>{stopSpeech();setExamIdx(examIdx-1);setShown({});}}>← Câu trước</button>}
            {examIdx<examQs.length-1
              ?<button style={G.btn("primary")} onClick={()=>{stopSpeech();setExamIdx(examIdx+1);setShown({});}}>Câu tiếp →</button>
              :<button style={G.btn("primary")} onClick={()=>{stopSpeech();setPage("done");}}>🏁 Hoàn thành</button>}
          </div>
        </>
      )}
    </InnerPage>
  );

  /* ══ DONE ══ */
  if(page==="done") return(
    <InnerPage>
      <div style={{textAlign:"center",padding:"60px 24px"}}>
        <div style={{fontSize:56,marginBottom:20}}>🏁</div>
        <h2 style={{fontFamily:"'Sora',sans-serif",fontWeight:700,fontSize:"1.6rem",marginBottom:8}}>Hoàn thành bài thi thử!</h2>
        <p style={{color:"rgba(255,255,255,0.55)",marginBottom:6}}>Cấp độ: <strong style={{color:"#38BDF8"}}>{examLv}</strong> · {examQs.length} câu</p>
        <p style={{color:"rgba(255,255,255,0.45)",marginBottom:32}}>Xem lại bài mẫu và tự chấm điểm từng câu.</p>
        <div style={{display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap"}}>
          <button style={G.btn("ghost")} onClick={()=>{setPage("exam");setExamIdx(0);setShown({});}}>Xem lại bài thi</button>
          <button style={G.btn("ghost")} onClick={()=>setPage("favs")}>Xem bài đã lưu</button>
          <button style={G.btn("primary")} onClick={goHome}>Thi thử lại</button>
        </div>
      </div>
    </InnerPage>
  );

  /* ══ FAVORITES ══ */
  if(page==="favs") return(
    <InnerPage>
      <TopBar title={`Bài đã lưu (${favs.length})`} onBack={goHome}/>
      {favs.length===0
        ?<div style={{...G.card({padding:"48px 24px"}),textAlign:"center"}}>
          <div style={{fontSize:40,marginBottom:14}}>💔</div>
          <div style={{fontFamily:"'Sora',sans-serif",fontWeight:700,marginBottom:8}}>Chưa có bài nào được lưu</div>
          <div style={{color:"rgba(255,255,255,0.45)",fontSize:"0.87rem",marginBottom:22}}>Mở bài mẫu và nhấn "Lưu" để lưu vào đây.</div>
          <button style={G.btn("primary")} onClick={goHome}>Bắt đầu luyện tập</button>
        </div>
        :favs.map(f=>{const tm=TMETA[f.type]||TMETA.describe;return(
          <div key={f.id} style={{...G.card({padding:22,marginBottom:12})}}>
            <div style={{display:"flex",justifyContent:"space-between",gap:12,marginBottom:10}}>
              <div style={{flex:1}}>
                <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:8,flexWrap:"wrap"}}>
                  <span style={G.badge(tm.c,tm.bg)}>{tm.label}</span>
                  <span style={{fontSize:"0.72rem",color:"rgba(255,255,255,0.35)"}}>{f.topicName} · Cấp {f.level} · {f.savedAt}</span>
                </div>
                <div style={{fontFamily:"'Sora',sans-serif",fontWeight:600,fontSize:"0.95rem",lineHeight:1.55,marginBottom:12}}>{f.questionText}</div>
              </div>
              <button style={{...G.btn("danger"),flexShrink:0,alignSelf:"flex-start"}} onClick={()=>{const n=favs.filter(x=>x.id!==f.id);setFavs(n);saveFavs(n);}}>✕</button>
            </div>
            <div style={{...G.card({padding:16,borderLeft:"3px solid rgba(45,212,191,.5)",background:"rgba(45,212,191,0.06)"})}}>
              <div style={{fontSize:"0.68rem",fontWeight:700,color:"#2DD4BF",textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:6}}>Bài mẫu</div>
              <div style={{fontSize:"0.87rem",color:"rgba(255,255,255,0.78)",lineHeight:1.8}}>{f.sample}</div>
            </div>
          </div>
        );})}
    </InnerPage>
  );

  /* ══ GUIDE ══ */
  if(page==="guide") return(
    <InnerPage maxW={680}>
      <TopBar title="Cấp độ & Hướng dẫn OPIc" onBack={goHome}/>
      <div style={{...G.card({padding:24,marginBottom:14})}}>
        <div style={{fontFamily:"'Sora',sans-serif",fontWeight:700,fontSize:"0.9rem",marginBottom:16,color:"rgba(255,255,255,0.8)"}}>Thang cấp độ OPIc</div>
        {[{lv:"Novice Low/Mid/High",t:"describe",d:"Trả lời bằng từ đơn, cụm từ ngắn. Rất hạn chế về từ vựng và ngữ pháp."},
          {lv:"IM1 / IM2 / IM3",t:"past",d:"Câu đơn giản, mô tả được chủ đề quen thuộc. Phổ biến nhất cho người đi làm."},
          {lv:"Intermediate High",t:"compare",d:"Câu ghép, mô tả và so sánh tốt. Xử lý được tình huống bất ngờ."},
          {lv:"Advanced Low",t:"roleplay",d:"Đoạn văn dài, lập luận logic, thuyết phục. Gần như lưu loát."},
        ].map(x=>{const tm=TMETA[x.t];return(
          <div key={x.lv} style={{display:"flex",alignItems:"flex-start",gap:12,padding:"12px 0",borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
            <span style={{...G.badge(tm.c,tm.bg),flexShrink:0,whiteSpace:"nowrap"}}>{x.lv}</span>
            <span style={{fontSize:"0.84rem",color:"rgba(255,255,255,0.55)",paddingTop:4}}>{x.d}</span>
          </div>
        );})}
      </div>
      <div style={G.card({padding:24})}>
        <div style={{fontFamily:"'Sora',sans-serif",fontWeight:700,fontSize:"0.9rem",marginBottom:14,color:"rgba(255,255,255,0.8)"}}>Cấu trúc 15 câu OPIc</div>
        {TYPE_GROUPS.map(g=>(
          <div key={g.tag} style={{display:"flex",gap:14,padding:"11px 0",borderBottom:"1px solid rgba(255,255,255,0.05)",alignItems:"center"}}>
            <span style={{fontFamily:"'Sora',sans-serif",fontWeight:700,fontSize:"0.75rem",color:"#38BDF8",minWidth:52}}>{g.tag}</span>
            <span style={{fontWeight:600,fontSize:"0.87rem"}}>{g.label}</span>
            <span style={{color:"rgba(255,255,255,0.35)",fontSize:"0.8rem"}}>— {g.vi}</span>
          </div>
        ))}
      </div>
      <div style={{display:"flex",justifyContent:"center",marginTop:24}}>
        <button style={G.btn("primary")} onClick={()=>{setMode("exam");setPage("home");}}>Bắt đầu thi thử →</button>
      </div>
    </InnerPage>
  );

  return null;
}
