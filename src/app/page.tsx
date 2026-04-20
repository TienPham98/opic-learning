"use client";
import { useState, useCallback, useEffect, useRef } from "react";

/* ═══════════════════════════ TYPES ═══════════════════════════ */
interface Vocab    { word:string; meaning:string; example:string; }
interface Question { type:string; question:string; tip:string; sample:string; vocabulary:Vocab[]; keyPoints:string[]; }
interface Score    { score:number; estimatedLevel:string; strengths:string[]; improvements:string[]; overall:string; }
interface Fav      { id:string; questionText:string; sample:string; topicName:string; level:string; type:string; savedAt:string; }
type Page = "home"|"topic"|"survey"|"level"|"exam"|"done"|"favs"|"guide";

/* ═══════════════════════════ DATA ═══════════════════════════ */
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
const TMETA:Record<string,{label:string;c:string;bg:string}>={
  describe:{label:"Describe",  c:"rgba(255,255,255,0.9)", bg:"rgba(255,255,255,0.08)"},
  compare: {label:"Compare",   c:"rgba(255,255,255,0.9)", bg:"rgba(255,255,255,0.08)"},
  past:    {label:"Past exp.", c:"rgba(255,255,255,0.9)", bg:"rgba(255,255,255,0.08)"},
  roleplay:{label:"Role-play", c:"rgba(255,255,255,0.9)", bg:"rgba(255,255,255,0.08)"},
  mixed:   {label:"Mixed",     c:"rgba(255,255,255,0.9)", bg:"rgba(255,255,255,0.08)"},
};

/* ═══════════════════════════ STORAGE ═══════════════════════════ */
const FAV_KEY="opic-favs-v1";
function loadFavs():Fav[]{if(typeof window==="undefined")return[];try{return JSON.parse(localStorage.getItem(FAV_KEY)||"[]");}catch{return[];}}
function saveFavs(f:Fav[]){localStorage.setItem(FAV_KEY,JSON.stringify(f));}

/* ═══════════════════════════ API ═══════════════════════════ */
async function callAI(prompt:string,max=2500){
  const r=await fetch("/api/generate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt,maxTokens:max})});
  if(!r.ok)throw new Error("API error");return r.json();
}
async function callScore(question:string,answer:string,level:string):Promise<Score>{
  const r=await fetch("/api/score",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({question,answer,level})});
  if(!r.ok)throw new Error("Score error");return r.json();
}

/* ═══════════════════════════ TTS ═══════════════════════════ */
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

/* ═══════════════════════════ PILL BUTTON ═══════════════════════════ */
// Outer border pill wrapping inner black pill with glow streak
function PillBtn({label,onClick,white=false,style:extStyle}:{label:string;onClick:()=>void;white?:boolean;style?:React.CSSProperties}){
  const [hov,setHov]=useState(false);
  return(
    <button
      onClick={onClick}
      onMouseEnter={()=>setHov(true)}
      onMouseLeave={()=>setHov(false)}
      style={{
        position:"relative",display:"inline-flex",alignItems:"center",justifyContent:"center",
        border:"0.6px solid rgba(255,255,255,0.9)",borderRadius:9999,
        background:"transparent",padding:2,cursor:"pointer",
        transition:"opacity .18s",opacity:hov?0.88:1,...extStyle,
      }}
    >
      {/* Top glow streak */}
      <span style={{position:"absolute",top:-1,left:"50%",transform:"translateX(-50%)",width:"60%",height:8,background:"radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.55) 0%, transparent 80%)",borderRadius:"50%",filter:"blur(4px)",pointerEvents:"none"}}/>
      {/* Inner pill */}
      <span style={{
        display:"inline-flex",alignItems:"center",justifyContent:"center",
        borderRadius:9999,padding:"11px 29px",
        background:white?"#fff":"#000",
        color:white?"#000":"#fff",
        fontSize:14,fontWeight:500,fontFamily:"'General Sans',sans-serif",
        letterSpacing:"0.01em",whiteSpace:"nowrap",
        position:"relative",zIndex:1,
      }}>{label}</span>
    </button>
  );
}

/* ═══════════════════════════ CHEVRON DOWN ═══════════════════════════ */
const ChevronDown=()=>(
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{flexShrink:0}}>
    <path d="M3 5l4 4 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

/* ═══════════════════════════ ICONS ═══════════════════════════ */
const IcoSpeaker=()=><svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M2 4.5v5l4-2.5-4-2.5z" fill="currentColor"/><path d="M8 3.5c1.4.9 2.5 2 2.5 3.5S9.4 10.1 8 11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/><path d="M9.5 1.5c2.5 1.5 3.5 3 3.5 5.5s-1 4-3.5 5.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>;
const IcoPause=()=><svg width="13" height="13" viewBox="0 0 14 14" fill="none"><rect x="2" y="2" width="4" height="10" rx="1" fill="currentColor"/><rect x="8" y="2" width="4" height="10" rx="1" fill="currentColor"/></svg>;
const IcoHeart=(f:boolean)=><svg width="14" height="14" viewBox="0 0 14 14" fill={f?"#fff":"none"} stroke={f?"#fff":"rgba(255,255,255,0.5)"} strokeWidth="1.5"><path d="M7 12S1 8.5 1 4.5A3 3 0 0 1 7 3.2 3 3 0 0 1 13 4.5C13 8.5 7 12 7 12z"/></svg>;
const IcoCheck=()=><svg width="9" height="9" viewBox="0 0 10 10"><polyline points="1,5 4,8 9,2" stroke="white" strokeWidth="2.2" fill="none"/></svg>;
const Wave=()=><span style={{display:"inline-flex",alignItems:"center",gap:2,marginLeft:3}}>{[8,13,6,10].map((h,i)=><span key={i} style={{display:"inline-block",width:3,height:h,borderRadius:2,background:"rgba(255,255,255,0.7)",animation:`wave .7s ease ${[0,.12,.24,.06][i]}s infinite`}}/>)}</span>;

/* ═══════════════════════════ INNER-PAGE ATOMS ═══════════════════════════ */
// Glass card for inner pages (survey, exam, etc.)
const glassCard=(extra?:React.CSSProperties):React.CSSProperties=>({
  background:"rgba(255,255,255,0.05)",
  backdropFilter:"blur(24px)",WebkitBackdropFilter:"blur(24px)",
  border:"1px solid rgba(255,255,255,0.12)",
  borderRadius:16,...extra,
});

function InnerBtn({label,onClick,variant="ghost",disabled}:{label:string;onClick:()=>void;variant?:"primary"|"ghost"|"sm";disabled?:boolean}){
  const [hov,setHov]=useState(false);
  const base:React.CSSProperties={
    display:"inline-flex",alignItems:"center",gap:6,cursor:disabled?"not-allowed":"pointer",
    fontFamily:"'General Sans',sans-serif",fontWeight:500,border:"none",
    transition:"all .18s",opacity:disabled?0.45:hov?0.82:1,
    fontSize: variant==="sm"?"0.78rem":"0.875rem",
  };
  const styles:Record<string,React.CSSProperties>={
    primary:{...base,padding:"11px 24px",borderRadius:9999,background:"#fff",color:"#000"},
    ghost:{...base,padding:"9px 18px",borderRadius:10,background:"rgba(255,255,255,0.08)",color:"#fff",border:"1px solid rgba(255,255,255,0.15)"},
    sm:{...base,padding:"6px 14px",borderRadius:8,background:"rgba(255,255,255,0.07)",color:"rgba(255,255,255,0.75)",border:"1px solid rgba(255,255,255,0.12)"},
  };
  return <button style={styles[variant]} onClick={onClick} disabled={disabled} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}>{label}</button>;
}

const ProgBar=({pct}:{pct:number})=>(
  <div style={{height:2,background:"rgba(255,255,255,0.1)",borderRadius:2,overflow:"hidden",marginBottom:22}}>
    <div style={{height:"100%",width:`${pct}%`,background:"#fff",borderRadius:2,transition:"width .45s ease"}}/>
  </div>
);

const LvGrid=({level,setLevel}:{level:string;setLevel:(v:string)=>void})=>(
  <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8,marginBottom:16}}>
    {LEVELS.map(lv=>(
      <div key={lv.id} style={{...glassCard({padding:"12px 8px",background:level===lv.id?"rgba(255,255,255,0.12)":"rgba(255,255,255,0.04)",borderColor:level===lv.id?"rgba(255,255,255,0.5)":"rgba(255,255,255,0.1)"}),cursor:"pointer",textAlign:"center",transition:"all .18s"}} onClick={()=>setLevel(lv.id)}>
        <div style={{fontWeight:700,fontSize:"0.95rem",color:level===lv.id?"#fff":"rgba(255,255,255,0.7)",marginBottom:2}}>{lv.label}</div>
        <div style={{fontSize:"0.65rem",color:"rgba(255,255,255,0.35)"}}>{lv.sub}</div>
      </div>
    ))}
  </div>
);

const Spinner=()=><div style={{width:44,height:44,border:"2px solid rgba(255,255,255,0.1)",borderTopColor:"rgba(255,255,255,0.8)",borderRadius:"50%",animation:"spin .75s linear infinite",margin:"0 auto 18px"}}/>;

const TopBar=({title,onBack,extra}:{title:string;onBack:()=>void;extra?:React.ReactNode})=>(
  <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:24}}>
    <InnerBtn label="← Quay lại" onClick={onBack} variant="sm"/>
    <span style={{fontWeight:600,fontSize:"0.95rem"}}>{title}</span>
    {extra&&<div style={{marginLeft:"auto"}}>{extra}</div>}
  </div>
);

/* ═══════════════════════════ FLASHCARD ═══════════════════════════ */
function FlashCards({vocabs}:{vocabs:Vocab[]}){
  const [idx,setIdx]=useState(0);const [flip,setFlip]=useState(false);
  if(!vocabs?.length)return null;const v=vocabs[idx];
  return(
    <div style={{marginTop:16}}>
      <div style={{fontSize:"0.68rem",fontWeight:600,color:"rgba(255,255,255,0.45)",textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:10}}>Từ vựng key ({vocabs.length} từ)</div>
      <div onClick={()=>setFlip(f=>!f)} style={{...glassCard({padding:"22px 18px",textAlign:"center",cursor:"pointer",minHeight:100,transition:"all .25s",background:flip?"rgba(255,255,255,0.1)":"rgba(255,255,255,0.04)",borderColor:flip?"rgba(255,255,255,0.35)":"rgba(255,255,255,0.1)"}),display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:8}}>
        {!flip
          ?<><div style={{fontWeight:700,fontSize:"1.25rem"}}>{v.word}</div><div style={{fontSize:"0.7rem",color:"rgba(255,255,255,0.35)"}}>Nhấn để xem nghĩa</div></>
          :<><div style={{fontWeight:700,fontSize:"1.05rem",marginBottom:4}}>{v.meaning}</div>{v.example&&<div style={{fontSize:"0.8rem",color:"rgba(255,255,255,0.5)",fontStyle:"italic"}}>"{v.example}"</div>}</>
        }
      </div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:14,marginTop:10}}>
        <InnerBtn label="←" onClick={()=>{setIdx(i=>Math.max(0,i-1));setFlip(false);}} variant="sm" disabled={idx===0}/>
        <span style={{fontSize:"0.78rem",color:"rgba(255,255,255,0.4)",fontWeight:500}}>{idx+1}/{vocabs.length}</span>
        <InnerBtn label="→" onClick={()=>{setIdx(i=>Math.min(vocabs.length-1,i+1));setFlip(false);}} variant="sm" disabled={idx===vocabs.length-1}/>
      </div>
    </div>
  );
}

/* ═══════════════════════════ KEY POINTS ═══════════════════════════ */
function KeyPoints({points}:{points:string[]}){
  if(!points?.length)return null;
  return(
    <div style={{marginTop:16}}>
      <div style={{fontSize:"0.68rem",fontWeight:600,color:"rgba(255,255,255,0.45)",textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:10}}>Thành phần bài mẫu</div>
      <div style={{display:"grid",gap:7}}>
        {points.map((p,i)=>(
          <div key={i} style={{display:"flex",gap:10,alignItems:"flex-start",...glassCard({padding:"10px 14px"})}}>
            <span style={{width:20,height:20,borderRadius:"50%",background:"rgba(255,255,255,0.15)",border:"1px solid rgba(255,255,255,0.2)",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.65rem",fontWeight:700,flexShrink:0}}>{i+1}</span>
            <span style={{fontSize:"0.84rem",color:"rgba(255,255,255,0.75)",lineHeight:1.55}}>{p}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════ SCORE DISPLAY ═══════════════════════════ */
function ScoreDisplay({r}:{r:Score}){
  const sc=r.score;
  const alpha=sc>=8?0.9:sc>=6?0.75:sc>=4?0.55:0.4;
  return(
    <div style={{...glassCard({padding:18,marginTop:14,background:"rgba(255,255,255,0.06)"}),animation:"fadeUp .35s ease"}}>
      <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:12}}>
        <div style={{width:56,height:56,borderRadius:"50%",background:`rgba(255,255,255,${alpha})`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,border:"1px solid rgba(255,255,255,0.3)"}}>
          <span style={{fontWeight:700,fontSize:"1.35rem",color:"#000"}}>{sc}</span>
        </div>
        <div>
          <div style={{fontWeight:700,fontSize:"0.92rem",marginBottom:2}}>Điểm: {sc}/10</div>
          <div style={{fontSize:"0.77rem",color:"rgba(255,255,255,0.45)"}}>Tương đương cấp <strong style={{color:"rgba(255,255,255,0.85)"}}>{r.estimatedLevel}</strong></div>
        </div>
      </div>
      <div style={{fontSize:"0.86rem",color:"rgba(255,255,255,0.7)",lineHeight:1.7,marginBottom:12}}>{r.overall}</div>
      {r.strengths?.length>0&&<div style={{marginBottom:10}}>
        <div style={{fontSize:"0.68rem",fontWeight:600,color:"rgba(255,255,255,0.5)",textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:6}}>Điểm mạnh</div>
        {r.strengths.map((s,i)=><div key={i} style={{fontSize:"0.83rem",color:"rgba(255,255,255,0.7)",padding:"2px 0"}}>✓ {s}</div>)}
      </div>}
      {r.improvements?.length>0&&<div>
        <div style={{fontSize:"0.68rem",fontWeight:600,color:"rgba(255,255,255,0.5)",textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:6}}>Cần cải thiện</div>
        {r.improvements.map((s,i)=><div key={i} style={{fontSize:"0.83rem",color:"rgba(255,255,255,0.6)",padding:"2px 0"}}>↑ {s}</div>)}
      </div>}
    </div>
  );
}

/* ═══════════════════════════ SAMPLE BLOCK ═══════════════════════════ */
interface SBP{q:Question;qi:number;level:string;topicName:string;speakIdx:number|null;toggleTTS:(i:number,t:string)=>void;shown:boolean;onToggle:()=>void;isFav:boolean;onToggleFav:()=>void;userAnswer:string;onAnswerChange:(v:string)=>void;score:Score|null;scoring:boolean;onScore:()=>void;vocabOpen:boolean;onVocabToggle:()=>void;kpOpen:boolean;onKpToggle:()=>void;}
function SampleBlock(p:SBP){
  const speaking=p.speakIdx===p.qi;
  const smBtn=(label:string,onClick:()=>void,active=false):React.CSSProperties=>({display:"inline-flex",alignItems:"center",gap:5,padding:"5px 13px",borderRadius:8,background:active?"rgba(255,255,255,0.12)":"rgba(255,255,255,0.06)",color:active?"#fff":"rgba(255,255,255,0.65)",border:`1px solid ${active?"rgba(255,255,255,0.25)":"rgba(255,255,255,0.1)"}`,cursor:"pointer",fontSize:"0.77rem",fontWeight:500,fontFamily:"'General Sans',sans-serif",transition:"all .15s"});
  return(
    <>
      <div style={{display:"flex",gap:7,alignItems:"center",marginTop:12,flexWrap:"wrap"}}>
        <button style={smBtn(p.shown?"▲ Ẩn bài mẫu":"▼ Xem bài mẫu",p.onToggle)} onClick={p.onToggle}>{p.shown?"▲ Ẩn bài mẫu":"▼ Xem bài mẫu"}</button>
        {p.shown&&<>
          <button style={{...smBtn("",p.onToggle,speaking),color:speaking?"#fff":"rgba(255,255,255,0.65)"}} onClick={()=>p.toggleTTS(p.qi,p.q.sample)}>
            {speaking?<IcoPause/>:<IcoSpeaker/>}{speaking?<><span>Đang đọc</span><Wave/></>:"Đọc to"}
          </button>
          {p.q.vocabulary?.length>0&&<button style={smBtn("",p.onVocabToggle,p.vocabOpen)} onClick={p.onVocabToggle}>{p.vocabOpen?"Ẩn từ vựng":"📖 Từ vựng"}</button>}
          {p.q.keyPoints?.length>0&&<button style={smBtn("",p.onKpToggle,p.kpOpen)} onClick={p.onKpToggle}>{p.kpOpen?"Ẩn phân tích":"🔍 Phân tích"}</button>}
          <button style={{...smBtn("",p.onToggleFav,p.isFav),gap:5}} onClick={p.onToggleFav}>{IcoHeart(p.isFav)}{p.isFav?"Đã lưu":"Lưu"}</button>
        </>}
      </div>
      {p.shown&&<div style={{...glassCard({padding:18,borderLeft:"2px solid rgba(255,255,255,0.3)",background:"rgba(255,255,255,0.06)",marginTop:12}),animation:"fadeUp .3s ease"}}>
        <div style={{fontSize:"0.68rem",fontWeight:600,color:"rgba(255,255,255,0.45)",textTransform:"uppercase",letterSpacing:"0.6px",marginBottom:8}}>Bài mẫu — Cấp {p.level}</div>
        <div style={{fontSize:"0.9rem",color:"rgba(255,255,255,0.85)",lineHeight:1.82}}>{p.q.sample}</div>
      </div>}
      {p.shown&&p.vocabOpen&&p.q.vocabulary?.length>0&&<FlashCards vocabs={p.q.vocabulary}/>}
      {p.shown&&p.kpOpen&&p.q.keyPoints?.length>0&&<KeyPoints points={p.q.keyPoints}/>}
      <div style={{marginTop:14,...glassCard({padding:16})}}>
        <div style={{fontSize:"0.68rem",fontWeight:600,color:"rgba(255,255,255,0.35)",textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:10}}>✦ Luyện viết — Chấm điểm AI</div>
        <textarea value={p.userAnswer} onChange={e=>p.onAnswerChange(e.target.value)} placeholder="Nhập câu trả lời của bạn bằng tiếng Anh..." style={{minHeight:88}}/>
        <div style={{display:"flex",justifyContent:"flex-end",marginTop:10}}>
          <InnerBtn label={p.scoring?"⏳ Đang chấm...":"✦ Chấm điểm AI"} onClick={p.onScore} variant="primary" disabled={!p.userAnswer.trim()||p.scoring}/>
        </div>
        {p.score&&<ScoreDisplay r={p.score}/>}
      </div>
    </>
  );
}

/* ═══════════════════════════ QUESTION CARD ═══════════════════════════ */
function QCard(p:SBP&{showGroup?:boolean}){
  const grp=p.showGroup?TYPE_GROUPS.find(g=>p.qi>=g.range[0]&&p.qi<=g.range[1]):undefined;
  const tm=TMETA[p.q.type]||TMETA.describe;
  return(
    <div style={{...glassCard({padding:24,marginBottom:12}),animation:"fadeUp .32s ease"}}>
      {grp&&<div style={{...glassCard({padding:"8px 14px",marginBottom:14,background:"rgba(255,255,255,0.03)"}),display:"flex",gap:10,alignItems:"center"}}>
        <span style={{fontWeight:600,fontSize:"0.7rem",color:"rgba(255,255,255,0.35)",textTransform:"uppercase",letterSpacing:"0.8px"}}>{grp.tag}</span>
        <span style={{fontWeight:600,fontSize:"0.85rem"}}>{grp.label}</span>
        <span style={{color:"rgba(255,255,255,0.3)",fontSize:"0.8rem"}}>— {grp.vi}</span>
      </div>}
      <div style={{display:"flex",alignItems:"flex-start",gap:14,marginBottom:14}}>
        <div style={{width:36,height:36,borderRadius:"50%",background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.15)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:"0.85rem",color:"rgba(255,255,255,0.8)",flexShrink:0}}>{p.qi+1}</div>
        <div style={{flex:1}}>
          <span style={{display:"inline-block",padding:"2px 10px",borderRadius:20,fontSize:"0.68rem",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.4px",marginBottom:10,color:tm.c,background:tm.bg,border:"1px solid rgba(255,255,255,0.12)"}}>{TMETA[p.q.type]?.label||p.q.type}</span>
          <div style={{...glassCard({padding:"14px 16px",borderLeft:"2px solid rgba(255,255,255,0.2)",background:"rgba(255,255,255,0.04)"}),fontWeight:600,fontSize:"0.97rem",lineHeight:1.65}}>{p.q.question}</div>
        </div>
      </div>
      <div style={{...glassCard({padding:"12px 15px",borderLeft:"2px solid rgba(255,255,255,0.15)",background:"rgba(255,255,255,0.03)"}),marginBottom:12}}>
        <div style={{fontSize:"0.68rem",fontWeight:600,color:"rgba(255,255,255,0.4)",textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:5}}>Gợi ý trả lời</div>
        <div style={{fontSize:"0.86rem",color:"rgba(255,255,255,0.7)",lineHeight:1.65}}>{p.q.tip}</div>
      </div>
      <SampleBlock {...p}/>
    </div>
  );
}

/* ═══════════════════════════ INNER HEADER ═══════════════════════════ */
function InnerHeader({page,onHome,onFavs,favCount}:{page:Page;onHome:()=>void;onFavs:()=>void;favCount:number}){
  return(
    <header style={{position:"fixed",top:0,left:0,right:0,zIndex:100,padding:"20px 48px",display:"flex",alignItems:"center",justifyContent:"space-between",background:"rgba(0,0,0,0.7)",backdropFilter:"blur(24px)",WebkitBackdropFilter:"blur(24px)",borderBottom:"1px solid rgba(255,255,255,0.07)"}}>
      <div style={{display:"flex",alignItems:"center",gap:32}}>
        <span style={{fontWeight:700,fontSize:"1.1rem",letterSpacing:"-0.3px",cursor:"pointer"}} onClick={onHome}>OPIc Learn</span>
      </div>
      <div style={{display:"flex",gap:12,alignItems:"center"}}>
        <button style={{background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.55)",fontSize:"0.8rem",fontFamily:"'General Sans',sans-serif",fontWeight:500,display:"flex",alignItems:"center",gap:5}} onClick={onFavs}>
          {IcoHeart(favCount>0)}Đã lưu{favCount>0&&<span style={{background:"rgba(255,255,255,0.15)",borderRadius:20,fontSize:"0.62rem",fontWeight:600,padding:"1px 7px"}}>{favCount}</span>}
        </button>
        <PillBtn label="Trang chủ" onClick={onHome}/>
      </div>
    </header>
  );
}

/* ═══════════════════════════ INNER LAYOUT ═══════════════════════════ */
function InnerPage({children,page,onHome,onFavs,favCount,maxW=760}:{children:React.ReactNode;page:Page;onHome:()=>void;onFavs:()=>void;favCount:number;maxW?:number}){
  return(
    <div style={{minHeight:"100vh",background:"#000",position:"relative"}}>
      {/* Subtle background grain */}
      <div style={{position:"fixed",inset:0,backgroundImage:"url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E\")",pointerEvents:"none",zIndex:0}}/>
      <InnerHeader page={page} onHome={onHome} onFavs={onFavs} favCount={favCount}/>
      <div style={{maxWidth:maxW,margin:"0 auto",padding:"96px 20px 56px",position:"relative",zIndex:1}}>
        {children}
      </div>
    </div>
  );
}

/* ═══════════════════════════ MAIN APP ═══════════════════════════ */
export default function App(){
  const [page,setPage]          = useState<Page>("home");
  const [mode,setMode]          = useState<"topic"|"exam"|null>(null);
  const [topic,setTopic]        = useState<string|null>(null);
  const [topicLv,setTopicLv]    = useState("IM2");
  const [sqIdx,setSqIdx]        = useState(0);
  const [sqAns,setSqAns]        = useState<Record<string,number|number[]>>({});
  const [examLv,setExamLv]      = useState("IM2");
  const [examQs,setExamQs]      = useState<Question[]>([]);
  const [examIdx,setExamIdx]    = useState(0);
  const [topicQs,setTopicQs]    = useState<Question[]>([]);
  const [loading,setLoading]    = useState(false);
  const [favs,setFavs]          = useState<Fav[]>([]);
  const [shown,setShown]        = useState<Record<number,boolean>>({});
  const [vocabOpen,setVocabOpen]= useState<Record<number,boolean>>({});
  const [kpOpen,setKpOpen]      = useState<Record<number,boolean>>({});
  const [answers,setAnswers]    = useState<Record<number,string>>({});
  const [scores,setScores]      = useState<Record<number,Score>>({});
  const [scoring,setScoring]    = useState<Record<number,boolean>>({});
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
      const data=await callAI(`You are an OPIc expert. Generate 5 practice questions for the topic "${topicName}" at ${topicLv} level. Return ONLY valid JSON (no markdown): {"questions":[{"type":"describe","question":"...","tip":"(Vietnamese tip)...","sample":"(English ${topicLv}, 4-6 sentences)...","vocabulary":[{"word":"...","meaning":"...(Vietnamese)","example":"...(English)"},{"word":"...","meaning":"...","example":"..."},{"word":"...","meaning":"...","example":"..."},{"word":"...","meaning":"...","example":"..."},{"word":"...","meaning":"...","example":"..."}],"keyPoints":["Mở bài: ...","Nội dung chính: ...","Chi tiết cụ thể: ...","Kết luận: ..."]},{"type":"compare",...},{"type":"past",...},{"type":"roleplay",...},{"type":"describe",...}]}`,3800);
      setTopicQs(data.questions||[]);
    }catch{alert("Lỗi tải câu hỏi. Thử lại!");goHome();}
    finally{setLoading(false);}
  }

  async function generateExam(){
    setPage("exam");setLoading(true);setExamQs([]);setExamIdx(0);setShown({});setAnswers({});setScores({});
    const profile=SQS.map(q=>{const a=sqAns[q.id];if(q.multi)return `${q.q}: ${((a as number[])||[]).map(i=>q.opts[i]).join(", ")||"N/A"}`;return `${q.q}: ${a!==undefined?q.opts[a as number]:"N/A"}`;}).join("\n");
    try{
      const data=await callAI(`You are an OPIc exam generator. Create a personalised 15-question OPIc exam. Profile:\n${profile}\nTarget: ${examLv}\nQ1-3:"describe", Q4-6:"compare", Q7-9:"past", Q10-12:"roleplay", Q13-15:"mixed"\nReturn ONLY valid JSON: {"questions":[{"type":"describe","question":"...","tip":"(Vietnamese)...","sample":"(English ${examLv} 4-6 sentences)...","vocabulary":[],"keyPoints":[]},... 15 total]}`,5500);
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

  const LoadScreen=({text,sub}:{text:string;sub?:string})=>(
    <div style={{textAlign:"center",padding:"80px 20px"}}><Spinner/>
      <p style={{fontSize:"0.93rem",color:"rgba(255,255,255,0.55)",marginBottom:4}}>{text}</p>
      {sub&&<p style={{fontSize:"0.8rem",color:"rgba(255,255,255,0.3)"}}>{sub}</p>}
    </div>
  );

  const innerProps={page,onHome:goHome,onFavs:()=>setPage("favs"),favCount:favs.length};

  /* ══════════════════════════ HOME ══════════════════════════ */
  if(page==="home") return(
    <div style={{position:"relative",minHeight:"100vh",background:"#000",overflow:"hidden"}}>

      {/* ── Fullscreen video background ── */}
      <video
        autoPlay loop muted playsInline
        src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260217_030345_246c0224-10a4-422c-b324-070b7c0eceda.mp4"
        style={{position:"fixed",inset:0,width:"100%",height:"100%",objectFit:"cover",zIndex:0}}
      />
      {/* 50% black overlay */}
      <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:1,pointerEvents:"none"}}/>

      {/* ── NAVBAR ── */}
      <nav style={{position:"fixed",top:0,left:0,right:0,zIndex:50,padding:"20px 120px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        {/* Left: logo + nav links */}
        <div style={{display:"flex",alignItems:"center",gap:30}}>
          {/* Logo wordmark */}
          <div style={{width:187,height:25,display:"flex",alignItems:"center"}}>
            <span style={{fontSize:"1.2rem",fontWeight:700,color:"#fff",letterSpacing:"-0.5px",fontFamily:"'General Sans',sans-serif"}}>OPIc Learn</span>
          </div>
          {/* Nav links — hidden mobile */}
          {(["Bắt đầu","Tính năng","Hướng dẫn","Cấp độ"] as string[]).map(label=>(
            <button key={label} style={{display:"flex",alignItems:"center",gap:5,background:"none",border:"none",cursor:"pointer",color:"#fff",fontSize:14,fontWeight:500,fontFamily:"'General Sans',sans-serif",whiteSpace:"nowrap"}}
              onClick={()=>{if(label==="Hướng dẫn")setPage("guide");}}>
              {label}<ChevronDown/>
            </button>
          ))}
        </div>
        {/* Right: CTA */}
        <PillBtn label="Bắt đầu học" onClick={()=>setMode("topic")}/>
      </nav>

      {/* ── HERO CONTENT ── */}
      <div style={{position:"relative",zIndex:10,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",paddingTop:280,paddingBottom:102,paddingLeft:20,paddingRight:20,minHeight:"100vh"}}>
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:40,maxWidth:780,width:"100%"}}>

          {/* Badge pill */}
          <div style={{display:"inline-flex",alignItems:"center",gap:8,background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.2)",borderRadius:20,padding:"6px 16px"}}>
            <span style={{width:4,height:4,borderRadius:"50%",background:"#fff",display:"inline-block",flexShrink:0}}/>
            <span style={{fontSize:13,fontWeight:500,fontFamily:"'General Sans',sans-serif"}}>
              <span style={{color:"rgba(255,255,255,0.6)"}}>Tính năng mới ra mắt từ</span>
              {" "}<span style={{color:"#fff"}}>May 1, 2026</span>
            </span>
          </div>

          {/* Heading with gradient text */}
          <h1 style={{
            maxWidth:613,textAlign:"center",
            fontSize:"clamp(36px,5vw,56px)",fontWeight:500,lineHeight:1.28,
            fontFamily:"'General Sans',sans-serif",letterSpacing:"-0.5px",
            background:"linear-gradient(144.5deg, #ffffff 28%, rgba(0,0,0,0) 115%)",
            WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",
            backgroundClip:"text",
          }}>
            Luyện thi OPIc tốc độ của trải nghiệm thật
          </h1>

          {/* Subtitle */}
          <p style={{fontSize:15,fontWeight:400,color:"rgba(255,255,255,0.7)",maxWidth:680,textAlign:"center",lineHeight:1.65,fontFamily:"'General Sans',sans-serif",marginTop:-16}}>
            Nền tảng luyện thi OPIc thông minh với AI — từ khảo sát nền cá nhân hoá, 15 câu đề thi theo đúng cấu trúc, đến flashcard từ vựng và chấm điểm tức thì.
          </p>

          {/* CTA Button — white version */}
          <PillBtn label="Bắt đầu học ngay" onClick={()=>setMode("topic")} white/>

        </div>
      </div>

      {/* ── MODE SELECTION PANEL (slides up) ── */}
      {mode&&(
        <div style={{position:"fixed",bottom:0,left:0,right:0,zIndex:60,background:"rgba(0,0,0,0.88)",backdropFilter:"blur(32px)",WebkitBackdropFilter:"blur(32px)",borderTop:"1px solid rgba(255,255,255,0.1)",borderRadius:"20px 20px 0 0",padding:32,maxHeight:"75vh",overflow:"auto",animation:"fadeUp .32s ease"}}>
          <div style={{maxWidth:800,margin:"0 auto"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:24}}>
              <span style={{fontSize:"1rem",fontWeight:600,fontFamily:"'General Sans',sans-serif"}}>{mode==="topic"?"📝 Luyện theo chủ đề":"🎯 Thi thử OPIc thật"}</span>
              <InnerBtn label="✕ Đóng" onClick={()=>setMode(null)} variant="sm"/>
            </div>

            {mode==="topic"&&<>
              <div style={{fontSize:"0.78rem",fontWeight:600,color:"rgba(255,255,255,0.4)",marginBottom:10,textTransform:"uppercase",letterSpacing:"0.6px"}}>① Cấp độ mong muốn</div>
              <LvGrid level={topicLv} setLevel={setTopicLv}/>
              <div style={{fontSize:"0.78rem",fontWeight:600,color:"rgba(255,255,255,0.4)",marginBottom:10,marginTop:20,textTransform:"uppercase",letterSpacing:"0.6px"}}>② Chủ đề luyện tập</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(118px,1fr))",gap:8,marginBottom:22}}>
                {TOPICS.map(t=>(
                  <div key={t.id} style={{...glassCard({padding:"12px 8px",background:topic===t.id?"rgba(255,255,255,0.12)":"rgba(255,255,255,0.04)",borderColor:topic===t.id?"rgba(255,255,255,0.45)":"rgba(255,255,255,0.08)"}),cursor:"pointer",textAlign:"center",transition:"all .18s",fontSize:"0.78rem",fontWeight:topic===t.id?600:400,color:topic===t.id?"#fff":"rgba(255,255,255,0.55)"}} onClick={()=>setTopic(t.id)}>
                    <span style={{fontSize:18,display:"block",marginBottom:5}}>{t.icon}</span>{t.name}
                  </div>
                ))}
              </div>
              <div style={{display:"flex",justifyContent:"flex-end"}}>
                <InnerBtn label="Bắt đầu luyện tập →" onClick={()=>{if(topic)startTopic();}} variant="primary" disabled={!topic}/>
              </div>
            </>}

            {mode==="exam"&&<>
              <div style={{display:"flex",gap:16,marginBottom:22}}>
                <span style={{fontSize:24,flexShrink:0}}>📋</span>
                <div>
                  <div style={{fontWeight:600,marginBottom:10}}>Quy trình thi thử OPIc</div>
                  <ol style={{paddingLeft:18,color:"rgba(255,255,255,0.5)",fontSize:"0.86rem",lineHeight:2.15}}>
                    <li><strong style={{color:"rgba(255,255,255,0.8)"}}>Khảo sát nền</strong> — 7 câu giống Background Survey thật</li>
                    <li><strong style={{color:"rgba(255,255,255,0.8)"}}>Chọn cấp độ</strong> — IM1 / IM2 / IM3 / IH / AL</li>
                    <li><strong style={{color:"rgba(255,255,255,0.8)"}}>15 câu cá nhân hoá</strong> + bài mẫu, flashcard, chấm điểm AI</li>
                  </ol>
                </div>
              </div>
              <div style={{display:"flex",justifyContent:"flex-end"}}>
                <InnerBtn label="Bắt đầu khảo sát →" onClick={()=>{setSqIdx(0);setSqAns({});setPage("survey");}} variant="primary"/>
              </div>
            </>}
          </div>
        </div>
      )}
    </div>
  );

  /* ══════════════════════════ TOPIC ══════════════════════════ */
  if(page==="topic") return(
    <InnerPage {...innerProps}>
      {loading?<LoadScreen text={`AI đang tạo câu hỏi cho "${tp?.name}"...`} sub="Bao gồm từ vựng flashcard và phân tích bài mẫu"/>:(
        <>
          <TopBar title={`${tp?.icon} ${tp?.name} — Cấp ${topicLv}`} onBack={goHome}
            extra={<InnerBtn label="🔄 Tạo lại" onClick={()=>{stopSpeech();setTopicQs([]);setShown({});setVocabOpen({});setKpOpen({});setAnswers({});setScores({});startTopic();}} variant="sm"/>}/>
          {topicQs.map((q,i)=><QCard key={i} {...qp(q,i,topicLv)}/>)}
        </>
      )}
    </InnerPage>
  );

  /* ══════════════════════════ SURVEY ══════════════════════════ */
  if(page==="survey"){
    const q=SQS[sqIdx];const ans=sqAns[q.id];const isMul=q.multi;
    const selArr=isMul?((ans as number[])||[]):[];const selS=isMul?-1:(ans as number??-1);
    return(
      <InnerPage {...innerProps} maxW={620}>
        <TopBar title="Khảo sát nền OPIc" onBack={goHome}/>
        <div style={{display:"flex",alignItems:"center",marginBottom:24}}>
          {SQS.map((_,i)=>(
            <span key={i} style={{display:"flex",alignItems:"center",flex:i<SQS.length-1?1:"none"}}>
              <span style={{width:24,height:24,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.68rem",fontWeight:700,flexShrink:0,background:i<sqIdx?"rgba(255,255,255,0.15)":i===sqIdx?"#fff":"rgba(255,255,255,0.06)",color:i<sqIdx?"rgba(255,255,255,0.7)":i===sqIdx?"#000":"rgba(255,255,255,0.25)",border:`1px solid ${i===sqIdx?"rgba(255,255,255,0.5)":"rgba(255,255,255,0.1)"}`}}>{i<sqIdx?"✓":i+1}</span>
              {i<SQS.length-1&&<span style={{flex:1,height:1,background:"rgba(255,255,255,0.07)",minWidth:6}}/>}
            </span>
          ))}
        </div>
        <div style={glassCard({padding:28})}>
          <ProgBar pct={(sqIdx/SQS.length)*100}/>
          <div style={{fontSize:"0.68rem",fontWeight:600,color:"rgba(255,255,255,0.3)",textTransform:"uppercase",letterSpacing:"0.7px",marginBottom:8}}>Câu {sqIdx+1} / {SQS.length}</div>
          <div style={{fontWeight:600,fontSize:"1.05rem",lineHeight:1.55,marginBottom:18}}>{q.q}</div>
          {isMul&&<p style={{fontSize:"0.75rem",color:"rgba(255,255,255,0.3)",marginBottom:12}}>Có thể chọn nhiều đáp án</p>}
          <div style={{display:"grid",gap:8}}>
            {q.opts.map((opt,i)=>{
              const sel=isMul?selArr.includes(i):selS===i;
              return(
                <div key={i} style={{...glassCard({padding:"11px 15px",background:sel?"rgba(255,255,255,0.1)":"rgba(255,255,255,0.04)",borderColor:sel?"rgba(255,255,255,0.35)":"rgba(255,255,255,0.08)"}),cursor:"pointer",display:"flex",alignItems:"center",gap:10,fontSize:"0.87rem",fontWeight:sel?500:400,color:sel?"#fff":"rgba(255,255,255,0.6)",transition:"all .18s"}} onClick={()=>selOpt(i)}>
                  {isMul
                    ?<span style={{width:17,height:17,borderRadius:4,border:`1.5px solid ${sel?"rgba(255,255,255,0.7)":"rgba(255,255,255,0.2)"}`,background:sel?"rgba(255,255,255,0.9)":"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{sel&&<IcoCheck/>}</span>
                    :<span style={{width:17,height:17,borderRadius:"50%",border:`1.5px solid ${sel?"rgba(255,255,255,0.7)":"rgba(255,255,255,0.2)"}`,background:sel?"rgba(255,255,255,0.9)":"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{sel&&<span style={{width:7,height:7,borderRadius:"50%",background:"#000",display:"block"}}/>}</span>
                  }{opt}
                </div>
              );
            })}
          </div>
          <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:22}}>
            {sqIdx>0&&<InnerBtn label="← Trước" onClick={()=>setSqIdx(sqIdx-1)} variant="ghost"/>}
            <InnerBtn label={sqIdx<SQS.length-1?"Tiếp theo →":"Hoàn thành →"} onClick={()=>{if(canNext){if(sqIdx<SQS.length-1)setSqIdx(sqIdx+1);else setPage("level");}}} variant="primary" disabled={!canNext}/>
          </div>
        </div>
      </InnerPage>
    );
  }

  /* ══════════════════════════ LEVEL ══════════════════════════ */
  if(page==="level") return(
    <InnerPage {...innerProps} maxW={580}>
      <TopBar title="Chọn cấp độ mục tiêu" onBack={()=>{setSqIdx(SQS.length-1);setPage("survey");}}/>
      <div style={glassCard({padding:28})}>
        <p style={{color:"rgba(255,255,255,0.5)",fontSize:"0.87rem",marginBottom:18}}>AI sẽ tạo 15 câu hỏi phù hợp với cấp độ bạn chọn.</p>
        <LvGrid level={examLv} setLevel={setExamLv}/>
        <div style={{...glassCard({padding:"13px 15px",background:"rgba(255,255,255,0.03)"}),fontSize:"0.79rem",color:"rgba(255,255,255,0.4)",lineHeight:1.9,marginBottom:18}}>
          NL → NM → NH → <strong style={{color:"rgba(255,255,255,0.75)"}}>IM1 → IM2 → IM3</strong> → IH → AL
        </div>
        <div style={{display:"flex",justifyContent:"flex-end"}}>
          <InnerBtn label="🎯 Tạo đề thi (15 câu) →" onClick={generateExam} variant="primary"/>
        </div>
      </div>
    </InnerPage>
  );

  /* ══════════════════════════ EXAM ══════════════════════════ */
  if(page==="exam") return(
    <InnerPage {...innerProps}>
      {loading?<LoadScreen text="AI đang tạo đề thi cá nhân hoá..." sub={`Cấp ${examLv} · 15 câu`}/>:(
        examQs.length>0&&<>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
            <InnerBtn label="✕ Thoát" onClick={()=>{stopSpeech();goHome();}} variant="sm"/>
            <div style={{textAlign:"center"}}>
              <div style={{fontWeight:600,fontSize:"0.88rem"}}>Đề thi thử · Cấp {examLv}</div>
              <div style={{fontSize:"0.73rem",color:"rgba(255,255,255,0.35)"}}>Câu {examIdx+1} / {examQs.length}</div>
            </div>
            <span style={{fontSize:"0.8rem",fontWeight:600,color:"rgba(255,255,255,0.6)"}}>{Math.round(((examIdx+1)/examQs.length)*100)}%</span>
          </div>
          <ProgBar pct={((examIdx+1)/examQs.length)*100}/>
          <QCard {...qp(examQs[examIdx],examIdx,examLv,true)}/>
          <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:6}}>
            {examIdx>0&&<InnerBtn label="← Câu trước" onClick={()=>{stopSpeech();setExamIdx(examIdx-1);setShown({});}} variant="ghost"/>}
            {examIdx<examQs.length-1
              ?<InnerBtn label="Câu tiếp →" onClick={()=>{stopSpeech();setExamIdx(examIdx+1);setShown({});}} variant="primary"/>
              :<InnerBtn label="🏁 Hoàn thành" onClick={()=>{stopSpeech();setPage("done");}} variant="primary"/>}
          </div>
        </>
      )}
    </InnerPage>
  );

  /* ══════════════════════════ DONE ══════════════════════════ */
  if(page==="done") return(
    <InnerPage {...innerProps}>
      <div style={{textAlign:"center",padding:"64px 24px"}}>
        <div style={{fontSize:52,marginBottom:20}}>🏁</div>
        <h2 style={{fontWeight:600,fontSize:"1.55rem",marginBottom:8,letterSpacing:"-0.3px"}}>Hoàn thành bài thi thử!</h2>
        <p style={{color:"rgba(255,255,255,0.5)",marginBottom:6}}>Cấp độ: <strong style={{color:"rgba(255,255,255,0.85)"}}>{examLv}</strong> · {examQs.length} câu</p>
        <p style={{color:"rgba(255,255,255,0.4)",marginBottom:36}}>Xem lại bài mẫu và tự chấm điểm từng câu.</p>
        <div style={{display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap"}}>
          <InnerBtn label="Xem lại bài thi" onClick={()=>{setPage("exam");setExamIdx(0);setShown({});}} variant="ghost"/>
          <InnerBtn label="Xem bài đã lưu" onClick={()=>setPage("favs")} variant="ghost"/>
          <InnerBtn label="Thi thử lại" onClick={goHome} variant="primary"/>
        </div>
      </div>
    </InnerPage>
  );

  /* ══════════════════════════ FAVS ══════════════════════════ */
  if(page==="favs") return(
    <InnerPage {...innerProps}>
      <TopBar title={`Bài đã lưu (${favs.length})`} onBack={goHome}/>
      {favs.length===0
        ?<div style={{...glassCard({padding:"48px 24px"}),textAlign:"center"}}>
          <div style={{fontSize:38,marginBottom:14}}>💔</div>
          <div style={{fontWeight:600,marginBottom:8}}>Chưa có bài nào được lưu</div>
          <div style={{color:"rgba(255,255,255,0.4)",fontSize:"0.87rem",marginBottom:22}}>Mở bài mẫu và nhấn "Lưu" để lưu vào đây.</div>
          <InnerBtn label="Bắt đầu luyện tập" onClick={goHome} variant="primary"/>
        </div>
        :favs.map(f=>{
          const tm=TMETA[f.type]||TMETA.describe;
          return(
            <div key={f.id} style={{...glassCard({padding:22,marginBottom:12})}}>
              <div style={{display:"flex",justifyContent:"space-between",gap:12,marginBottom:10}}>
                <div style={{flex:1}}>
                  <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:8,flexWrap:"wrap"}}>
                    <span style={{display:"inline-block",padding:"2px 9px",borderRadius:20,fontSize:"0.68rem",fontWeight:600,textTransform:"uppercase",color:tm.c,background:tm.bg,border:"1px solid rgba(255,255,255,0.12)"}}>{TMETA[f.type]?.label||f.type}</span>
                    <span style={{fontSize:"0.72rem",color:"rgba(255,255,255,0.3)"}}>{f.topicName} · Cấp {f.level} · {f.savedAt}</span>
                  </div>
                  <div style={{fontWeight:600,fontSize:"0.95rem",lineHeight:1.55,marginBottom:12}}>{f.questionText}</div>
                </div>
                <InnerBtn label="✕" onClick={()=>{const n=favs.filter(x=>x.id!==f.id);setFavs(n);saveFavs(n);}} variant="sm"/>
              </div>
              <div style={{...glassCard({padding:16,borderLeft:"2px solid rgba(255,255,255,0.2)",background:"rgba(255,255,255,0.04)"})}}>
                <div style={{fontSize:"0.68rem",fontWeight:600,color:"rgba(255,255,255,0.4)",textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:6}}>Bài mẫu</div>
                <div style={{fontSize:"0.87rem",color:"rgba(255,255,255,0.75)",lineHeight:1.8}}>{f.sample}</div>
              </div>
            </div>
          );
        })
      }
    </InnerPage>
  );

  /* ══════════════════════════ GUIDE ══════════════════════════ */
  if(page==="guide") return(
    <InnerPage {...innerProps} maxW={660}>
      <TopBar title="Cấp độ & Hướng dẫn OPIc" onBack={goHome}/>
      <div style={{...glassCard({padding:24,marginBottom:12})}}>
        <div style={{fontWeight:600,fontSize:"0.9rem",marginBottom:16,color:"rgba(255,255,255,0.75)"}}>Thang cấp độ OPIc</div>
        {[{lv:"Novice Low/Mid/High",d:"Trả lời bằng từ đơn, cụm từ ngắn. Rất hạn chế về từ vựng và ngữ pháp."},
          {lv:"IM1 / IM2 / IM3",d:"Câu đơn giản, mô tả được chủ đề quen thuộc. Phổ biến nhất cho người đi làm."},
          {lv:"Intermediate High",d:"Câu ghép, mô tả và so sánh tốt. Xử lý được tình huống bất ngờ."},
          {lv:"Advanced Low",d:"Đoạn văn dài, lập luận logic, thuyết phục. Gần như lưu loát."},
        ].map(x=>(
          <div key={x.lv} style={{display:"flex",alignItems:"flex-start",gap:12,padding:"12px 0",borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
            <span style={{display:"inline-block",padding:"3px 10px",borderRadius:20,fontSize:"0.68rem",fontWeight:600,textTransform:"uppercase",color:"rgba(255,255,255,0.85)",background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.12)",flexShrink:0,whiteSpace:"nowrap"}}>{x.lv}</span>
            <span style={{fontSize:"0.84rem",color:"rgba(255,255,255,0.5)",paddingTop:4}}>{x.d}</span>
          </div>
        ))}
      </div>
      <div style={glassCard({padding:24})}>
        <div style={{fontWeight:600,fontSize:"0.9rem",marginBottom:14,color:"rgba(255,255,255,0.75)"}}>Cấu trúc 15 câu OPIc</div>
        {TYPE_GROUPS.map(g=>(
          <div key={g.tag} style={{display:"flex",gap:14,padding:"11px 0",borderBottom:"1px solid rgba(255,255,255,0.05)",alignItems:"center"}}>
            <span style={{fontWeight:700,fontSize:"0.75rem",color:"rgba(255,255,255,0.7)",minWidth:52}}>{g.tag}</span>
            <span style={{fontWeight:600,fontSize:"0.85rem"}}>{g.label}</span>
            <span style={{color:"rgba(255,255,255,0.3)",fontSize:"0.8rem"}}>— {g.vi}</span>
          </div>
        ))}
      </div>
      <div style={{display:"flex",justifyContent:"center",marginTop:24}}>
        <InnerBtn label="Bắt đầu thi thử →" onClick={()=>{setMode("exam");setPage("home");}} variant="primary"/>
      </div>
    </InnerPage>
  );

  return null;
}
