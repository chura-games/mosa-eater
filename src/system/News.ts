// The news ticker across the top of the screen. Ordinary headlines scroll past until something
// the predator does makes the news; a breaking story then cuts in ahead of everything else.
const ordinary=[
 'コーラルコースト、今週末は晴天。海水浴には絶好の日和となる見込み',
 '地元漁協が豊漁を報告。「今年のイワシは脂がのっている」',
 '夏祭りの花火大会、来場者数が過去最多を更新',
 '観光協会「今季の宿泊予約は前年比120%」',
 '新しいビーチバーが開店。名物はパイナップルのかき氷',
 '市議会、遊歩道の改修予算を可決',
 'ヨットクラブが子ども向け体験教室の参加者を募集中',
 '水族館でウミガメの赤ちゃんが誕生。名前を公募',
 '路線バス、海岸線ルートを夏季限定で増便',
 '地元高校の水泳部、県大会で優勝',
 '沖合の定期フェリー、新造船が就航',
 'ダイビングスクール「透明度は今季最高」',
 '砂浜の清掃ボランティアに300人が参加',
 '天気：南の風、波の高さ1メートル。午後はにわか雨のところも',
 'サーフィン大会の開催地にコーラルコーストが決定',
 '商店街の福引、特賞は豪華クルーズ旅行',
];
export class News{
 private readonly track:HTMLElement;
 private readonly root:HTMLElement;
 private readonly queue:string[]=[];
 private readonly told=new Set<string>();
 private current?:Animation;
 private breaking=false;
 private next=Math.floor(Math.random()*ordinary.length);
 constructor(root:HTMLElement){this.root=root;this.track=root.querySelector('.news-track') as HTMLElement;this.show();}
 // Report something the predator caused. A key is reported only once unless repeat is set.
 report(key:string,text:string,repeat=false){
  if(!repeat&&this.told.has(key))return;
  this.told.add(key);
  // Only the latest few stories are kept: old news is no news.
  this.queue.push(text);if(this.queue.length>4)this.queue.shift();
  // A routine headline gives way at once; a breaking one is allowed to finish.
  if(!this.breaking)this.show();
 }
 private show(){
  this.current?.cancel();
  const urgent=this.queue.shift();
  this.breaking=urgent!==undefined;
  const text=urgent??ordinary[this.next++%ordinary.length];
  this.root.classList.toggle('breaking',this.breaking);
  const line=document.createElement('span');line.textContent=(this.breaking?'【速報】':'')+text;
  this.track.replaceChildren(line);
  const width=this.track.clientWidth||innerWidth,length=line.offsetWidth||text.length*16;
  // Breaking news starts already on screen so it is read at once.
  const from=this.breaking?width*.35:width;
  this.current=line.animate([{transform:'translateX('+from+'px)'},{transform:'translateX('+(-length)+'px)'}],{duration:(from+length)/(this.breaking?150:110)*1000,easing:'linear',fill:'forwards'});
  this.current.onfinish=()=>this.show();
 }
}
