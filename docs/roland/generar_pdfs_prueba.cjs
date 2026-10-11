// Genera los PDF de prueba a tamano real (A 100x50, B 60x40 y NEST_A_B 162x50) con barras CMYK para probar VersaWorks.
// Uso (desde la raiz del repo):  node docs/roland/generar_pdfs_prueba.cjs   -> escribe en docs/roland/muestras/
const {PDFDocument,StandardFonts,cmyk}=require('pdf-lib');const fs=require('fs');
const cm=v=>v*28.3465;
function piece(page,font,x,y,wc,hc,label,col){
  const w=cm(wc),h=cm(hc);
  page.drawRectangle({x,y,width:w,height:h,color:col});
  page.drawRectangle({x,y,width:w,height:h,borderColor:cmyk(0,0,0,1),borderWidth:1.5});
  const bars=[cmyk(1,0,0,0),cmyk(0,1,0,0),cmyk(0,0,1,0),cmyk(0,0,0,1)];
  const bw=w/4,bh=Math.min(h*0.25,cm(8));
  bars.forEach((c,i)=>page.drawRectangle({x:x+i*bw,y:y,width:bw,height:bh,color:c}));
  const fs2=Math.min(w/8,cm(14));
  page.drawText(label,{x:x+cm(2),y:y+h/2,size:fs2,font,color:cmyk(0,0,0,1)});
  page.drawText(wc+' x '+hc+' cm  (medir con regla)',{x:x+cm(2),y:y+h/2-fs2*1.2,size:fs2/2.5,font,color:cmyk(0,0,0,1)});
}
(async()=>{
  const out='docs/roland/muestras/';
  const specs=[['A_100x50',100,50,'PIEZA A',cmyk(0,0.15,0.9,0)],['B_60x40',60,40,'PIEZA B',cmyk(0.6,0,0.4,0)]];
  for(const [n,wc,hc,l,col] of specs){const d=await PDFDocument.create();const f=await d.embedFont(StandardFonts.HelveticaBold);const p=d.addPage([cm(wc),cm(hc)]);piece(p,f,0,0,wc,hc,l,col);fs.writeFileSync(out+n+'.pdf',await d.save());}
  const gap=2,W=100+gap+60,H=50;const d=await PDFDocument.create();const f=await d.embedFont(StandardFonts.HelveticaBold);const p=d.addPage([cm(W),cm(H)]);
  piece(p,f,0,0,100,50,'PIEZA A',cmyk(0,0.15,0.9,0));piece(p,f,cm(100+gap),0,60,40,'PIEZA B',cmyk(0.6,0,0.4,0));
  fs.writeFileSync(out+'NEST_A_B_'+W+'x'+H+'.pdf',await d.save());
})();