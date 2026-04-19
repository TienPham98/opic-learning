"use client";
import { useState, useCallback, useEffect } from "react";

/* ═══════════════════ TYPES ═══════════════════ */
interface Vocab    { word: string; meaning: string; example: string; }
interface Question { type: string; question: string; tip: string; sample: string; vocabulary: Vocab[]; keyPoints: string[]; }
interface Score    { score: number; estimatedLevel: string; strengths: string[]; improvements: string[]; overall: string; }
interface Fav      { id: string; questionText: string; sample: string; topicName: string; level: string; type: string; savedAt: string; }
type Page = "home"|"topic"|"survey"|"level"|"exam"|"done"|"favs"|"guide";

/* ═══════════════════ DATA ═══════════════════ */
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
const LEVELS = [
  {id:"IM1",label:"IM1",sub:"Inter. Mid 1"},{id:"IM2",label:"IM2",sub:"Inter. Mid 2"},
  {id:"IM3",label:"IM3",sub:"Inter. Mid 3"},{id:"IH",label:"IH",sub:"Inter. High"},
  {id:"AL",label:"AL",sub:"Adv. Low"},
];
const TYPE_GROUPS = [
  {range:[0,2],tag:"Q1–3",label:"Describe",vi:"Mô tả"},
  {range:[3,5],tag:"Q4–6",label:"Compare",vi:"So sánh"},
  {range:[6,8],tag:"Q7–9",label:"Past Experience",vi:"Kinh nghiệm"},
  {range:[9,11],tag:"Q10–12",label:"Role-play",vi:"Tình huống"},
  {range:[12,14],tag:"Q13–15",label:"Mixed",vi:"Hỗn hợp"},
];
const TMETA: Record<string,{label:string;c:string;bg:string}> = {
  describe:{label:"Describe",  c:"#185FA5",bg:"#E6F1FB"},
  compare: {label:"Compare",   c:"#534AB7",bg:"#EEEDFE"},
  past:    {label:"Past exp.", c:"#0F6E56",bg:"#E1F5EE"},
  roleplay:{label:"Role-play", c:"#854F0B",bg:"#FAEEDA"},
  mixed:   {label:"Mixed",     c:"#993C1D",bg:"#FAECE7"},
};

/* ═══════════════════ STORAGE ═══════════════════ */
const FAV_KEY = "opic-favs-v1";
function loadFavs(): Fav[] {
  if (typeof window==="undefined") return [];
  try { return JSON.parse(localStorage.getItem(FAV_KEY)||"[]"); } catch { return []; }
}
function saveFavs(f:Fav[]) { localStorage.setItem(FAV_KEY,JSON.stringify(f)); }

/* ═══════════════════ API ═══════════════════ */
async function callAI(prompt:string,max=2500) {
  const r = await fetch("/api/generate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt,maxTokens:max})});
  if (!r.ok) throw new Error("API error");
  return r.json();
}
async function callScore(question:string,answer:string,level:string):Promise<Score> {
  const r = await fetch("/api/score",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({question,answer,level})});
  if (!r.ok) throw new Error("Score error");
  return r.json();
}

/* ═══════════════════ TTS ═══════════════════ */
function useTTS() {
  const [idx,setIdx]=useState<number|null>(null);
  const stop=useCallback(()=>{ if(typeof window!=="undefined") window.speechSynthesis?.cancel(); setIdx(null); },[]);
  const toggle=useCallback((i:number,text:string)=>{
    if(idx===i){stop();return;}
    stop();
    if(typeof window==="undefined"||!window.speechSynthesis) return;
    setIdx(i);
    const u=new SpeechSynthesisUtterance(text);
    u.lang="en-US";u.rate=0.9;
    u.onend=()=>setIdx(null);u.onerror=()=>setIdx(null);
    window.speechSynthesis.speak(u);
  },[idx,stop]);
  return {speakIdx:idx,toggle,stop};
}

/* ═══════════════════ DESIGN TOKENS ═══════════════════ */
const C={
  blue:"#185FA5",blueDk:"#0C447C",blueMd:"#378ADD",blueBg:"#E6F1FB",
  teal:"#0F6E56",tealMd:"#1D9E75",tealBg:"#E1F5EE",tealDk:"#065f46",
  amber:"#854F0B",amberMd:"#EF9F27",amberBg:"#FAEEDA",
  coral:"#993C1D",coralBg:"#FAECE7",
  purple:"#534AB7",purpleBg:"#EEEDFE",
  txt:"#0F172A",muted:"#64748B",hint:"#94A3B8",
  border:"#E2E8F0",border2:"#CBD5E1",surf:"#fff",surf2:"#F8FAFC",
};

/* ═══════════════════ ICONS ═══════════════════ */
const IcoSpeaker=()=><svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M2 4.5v5l4-2.5-4-2.5z" fill="currentColor"/><path d="M8 3.5c1.4.9 2.5 2 2.5 3.5S9.4 10.1 8 11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/><path d="M9.5 1.5c2.5 1.5 3.5 3 3.5 5.5s-1 4-3.5 5.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>;
const IcoPause=()=><svg width="13" height="13" viewBox="0 0 14 14" fill="none"><rect x="2" y="2" width="4" height="10" rx="1" fill="currentColor"/><rect x="8" y="2" width="4" height="10" rx="1" fill="currentColor"/></svg>;
const IcoHeart=(filled:boolean)=><svg width="14" height="14" viewBox="0 0 14 14" fill={filled?"#ef4444":"none"} stroke={filled?"#ef4444":"#94A3B8"} strokeWidth="1.5"><path d="M7 12S1 8.5 1 4.5A3 3 0 0 1 7 3.2 3 3 0 0 1 13 4.5C13 8.5 7 12 7 12z"/></svg>;
const IcoCheck=()=><svg width="10" height="10" viewBox="0 0 10 10"><polyline points="1,5 4,8 9,2" stroke="white" strokeWidth="2" fill="none"/></svg>;
const Wave=()=><span style={{display:"inline-flex",alignItems:"center",gap:2,marginLeft:3}}>{[8,13,6,10].map((h,i)=><span key={i} style={{display:"inline-block",width:3,height:h,borderRadius:2,background:C.tealMd,animation:`wave .7s ease ${[0,.12,.24,.06][i]}s infinite`}}/>)}</span>;

/* ═══════════════════ SHARED BUTTON STYLE ═══════════════════ */
const bBase:React.CSSProperties={display:"inline-flex",alignItems:"center",gap:6,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",fontWeight:600,transition:"all .18s",border:"none"};
const Btn={
  primary:{...bBase,padding:"10px 20px",borderRadius:8,background:C.blue,color:"#fff",fontSize:"0.87rem"},
  secondary:{...bBase,padding:"10px 20px",borderRadius:8,background:C.surf,color:C.txt,fontSize:"0.87rem",border:`1px solid ${C.border2}`},
  sm:{...bBase,padding:"6px 13px",borderRadius:7,background:C.surf,color:C.txt,fontSize:"0.78rem",border:`1px solid ${C.border2}`},
} as const;

/* ═══════════════════ FLASHCARD ═══════════════════ */
function FlashCards({vocabs}:{vocabs:Vocab[]}) {
  const [idx,setIdx]=useState(0);
  const [flipped,setFlipped]=useState(false);
  if(!vocabs?.length) return null;
  const v=vocabs[idx];
  return(
    <div style={{marginTop:14}}>
      <div style={{fontSize:"0.7rem",fontWeight:700,color:C.hint,textTransform:"uppercase",letterSpacing:"0.7px",marginBottom:8}}>Từ vựng key ({vocabs.length} từ)</div>
      <div onClick={()=>setFlipped(f=>!f)} style={{background:flipped?C.blueBg:C.surf2,border:`1.5px solid ${flipped?C.blueMd:C.border}`,borderRadius:12,padding:"22px 16px",textAlign:"center",cursor:"pointer",minHeight:96,transition:"all .25s",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:6}}>
        {!flipped
          ?<><div style={{fontFamily:"'Sora',sans-serif",fontWeight:700,fontSize:"1.25rem",color:C.txt}}>{v.word}</div><div style={{fontSize:"0.7rem",color:C.hint}}>Nhấn để xem nghĩa</div></>
          :<><div style={{fontFamily:"'Sora',sans-serif",fontWeight:700,fontSize:"1.1rem",color:C.blue,marginBottom:4}}>{v.meaning}</div>{v.example&&<div style={{fontSize:"0.8rem",color:C.muted,fontStyle:"italic"}}>"{v.example}"</div>}</>
        }
      </div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:12,marginTop:10}}>
        <button style={{...Btn.sm,width:32,height:32,padding:0,justifyContent:"center"}} disabled={idx===0} onClick={()=>{setIdx(i=>Math.max(0,i-1));setFlipped(false);}}>←</button>
        <span style={{fontSize:"0.78rem",color:C.muted,fontWeight:500}}>{idx+1}/{vocabs.length}</span>
        <button style={{...Btn.sm,width:32,height:32,padding:0,justifyContent:"center"}} disabled={idx===vocabs.length-1} onClick={()=>{setIdx(i=>Math.min(vocabs.length-1,i+1));setFlipped(false);}}>→</button>
      </div>
    </div>
  );
}

/* ═══════════════════ KEY POINTS ═══════════════════ */
function KeyPoints({points}:{points:string[]}) {
  if(!points?.length) return null;
  return(
    <div style={{marginTop:14}}>
      <div style={{fontSize:"0.7rem",fontWeight:700,color:C.hint,textTransform:"uppercase",letterSpacing:"0.7px",marginBottom:8}}>Thành phần bài mẫu</div>
      <div style={{display:"grid",gap:6}}>
        {points.map((p,i)=>(
          <div key={i} style={{display:"flex",gap:10,alignItems:"flex-start",padding:"9px 12px",background:C.surf2,borderRadius:8,border:`1px solid ${C.border}`}}>
            <span style={{width:20,height:20,borderRadius:"50%",background:C.blue,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.68rem",fontWeight:700,flexShrink:0}}>{i+1}</span>
            <span style={{fontSize:"0.84rem",color:"#334155",lineHeight:1.55}}>{p}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════ SCORE DISPLAY ═══════════════════ */
function ScoreDisplay({result}:{result:Score}) {
  const sc=result.score;
  const col=sc>=8?C.teal:sc>=6?C.blue:sc>=4?C.amber:C.coral;
  const bg=sc>=8?C.tealBg:sc>=6?C.blueBg:sc>=4?C.amberBg:C.coralBg;
  return(
    <div style={{background:bg,borderRadius:12,padding:18,marginTop:12,border:`1.5px solid ${col}40`,animation:"fadeUp .3s ease"}}>
      <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:12}}>
        <div style={{width:56,height:56,borderRadius:"50%",background:col,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
          <span style={{fontFamily:"'Sora',sans-serif",fontWeight:800,fontSize:"1.4rem",color:"#fff"}}>{sc}</span>
        </div>
        <div>
          <div style={{fontFamily:"'Sora',sans-serif",fontWeight:700,color:col,fontSize:"0.95rem"}}>Điểm: {sc}/10</div>
          <div style={{fontSize:"0.78rem",color:C.muted}}>Tương đương cấp <strong>{result.estimatedLevel}</strong></div>
        </div>
      </div>
      <div style={{fontSize:"0.86rem",color:"#334155",lineHeight:1.7,marginBottom:10}}>{result.overall}</div>
      {result.strengths?.length>0&&<div style={{marginBottom:8}}>
        <div style={{fontSize:"0.7rem",fontWeight:700,color:col,textTransform:"uppercase",letterSpacing:"0.4px",marginBottom:5}}>Điểm mạnh</div>
        {result.strengths.map((s,i)=><div key={i} style={{fontSize:"0.83rem",color:"#1e3a2f",padding:"2px 0"}}>✓ {s}</div>)}
      </div>}
      {result.improvements?.length>0&&<div>
        <div style={{fontSize:"0.7rem",fontWeight:700,color:C.amber,textTransform:"uppercase",letterSpacing:"0.4px",marginBottom:5}}>Cần cải thiện</div>
        {result.improvements.map((s,i)=><div key={i} style={{fontSize:"0.83rem",color:"#451a00",padding:"2px 0"}}>↑ {s}</div>)}
      </div>}
    </div>
  );
}

/* ═══════════════════ SAMPLE BLOCK ═══════════════════ */
interface SBProps {
  q:Question; qi:number; level:string; topicName:string;
  speakIdx:number|null; toggleTTS:(i:number,t:string)=>void;
  shown:boolean; onToggle:()=>void;
  isFav:boolean; onToggleFav:()=>void;
  userAnswer:string; onAnswerChange:(v:string)=>void;
  score:Score|null; scoring:boolean; onScore:()=>void;
  vocabOpen:boolean; onVocabToggle:()=>void;
  kpOpen:boolean; onKpToggle:()=>void;
}
function SampleBlock(p:SBProps) {
  const speaking=p.speakIdx===p.qi;
  return(
    <>
      <div style={{display:"flex",gap:8,alignItems:"center",marginTop:10,flexWrap:"wrap"}}>
        <button style={Btn.sm} onClick={p.onToggle}>{p.shown?"▲ Ẩn bài mẫu":"▼ Xem bài mẫu"}</button>
        {p.shown&&<>
          <button style={{...Btn.sm,background:speaking?C.tealBg:C.surf,color:C.teal,border:`1px solid ${speaking?C.tealMd:C.border2}`}} onClick={()=>p.toggleTTS(p.qi,p.q.sample)}>
            {speaking?<IcoPause/>:<IcoSpeaker/>}{speaking?<><span>Đang đọc</span><Wave/></>:"Đọc to"}
          </button>
          {(p.q.vocabulary?.length>0)&&
            <button style={{...Btn.sm,background:p.vocabOpen?C.blueBg:C.surf,color:C.blue,border:`1px solid ${p.vocabOpen?C.blueMd:C.border2}`}} onClick={p.onVocabToggle}>
              {p.vocabOpen?"Ẩn từ vựng":"📖 Từ vựng"}
            </button>}
          {(p.q.keyPoints?.length>0)&&
            <button style={{...Btn.sm,background:p.kpOpen?"#EEEDFE":C.surf,color:C.purple,border:`1px solid ${p.kpOpen?C.purple:C.border2}`}} onClick={p.onKpToggle}>
              {p.kpOpen?"Ẩn phân tích":"🔍 Phân tích"}
            </button>}
          <button style={{...Btn.sm,background:p.isFav?"#fff0f0":C.surf,border:`1px solid ${p.isFav?"#ef4444":C.border2}`,gap:5}} onClick={p.onToggleFav}>
            {IcoHeart(p.isFav)}{p.isFav?"Đã lưu":"Lưu"}
          </button>
        </>}
      </div>

      {p.shown&&<div style={{background:C.tealBg,borderRadius:12,padding:18,borderLeft:`4px solid ${C.tealMd}`,marginTop:10,animation:"fadeUp .3s ease"}}>
        <div style={{fontSize:"0.7rem",fontWeight:700,color:C.teal,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:8}}>Bài mẫu — Cấp {p.level}</div>
        <div style={{fontSize:"0.9rem",color:C.tealDk,lineHeight:1.8}}>{p.q.sample}</div>
      </div>}
      {p.shown&&p.vocabOpen&&p.q.vocabulary?.length>0&&<FlashCards vocabs={p.q.vocabulary}/>}
      {p.shown&&p.kpOpen&&p.q.keyPoints?.length>0&&<KeyPoints points={p.q.keyPoints}/>}

      <div style={{marginTop:14,background:C.surf2,borderRadius:12,padding:16,border:`1px solid ${C.border}`}}>
        <div style={{fontSize:"0.7rem",fontWeight:700,color:C.hint,textTransform:"uppercase",letterSpacing:"0.7px",marginBottom:8}}>✦ Luyện viết — Tự chấm điểm AI</div>
        <textarea value={p.userAnswer} onChange={e=>p.onAnswerChange(e.target.value)}
          placeholder="Nhập câu trả lời của bạn bằng tiếng Anh tại đây..."
          style={{width:"100%",minHeight:90,border:`1px solid ${C.border2}`,borderRadius:8,padding:12,fontSize:"0.87rem",fontFamily:"'DM Sans',sans-serif",resize:"vertical",outline:"none",background:"#fff",color:C.txt,lineHeight:1.6}}/>
        <div style={{display:"flex",justifyContent:"flex-end",marginTop:8}}>
          <button style={{...Btn.primary,opacity:(!p.userAnswer.trim()||p.scoring)?0.5:1,cursor:(!p.userAnswer.trim()||p.scoring)?"not-allowed":"pointer"}}
            onClick={p.onScore} disabled={!p.userAnswer.trim()||p.scoring}>
            {p.scoring?"⏳ Đang chấm...":"✦ Chấm điểm AI"}
          </button>
        </div>
        {p.score&&<ScoreDisplay result={p.score}/>}
      </div>
    </>
  );
}

/* ═══════════════════ QUESTION CARD ═══════════════════ */
function QCard(p:SBProps&{showGroup?:boolean}) {
  const grp=p.showGroup?TYPE_GROUPS.find(g=>p.qi>=g.range[0]&&p.qi<=g.range[1]):undefined;
  const tm=TMETA[p.q.type]||TMETA.describe;
  return(
    <div style={{background:C.surf,border:`1px solid ${C.border}`,borderRadius:20,padding:24,marginBottom:16,animation:"fadeUp .3s ease"}}>
      {grp&&<div style={{background:C.surf2,borderRadius:10,padding:"9px 14px",marginBottom:14,border:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:10}}>
        <span style={{fontFamily:"'Sora',sans-serif",fontWeight:700,fontSize:"0.73rem",color:C.hint,textTransform:"uppercase",letterSpacing:"0.7px"}}>{grp.tag}</span>
        <span style={{fontFamily:"'Sora',sans-serif",fontWeight:700,fontSize:"0.88rem",color:C.txt}}>{grp.label}</span>
        <span style={{color:C.hint,fontSize:"0.82rem"}}>— {grp.vi}</span>
      </div>}
      <div style={{display:"flex",alignItems:"flex-start",gap:14,marginBottom:14}}>
        <div style={{width:38,height:38,borderRadius:"50%",background:C.blueBg,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Sora',sans-serif",fontWeight:700,fontSize:"0.88rem",color:C.blue,flexShrink:0}}>{p.qi+1}</div>
        <div style={{flex:1}}>
          <span style={{display:"inline-block",padding:"3px 10px",borderRadius:20,fontSize:"0.7rem",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.4px",marginBottom:10,background:tm.bg,color:tm.c}}>{tm.label}</span>
          <div style={{background:C.surf2,borderRadius:12,padding:"16px 18px",borderLeft:`4px solid ${C.blueMd}`,fontFamily:"'Sora',sans-serif",fontWeight:600,fontSize:"0.98rem",lineHeight:1.65}}>{p.q.question}</div>
        </div>
      </div>
      <div style={{background:C.amberBg,borderRadius:8,padding:"12px 15px",borderLeft:`4px solid ${C.amberMd}`,marginBottom:12}}>
        <div style={{fontSize:"0.7rem",fontWeight:700,color:C.amber,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:4}}>Gợi ý trả lời</div>
        <div style={{fontSize:"0.86rem",color:"#78350F",lineHeight:1.65}}>{p.q.tip}</div>
      </div>
      <SampleBlock {...p}/>
    </div>
  );
}

/* ═══════════════════ HEADER ═══════════════════ */
function Header({page,onHome,onGuide,onFavs,favCount}:{page:Page;onHome:()=>void;onGuide:()=>void;onFavs:()=>void;favCount:number}) {
  return(
    <header style={{background:C.surf,borderBottom:`1px solid ${C.border2}`,padding:"0 20px",display:"flex",alignItems:"center",justifyContent:"space-between",height:58,position:"sticky",top:0,zIndex:50}}>
      <div style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer"}} onClick={onHome}>
        <div style={{width:34,height:34,background:C.blueBg,borderRadius:9,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Sora',sans-serif",fontWeight:800,fontSize:13,color:C.blue}}>Op</div>
        <span style={{fontFamily:"'Sora',sans-serif",fontWeight:800,fontSize:"1.1rem",color:C.blue}}>OPIc Learn</span>
      </div>
      <div style={{display:"flex",gap:4,background:"#F1F5F9",borderRadius:8,padding:3}}>
        {[["home","Trang chủ"],["guide","Hướng dẫn"]] .map(([k,v])=>(
          <button key={k} style={{padding:"5px 14px",borderRadius:6,border:"none",cursor:"pointer",fontSize:"0.8rem",fontWeight:500,fontFamily:"'DM Sans',sans-serif",background:page===k?C.surf:"transparent",color:page===k?C.txt:C.muted,transition:"all .18s"}}
            onClick={k==="guide"?onGuide:onHome}>{v}</button>
        ))}
        <button style={{padding:"5px 12px",borderRadius:6,border:"none",cursor:"pointer",fontSize:"0.8rem",fontWeight:600,fontFamily:"'DM Sans',sans-serif",background:page==="favs"?C.surf:"transparent",color:page==="favs"?"#ef4444":C.muted,transition:"all .18s",display:"flex",alignItems:"center",gap:4}} onClick={onFavs}>
          {IcoHeart(favCount>0)}Đã lưu{favCount>0&&<span style={{background:"#ef4444",color:"#fff",borderRadius:20,fontSize:"0.65rem",fontWeight:700,padding:"1px 6px"}}>{favCount}</span>}
        </button>
      </div>
    </header>
  );
}

/* ═══════════════════ SHARED COMPONENTS ═══════════════════ */
const ProgBar=({pct}:{pct:number})=><div style={{height:5,background:C.border,borderRadius:3,overflow:"hidden",marginBottom:20}}><div style={{height:"100%",width:`${pct}%`,background:`linear-gradient(90deg,${C.blueMd},${C.tealMd})`,borderRadius:3,transition:"width .4s ease"}}/></div>;
const LvGrid=({level,setLevel}:{level:string;setLevel:(v:string)=>void})=>(
  <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8,marginBottom:14}}>
    {LEVELS.map(lv=>(
      <div key={lv.id} style={{border:`${level===lv.id?"2px":"1px"} solid ${level===lv.id?C.blueMd:C.border}`,borderRadius:12,padding:"12px 8px",cursor:"pointer",textAlign:"center",transition:"all .18s",background:level===lv.id?C.blueBg:C.surf}} onClick={()=>setLevel(lv.id)}>
        <div style={{fontFamily:"'Sora',sans-serif",fontWeight:700,fontSize:"1rem",color:level===lv.id?C.blue:C.txt,marginBottom:2}}>{lv.label}</div>
        <div style={{fontSize:"0.68rem",color:C.hint}}>{lv.sub}</div>
      </div>
    ))}
  </div>
);
const Spinner=()=><div style={{width:44,height:44,border:`3px solid ${C.border}`,borderTopColor:C.blueMd,borderRadius:"50%",animation:"spin .7s linear infinite",margin:"0 auto 16px"}}/>;
const TopBar=({title,onBack,extra}:{title:string;onBack:()=>void;extra?:React.ReactNode})=>(
  <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:24}}>
    <button style={Btn.sm} onClick={onBack}>← Quay lại</button>
    <span style={{fontFamily:"'Sora',sans-serif",fontWeight:700,fontSize:"0.95rem"}}>{title}</span>
    {extra&&<div style={{marginLeft:"auto"}}>{extra}</div>}
  </div>
);

/* ═══════════════════ MAIN APP ═══════════════════ */
export default function App() {
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
  const [vocabOpen,setVocabOpen] = useState<Record<number,boolean>>({});
  const [kpOpen,setKpOpen]     = useState<Record<number,boolean>>({});
  const [answers,setAnswers]   = useState<Record<number,string>>({});
  const [scores,setScores]     = useState<Record<number,Score>>({});
  const [scoring,setScoring]   = useState<Record<number,boolean>>({});
  const {speakIdx,toggle:tts,stop:stopSpeech} = useTTS();

  useEffect(()=>{ setFavs(loadFavs()); },[]);

  const goHome=useCallback(()=>{
    stopSpeech();
    setPage("home");setMode(null);setTopic(null);
    setTopicQs([]);setExamQs([]);setExamIdx(0);
    setShown({});setVocabOpen({});setKpOpen({});
    setAnswers({});setScores({});setScoring({});setLoading(false);
    setSqIdx(0);setSqAns({});
  },[stopSpeech]);

  const tp=TOPICS.find(t=>t.id===topic);
  const topicName=tp?.name||"";

  /* Favorites */
  const isFav=(qText:string)=>favs.some(f=>f.questionText===qText);
  const toggleFav=(q:Question,level:string)=>{
    const existing=favs.find(f=>f.questionText===q.question);
    const next=existing?favs.filter(f=>f.questionText!==q.question)
      :[...favs,{id:Date.now().toString(),questionText:q.question,sample:q.sample,topicName,level,type:q.type,savedAt:new Date().toLocaleDateString("vi-VN")}];
    setFavs(next);saveFavs(next);
  };

  /* Score handler */
  const handleScore=async(qi:number,q:Question,level:string)=>{
    const ans=answers[qi]?.trim();
    if(!ans) return;
    setScoring(p=>({...p,[qi]:true}));
    try { const r=await callScore(q.question,ans,level); setScores(p=>({...p,[qi]:r})); }
    catch { alert("Lỗi chấm điểm. Thử lại!"); }
    finally { setScoring(p=>({...p,[qi]:false})); }
  };

  /* Survey helpers */
  const curSQ=SQS[sqIdx];
  const canNext=(()=>{const a=sqAns[curSQ?.id];if(curSQ?.multi)return Array.isArray(a)&&a.length>0;return a!==undefined&&a!==null;})();
  const selOpt=(i:number)=>{
    const q=SQS[sqIdx];
    if(q.multi){const cur=(sqAns[q.id] as number[]|undefined)||[];setSqAns(p=>({...p,[q.id]:cur.includes(i)?cur.filter(x=>x!==i):[...cur,i]}));}
    else{setSqAns(p=>({...p,[q.id]:i}));}
  };

  /* AI calls */
  async function startTopic(){
    if(!topic) return;
    setPage("topic");setLoading(true);setTopicQs([]);setShown({});setVocabOpen({});setKpOpen({});setAnswers({});setScores({});
    try{
      const data=await callAI(`You are an OPIc expert. Generate 5 practice questions for the topic "${topicName}" at ${topicLv} level.
Return ONLY valid JSON (no markdown):
{"questions":[
  {"type":"describe","question":"...","tip":"(Vietnamese tip) ...","sample":"(English ${topicLv}, 4-6 natural sentences) ...","vocabulary":[{"word":"...","meaning":"...(Vietnamese)","example":"...(English)"},{"word":"...","meaning":"...","example":"..."},{"word":"...","meaning":"...","example":"..."},{"word":"...","meaning":"...","example":"..."},{"word":"...","meaning":"...","example":"..."}],"keyPoints":["Mở bài: ...","Nội dung chính: ...","Chi tiết cụ thể: ...","Kết luận: ..."]},
  {"type":"compare","question":"...","tip":"...","sample":"...","vocabulary":[...],"keyPoints":[...]},
  {"type":"past","question":"...","tip":"...","sample":"...","vocabulary":[...],"keyPoints":[...]},
  {"type":"roleplay","question":"...","tip":"...","sample":"...","vocabulary":[...],"keyPoints":[...]},
  {"type":"describe","question":"...","tip":"...","sample":"...","vocabulary":[...],"keyPoints":[...]}
]}`,3800);
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
Q1-3: type "describe", Q4-6: type "compare", Q7-9: type "past", Q10-12: type "roleplay", Q13-15: type "mixed"
Return ONLY valid JSON:
{"questions":[{"type":"describe","question":"...","tip":"(Vietnamese)...","sample":"(English ${examLv} 4-6 sentences)...","vocabulary":[],"keyPoints":[]},... 15 total]}`,5500);
      setExamQs(data.questions||[]);
    }catch{alert("Lỗi tạo đề thi. Thử lại!");goHome();}
    finally{setLoading(false);}
  }

  /* QCard props builder */
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

  const layout=(children:React.ReactNode)=>(
    <div style={{minHeight:"100vh",display:"flex",flexDirection:"column"}}>
      <Header page={page} onHome={goHome} onGuide={()=>setPage("guide")} onFavs={()=>setPage("favs")} favCount={favs.length}/>
      <main style={{maxWidth:860,margin:"0 auto",padding:"28px 16px",width:"100%",flex:1}}>{children}</main>
    </div>
  );
  const card:React.CSSProperties={background:C.surf,border:`1px solid ${C.border}`,borderRadius:20,padding:24,marginBottom:16};
  const LoadScreen=({text,sub}:{text:string;sub?:string})=>(
    <div style={{textAlign:"center",padding:"72px 20px"}}><Spinner/>
      <p style={{fontSize:"0.93rem",color:C.muted,marginBottom:4}}>{text}</p>
      {sub&&<p style={{fontSize:"0.8rem",color:C.hint}}>{sub}</p>}
    </div>
  );

  /* ── HOME ── */
  if(page==="home") return layout(<>
    <h1 style={{fontFamily:"'Sora',sans-serif",fontWeight:700,fontSize:"1.5rem",marginBottom:6}}>Luyện thi OPIc thông minh</h1>
    <p style={{fontSize:"0.9rem",color:C.muted,marginBottom:28}}>Chọn chế độ luyện tập phù hợp với bạn</p>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:28}}>
      {[{k:"topic",icon:"📝",bg:C.blueBg,name:"Luyện theo chủ đề",desc:"Chọn chủ đề + cấp độ, AI tạo 5 câu kèm từ vựng flashcard, phân tích bài mẫu và chấm điểm."},
        {k:"exam",icon:"🎯",bg:C.tealBg,name:"Thi thử OPIc thật",desc:"Khảo sát nền 7 câu → chọn cấp độ → 15 câu cá nhân hoá + bài mẫu + chấm điểm.",isNew:true}
      ].map(m=>(
        <div key={m.k} style={{background:mode===m.k?C.blueBg:C.surf,border:`${mode===m.k?"2px":"1px"} solid ${mode===m.k?C.blueMd:C.border}`,borderRadius:20,padding:"22px 20px",cursor:"pointer",transition:"all .2s",position:"relative",overflow:"hidden"}} onClick={()=>{setMode(m.k as "topic"|"exam");setTopic(null);}}>
          {m.isNew&&<span style={{position:"absolute",top:12,right:12,background:C.amberBg,color:C.amber,fontSize:"0.65rem",fontWeight:700,padding:"2px 8px",borderRadius:20,textTransform:"uppercase"}}>Mới</span>}
          <div style={{width:46,height:46,borderRadius:12,background:m.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,marginBottom:14}}>{m.icon}</div>
          <div style={{fontFamily:"'Sora',sans-serif",fontWeight:700,fontSize:"0.98rem",marginBottom:6}}>{m.name}</div>
          <div style={{fontSize:"0.82rem",color:C.muted,lineHeight:1.55}}>{m.desc}</div>
        </div>
      ))}
    </div>

    {mode==="topic"&&<div style={{animation:"fadeUp .3s ease"}}>
      <div style={{fontFamily:"'Sora',sans-serif",fontWeight:600,fontSize:"0.9rem",marginBottom:10}}>① Chọn cấp độ mong muốn</div>
      <LvGrid level={topicLv} setLevel={setTopicLv}/>
      <div style={{fontFamily:"'Sora',sans-serif",fontWeight:600,fontSize:"0.9rem",marginBottom:10,marginTop:18}}>② Chọn chủ đề luyện tập</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(128px,1fr))",gap:9,marginBottom:22}}>
        {TOPICS.map(t=>(
          <div key={t.id} style={{background:topic===t.id?C.blueBg:C.surf,border:`${topic===t.id?"2px":"1px"} solid ${topic===t.id?C.blueMd:C.border}`,borderRadius:12,padding:"13px 10px",cursor:"pointer",textAlign:"center",transition:"all .18s",fontSize:"0.82rem",fontWeight:topic===t.id?600:500,color:topic===t.id?C.blue:C.muted}} onClick={()=>setTopic(t.id)}>
            <span style={{fontSize:22,display:"block",marginBottom:6}}>{t.icon}</span>{t.name}
          </div>
        ))}
      </div>
      <div style={{display:"flex",justifyContent:"flex-end"}}>
        <button style={{...Btn.primary,opacity:topic?1:0.5,cursor:topic?"pointer":"not-allowed"}} onClick={()=>topic&&startTopic()}>Bắt đầu luyện tập →</button>
      </div>
    </div>}

    {mode==="exam"&&<div style={{...card,animation:"fadeUp .3s ease"}}>
      <div style={{display:"flex",gap:16}}><span style={{fontSize:28,flexShrink:0}}>📋</span>
        <div>
          <div style={{fontFamily:"'Sora',sans-serif",fontWeight:700,marginBottom:8}}>Quy trình thi thử OPIc</div>
          <ol style={{paddingLeft:18,color:C.muted,fontSize:"0.87rem",lineHeight:2.2}}>
            <li><strong>Khảo sát nền</strong> — 7 câu giống đề thật</li>
            <li><strong>Chọn cấp độ</strong> mục tiêu: IM1 / IM2 / IM3 / IH / AL</li>
            <li><strong>15 câu hỏi</strong> cá nhân hoá theo hồ sơ của bạn</li>
            <li>Xem <strong>bài mẫu</strong>, <strong>đọc to</strong>, <strong>lưu yêu thích</strong> và <strong>chấm điểm</strong></li>
          </ol>
        </div>
      </div>
      <div style={{display:"flex",justifyContent:"flex-end",marginTop:16}}>
        <button style={Btn.primary} onClick={()=>{setSqIdx(0);setSqAns({});setPage("survey");}}>Bắt đầu →</button>
      </div>
    </div>}
  </>);

  /* ── TOPIC ── */
  if(page==="topic") return layout(loading?<LoadScreen text={`AI đang tạo câu hỏi cho "${tp?.name}"...`} sub="Bao gồm từ vựng flashcard và phân tích bài mẫu"/>:(
    <><TopBar title={`${tp?.icon} ${tp?.name} — Cấp ${topicLv}`} onBack={goHome}
        extra={<button style={Btn.sm} onClick={()=>{stopSpeech();setTopicQs([]);setShown({});setVocabOpen({});setKpOpen({});setAnswers({});setScores({});startTopic();}}>🔄 Tạo lại</button>}/>
      {topicQs.map((q,i)=><QCard key={i} {...qp(q,i,topicLv)}/>)}
    </>
  ));

  /* ── SURVEY ── */
  if(page==="survey"){
    const q=SQS[sqIdx];
    const ans=sqAns[q.id];
    const isMul=q.multi;
    const selArr=isMul?((ans as number[])||[]):[];
    const selS=isMul?-1:(ans as number??-1);
    return layout(<>
      <TopBar title="Khảo sát nền OPIc" onBack={goHome}/>
      <div style={{display:"flex",alignItems:"center",marginBottom:22,flexWrap:"wrap"}}>
        {SQS.map((_,i)=>(
          <span key={i} style={{display:"flex",alignItems:"center",flex:i<SQS.length-1?1:"none"}}>
            <span style={{width:26,height:26,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.7rem",fontWeight:700,flexShrink:0,background:i<sqIdx?C.tealBg:i===sqIdx?C.blue:"#F1F5F9",color:i<sqIdx?C.teal:i===sqIdx?"#fff":C.hint}}>{i<sqIdx?"✓":i+1}</span>
            {i<SQS.length-1&&<span style={{flex:1,height:1,background:C.border,minWidth:6}}/>}
          </span>
        ))}
      </div>
      <div style={card}>
        <ProgBar pct={(sqIdx/SQS.length)*100}/>
        <div style={{fontSize:"0.7rem",fontWeight:700,color:C.hint,textTransform:"uppercase",letterSpacing:"0.6px",marginBottom:6}}>Câu hỏi {sqIdx+1} / {SQS.length}</div>
        <div style={{fontFamily:"'Sora',sans-serif",fontWeight:600,fontSize:"1.05rem",lineHeight:1.55,marginBottom:16}}>{q.q}</div>
        {isMul&&<p style={{fontSize:"0.76rem",color:C.hint,marginBottom:10}}>Có thể chọn nhiều đáp án</p>}
        <div style={{display:"grid",gap:8}}>
          {q.opts.map((opt,i)=>{
            const sel=isMul?selArr.includes(i):selS===i;
            return(
              <div key={i} style={{padding:"11px 15px",border:`${sel?"2px":"1px"} solid ${sel?C.blueMd:C.border}`,borderRadius:8,cursor:"pointer",display:"flex",alignItems:"center",gap:10,fontSize:"0.87rem",fontWeight:sel?500:400,background:sel?C.blueBg:C.surf,transition:"all .18s"}} onClick={()=>selOpt(i)}>
                {isMul
                  ?<span style={{width:18,height:18,borderRadius:4,border:`1.5px solid ${sel?C.blue:C.border2}`,background:sel?C.blue:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{sel&&<IcoCheck/>}</span>
                  :<span style={{width:18,height:18,borderRadius:"50%",border:`1.5px solid ${sel?C.blue:C.border2}`,background:sel?C.blue:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{sel&&<span style={{width:7,height:7,borderRadius:"50%",background:"#fff",display:"block"}}/>}</span>
                }{opt}
              </div>
            );
          })}
        </div>
        <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:20}}>
          {sqIdx>0&&<button style={Btn.secondary} onClick={()=>setSqIdx(sqIdx-1)}>← Trước</button>}
          <button style={{...Btn.primary,opacity:canNext?1:0.45,cursor:canNext?"pointer":"not-allowed"}} onClick={()=>canNext&&(sqIdx<SQS.length-1?setSqIdx(sqIdx+1):setPage("level"))}>
            {sqIdx<SQS.length-1?"Tiếp theo →":"Hoàn thành →"}
          </button>
        </div>
      </div>
    </>);
  }

  /* ── LEVEL ── */
  if(page==="level") return layout(<>
    <TopBar title="Chọn cấp độ mục tiêu" onBack={()=>{setSqIdx(SQS.length-1);setPage("survey");}}/>
    <div style={card}>
      <p style={{color:C.muted,fontSize:"0.87rem",marginBottom:16}}>AI sẽ tạo 15 câu hỏi phù hợp với cấp độ bạn chọn.</p>
      <LvGrid level={examLv} setLevel={setExamLv}/>
      <div style={{background:C.surf2,borderRadius:8,padding:"13px 15px",fontSize:"0.81rem",color:C.muted,lineHeight:1.9,marginBottom:16}}>
        <strong>Thang điểm:</strong> NL → NM → NH → <strong>IM1 → IM2 → IM3</strong> → IH → AL
      </div>
      <div style={{display:"flex",justifyContent:"flex-end"}}>
        <button style={Btn.primary} onClick={generateExam}>🎯 Tạo đề thi (15 câu) →</button>
      </div>
    </div>
  </>);

  /* ── EXAM ── */
  if(page==="exam") return layout(loading?<LoadScreen text="AI đang tạo đề thi cá nhân hoá..." sub={`Cấp ${examLv} · 15 câu`}/>:(
    examQs.length>0&&<>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
        <button style={Btn.sm} onClick={()=>{stopSpeech();goHome();}}>✕ Thoát</button>
        <div style={{textAlign:"center"}}>
          <div style={{fontFamily:"'Sora',sans-serif",fontWeight:700,fontSize:"0.88rem"}}>Đề thi thử · Cấp {examLv}</div>
          <div style={{fontSize:"0.76rem",color:C.hint}}>Câu {examIdx+1} / {examQs.length}</div>
        </div>
        <span style={{fontSize:"0.8rem",fontWeight:600,color:C.blue}}>{Math.round(((examIdx+1)/examQs.length)*100)}%</span>
      </div>
      <ProgBar pct={((examIdx+1)/examQs.length)*100}/>
      <QCard {...qp(examQs[examIdx],examIdx,examLv,true)}/>
      <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:4}}>
        {examIdx>0&&<button style={Btn.secondary} onClick={()=>{stopSpeech();setExamIdx(examIdx-1);setShown({});}}>← Câu trước</button>}
        {examIdx<examQs.length-1
          ?<button style={Btn.primary} onClick={()=>{stopSpeech();setExamIdx(examIdx+1);setShown({});}}>Câu tiếp →</button>
          :<button style={Btn.primary} onClick={()=>{stopSpeech();setPage("done");}}>🏁 Hoàn thành</button>}
      </div>
    </>
  ));

  /* ── DONE ── */
  if(page==="done") return layout(
    <div style={{textAlign:"center",padding:"60px 24px"}}>
      <div style={{fontSize:52,marginBottom:16}}>🏁</div>
      <div style={{fontFamily:"'Sora',sans-serif",fontWeight:700,fontSize:"1.5rem",marginBottom:8}}>Hoàn thành bài thi thử!</div>
      <p style={{color:C.muted,marginBottom:6}}>Cấp độ: <strong>{examLv}</strong> · {examQs.length} câu</p>
      <p style={{color:C.muted,marginBottom:28}}>Xem lại bài mẫu và tự chấm điểm từng câu.</p>
      <div style={{display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap"}}>
        <button style={Btn.secondary} onClick={()=>{setPage("exam");setExamIdx(0);setShown({});}}>Xem lại bài thi</button>
        <button style={Btn.secondary} onClick={()=>setPage("favs")}>Xem bài đã lưu</button>
        <button style={Btn.primary} onClick={goHome}>Thi thử lại</button>
      </div>
    </div>
  );

  /* ── FAVORITES ── */
  if(page==="favs") return layout(<>
    <TopBar title={`Bài đã lưu (${favs.length})`} onBack={goHome}/>
    {favs.length===0
      ?<div style={{...card,textAlign:"center",padding:"48px 24px"}}>
        <div style={{fontSize:36,marginBottom:12}}>💔</div>
        <div style={{fontFamily:"'Sora',sans-serif",fontWeight:700,marginBottom:8}}>Chưa có bài nào được lưu</div>
        <div style={{color:C.muted,fontSize:"0.87rem",marginBottom:20}}>Mở bài mẫu và nhấn "Lưu" để lưu vào đây.</div>
        <button style={Btn.primary} onClick={goHome}>Bắt đầu luyện tập</button>
      </div>
      :favs.map(f=>{const tm=TMETA[f.type]||TMETA.describe;return(
        <div key={f.id} style={card}>
          <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12,marginBottom:10}}>
            <div style={{flex:1}}>
              <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:6,flexWrap:"wrap"}}>
                <span style={{display:"inline-block",padding:"2px 9px",borderRadius:20,fontSize:"0.68rem",fontWeight:700,textTransform:"uppercase",background:tm.bg,color:tm.c}}>{tm.label}</span>
                <span style={{fontSize:"0.75rem",color:C.hint}}>{f.topicName} · Cấp {f.level} · {f.savedAt}</span>
              </div>
              <div style={{fontFamily:"'Sora',sans-serif",fontWeight:600,fontSize:"0.95rem",lineHeight:1.55,marginBottom:12}}>{f.questionText}</div>
            </div>
            <button style={{...Btn.sm,color:"#ef4444",border:"1px solid #fecaca",flexShrink:0}} onClick={()=>{const n=favs.filter(x=>x.id!==f.id);setFavs(n);saveFavs(n);}}>✕ Xoá</button>
          </div>
          <div style={{background:C.tealBg,borderRadius:12,padding:16,borderLeft:`4px solid ${C.tealMd}`}}>
            <div style={{fontSize:"0.68rem",fontWeight:700,color:C.teal,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:6}}>Bài mẫu</div>
            <div style={{fontSize:"0.87rem",color:C.tealDk,lineHeight:1.8}}>{f.sample}</div>
          </div>
        </div>
      );})}
  </>);

  /* ── GUIDE ── */
  if(page==="guide") return layout(<>
    <TopBar title="Cấp độ & Hướng dẫn OPIc" onBack={goHome}/>
    <div style={{...card,marginBottom:14}}>
      <div style={{fontFamily:"'Sora',sans-serif",fontWeight:600,fontSize:"0.9rem",marginBottom:14}}>Thang cấp độ OPIc</div>
      {[{lv:"Novice Low/Mid/High",t:"describe",d:"Trả lời bằng từ đơn, cụm từ ngắn. Rất hạn chế về từ vựng và ngữ pháp."},
        {lv:"IM1 / IM2 / IM3",t:"past",d:"Câu đơn giản, mô tả được chủ đề quen thuộc. Phổ biến nhất cho người đi làm."},
        {lv:"Intermediate High",t:"compare",d:"Câu ghép, mô tả và so sánh tốt. Xử lý được tình huống bất ngờ."},
        {lv:"Advanced Low",t:"roleplay",d:"Đoạn văn dài, lập luận logic, thuyết phục. Gần như lưu loát."},
      ].map(x=>{const tm=TMETA[x.t];return(
        <div key={x.lv} style={{display:"flex",alignItems:"flex-start",gap:12,padding:"11px 0",borderBottom:`1px solid ${C.surf2}`}}>
          <span style={{display:"inline-block",padding:"3px 10px",borderRadius:20,fontSize:"0.68rem",fontWeight:700,textTransform:"uppercase",background:tm.bg,color:tm.c,flexShrink:0,whiteSpace:"nowrap"}}>{x.lv}</span>
          <span style={{fontSize:"0.84rem",color:C.muted,paddingTop:4}}>{x.d}</span>
        </div>
      );})}
    </div>
    <div style={card}>
      <div style={{fontFamily:"'Sora',sans-serif",fontWeight:600,fontSize:"0.9rem",marginBottom:12}}>Cấu trúc 15 câu OPIc</div>
      {TYPE_GROUPS.map(g=>(
        <div key={g.tag} style={{display:"flex",gap:14,padding:"10px 0",borderBottom:`1px solid ${C.surf2}`,alignItems:"center"}}>
          <span style={{fontFamily:"'Sora',sans-serif",fontWeight:700,fontSize:"0.76rem",color:C.blue,minWidth:52}}>{g.tag}</span>
          <span style={{fontWeight:600,fontSize:"0.87rem"}}>{g.label}</span>
          <span style={{color:C.hint,fontSize:"0.82rem"}}>— {g.vi}</span>
        </div>
      ))}
    </div>
    <div style={{display:"flex",justifyContent:"center",marginTop:20}}>
      <button style={Btn.primary} onClick={()=>{setMode("exam");setPage("home");}}>Bắt đầu thi thử →</button>
    </div>
  </>);

  return null;
}
