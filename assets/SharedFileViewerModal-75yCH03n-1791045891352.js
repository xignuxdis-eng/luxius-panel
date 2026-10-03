const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["./index-E2jpRi4R-1791045891352.js","./vendor-core-CTwxObkL-1791045891352.js","./vendor-icons-DieuFMs_-1791045891352.js","./index-BMLoMg7u.css"])))=>i.map(i=>d[i]);
import{r as j,l as tA,M as aA,_ as oA,A as N,j as J,f as iA,w as cA}from"./index-E2jpRi4R-1791045891352.js";import{r as L,j as t,a as nA,u as sA}from"./vendor-core-CTwxObkL-1791045891352.js";import{e as rA,g as O,a as lA,b as dA}from"./vectorPreview-z8qsSFw_-1791045891352.js";import{l as gA,m as fA,n as wA,o as PA,X as pA,F as hA}from"./vendor-icons-DieuFMs_-1791045891352.js";import{g as W}from"./vendor-pdf-DW2LmH0r-1791045891352.js";import{X as _}from"./logoBase64Light-C-oYOwEg-1791045891352.js";import{g as BA,b as AA}from"./generatePdfClientReport-CjRRO_sm-1791045891352.js";const vA=[{id:"urgente",label:"URGENTE",color:"#ef4444",bgColor:"rgba(239, 68, 68, 0.15)",borderColor:"rgba(239, 68, 68, 0.4)",icon:"🚨"},{id:"reimpresion",label:"REIMPRESIÓN",color:"#f59e0b",bgColor:"rgba(245, 158, 11, 0.15)",borderColor:"rgba(245, 158, 11, 0.4)",icon:"🔄"},{id:"muestra",label:"MUESTRA",color:"#a855f7",bgColor:"rgba(168, 85, 247, 0.15)",borderColor:"rgba(168, 85, 247, 0.4)",icon:"🧪"},{id:"vip",label:"VIP",color:"#ec4899",bgColor:"rgba(236, 72, 153, 0.15)",borderColor:"rgba(236, 72, 153, 0.4)",icon:"⭐"},{id:"espera_pago",label:"ESPERA PAGO",color:"#eab308",bgColor:"rgba(234, 179, 8, 0.15)",borderColor:"rgba(234, 179, 8, 0.4)",icon:"⏳"},{id:"stock",label:"STOCK",color:"#06b6d4",bgColor:"rgba(6, 182, 212, 0.15)",borderColor:"rgba(6, 182, 212, 0.4)",icon:"📦"}];function qA(A){return vA.find(o=>o.id===A||o.label.toLowerCase()===A.toLowerCase())}const RA={relevamiento:"Relevamiento",diseno:"Diseño",preorden:"Diseño (Legacy)",orden:"Para Imprimir",impreso:"Impreso",post:"Terminaciones",completo:"Para Entregar",entregado:"Entregado",finalizado:"Archivado",standby:"Stand By",anulado:"Anulado",rebotado:"Rechazado",eliminado:"Papelera"},YA={relevamiento:"#0ea5e9",diseno:"#e879a8",preorden:"#c084fc",orden:"#f97316",impreso:"#4ade80",post:"#a855f7",completo:"#22c55e",entregado:"#64748b",finalizado:"#94a3b8",standby:"#fca5a5",anulado:"#ef4444",rebotado:"#be123c",eliminado:"#475569"},xA=({isOpen:A,onClose:o,imgSrc:e,fileName:i="Archivo",format:r="",dimensions:g,dpi:l,colorMode:p,fileSize:Q,downloadUrl:y})=>{var u;const[E,s]=L.useState(1),[c,H]=L.useState({x:0,y:0}),[U,F]=L.useState(!1),[a,B]=L.useState({x:0,y:0}),d=L.useRef(null);if(L.useEffect(()=>{A&&(s(1),H({x:0,y:0}))},[A,e]),L.useEffect(()=>{const P=K=>{K.key==="Escape"&&A&&o()};return window.addEventListener("keydown",P),()=>window.removeEventListener("keydown",P)},[A,o]),!A)return null;const x=()=>s(P=>Math.min(P+.25,4)),n=()=>s(P=>Math.max(P-.25,.5)),v=()=>{s(1),H({x:0,y:0})},w=P=>{E>1&&(F(!0),B({x:P.clientX-c.x,y:P.clientY-c.y}))},D=P=>{U&&E>1&&H({x:P.clientX-a.x,y:P.clientY-a.y})},f=()=>F(!1),h=P=>{P.preventDefault(),P.deltaY<0?x():n()},b=r||((u=i.split(".").pop())==null?void 0:u.toUpperCase())||"FILE",C=t.jsx("div",{className:"preview-modal-overlay",onClick:o,children:t.jsxs("div",{className:"preview-modal-container",onClick:P=>P.stopPropagation(),children:[t.jsxs("div",{className:"preview-modal-header",children:[t.jsxs("div",{className:"preview-modal-title",children:[t.jsx("span",{className:"preview-file-icon",children:"👁️"}),t.jsx("span",{className:"preview-file-name",title:i,children:i}),t.jsx("span",{className:"preview-format-badge",children:b})]}),t.jsxs("div",{className:"preview-modal-toolbar",children:[t.jsx("button",{type:"button",onClick:n,title:"Alejar (-)",className:"tool-btn",children:t.jsx(gA,{size:16})}),t.jsxs("span",{className:"zoom-indicator",children:[Math.round(E*100),"%"]}),t.jsx("button",{type:"button",onClick:x,title:"Acercar (+)",className:"tool-btn",children:t.jsx(fA,{size:16})}),t.jsx("button",{type:"button",onClick:v,title:"Restablecer",className:"tool-btn",children:t.jsx(wA,{size:16})}),y&&t.jsx("a",{href:y,download:i,target:"_blank",rel:"noreferrer",className:"tool-btn",title:"Descargar original",children:t.jsx(PA,{size:16})}),t.jsx("button",{type:"button",onClick:o,title:"Cerrar (Esc)",className:"tool-btn close-btn",children:t.jsx(pA,{size:18})})]})]}),t.jsx("div",{className:"preview-viewport",ref:d,onMouseDown:w,onMouseMove:D,onMouseUp:f,onMouseLeave:f,onWheel:h,style:{cursor:E>1?U?"grabbing":"grab":"default"},children:e?t.jsx("div",{className:"preview-image-wrapper",style:{transform:`translate(${c.x}px, ${c.y}px) scale(${E})`,transition:U?"none":"transform 0.15s ease-out"},children:t.jsx("img",{src:e,alt:i,className:"preview-image-element",draggable:!1})}):t.jsxs("div",{className:"preview-no-image",children:[t.jsx(hA,{size:64,style:{color:"var(--text-muted)",marginBottom:"12px"}}),t.jsx("p",{children:"No hay previsualización gráfica disponible para este archivo."}),t.jsx("span",{className:"preview-hint",children:"El archivo original permanece intacto para producción e impresión."})]})}),t.jsxs("div",{className:"preview-modal-footer",children:[t.jsxs("div",{className:"preview-tech-details",children:[g&&g.width>0&&t.jsxs("div",{className:"tech-chip",children:[t.jsx("strong",{children:"Medidas:"})," ",g.width," × ",g.height," cm"]}),l&&l>0&&t.jsxs("div",{className:"tech-chip",children:[t.jsx("strong",{children:"Resolución:"})," ",l," DPI"]}),p&&t.jsxs("div",{className:"tech-chip",children:[t.jsx("strong",{children:"Modo Color:"})," ",p]}),Q&&t.jsxs("div",{className:"tech-chip",children:[t.jsx("strong",{children:"Tamaño:"})," ",Q]})]}),t.jsxs("div",{className:"preview-tip",children:["💡 ",t.jsx("em",{children:"Arrastrá para mover y usá la rueda del mouse para hacer zoom"})]})]})]})});return nA.createPortal(C,document.body)},R=A=>{if(!A)return"";const o=A.split(".");return o.length>1?o[o.length-1].toLowerCase():""},mA=A=>{switch(A){case"cdr":return"🎨";case"ai":return"🎨";case"eps":return"📄";case"pdf":return"📄";case"svg":return"🖼️";case"tif":case"tiff":return"🖼️";case"zip":case"rar":return"📦";default:return"📄"}},QA=({fileUrl:A,fileName:o,file:e,className:i,style:r,alt:g="",dimensions:l,dpi:p,colorMode:Q,fileSize:y,enableModal:E=!0})=>{const[s,c]=L.useState(null),[H,U]=L.useState(!1),[F,a]=L.useState(!1),[B,d]=L.useState(!1),x=R(o||(e==null?void 0:e.name)||A||""),n=o||(e==null?void 0:e.name)||"Archivo";L.useEffect(()=>{U(!1);let w=null;if(A&&(A.startsWith("data:image/")||A.startsWith("blob:"))){c(A);return}if(e){const D=R(e.name);if(["jpg","jpeg","png","webp","gif","bmp","svg"].includes(D))w=URL.createObjectURL(e),c(w);else if(D==="cdr")rA(e).then(f=>{c(f||O("CDR",e.name,l,p))}).catch(()=>{c(O("CDR",e.name,l,p))});else if(D==="tif"||D==="tiff")lA(e).then(f=>{f?c(f):A&&A.startsWith("data:image/")?c(A):c(null)}).catch(()=>c(null));else if(D==="eps")dA(e).then(f=>{f?c(f):A&&A.startsWith("data:image/")?c(A):c(O("EPS",e.name,l,p))}).catch(()=>{c(O("EPS",e.name,l,p))});else if(D==="ai"||D==="pdf"){if(e.size>25*1024*1024){c(O(D.toUpperCase(),e.name,l,p));return}(async()=>{try{const f=await e.arrayBuffer(),h=W({data:f}).promise,b=await Promise.race([h,new Promise((C,u)=>setTimeout(()=>u(new Error("Timeout PDF preview")),4e3))]);if(b&&b.numPages>0){const C=await b.getPage(1),u=C.getViewport({scale:1}),K=Math.min(1.5,400/Math.max(u.width,u.height)),k=C.getViewport({scale:K}),z=document.createElement("canvas");z.width=k.width,z.height=k.height;const m=z.getContext("2d");if(m){m.fillStyle="#ffffff",m.fillRect(0,0,k.width,k.height),await C.render({canvasContext:m,viewport:k}).promise,c(z.toDataURL("image/webp",.85));return}}}catch{}c(O(D.toUpperCase(),e.name,l,p))})()}else c(null)}else if(A){const D=j(A),f=R(o||A);if(["jpg","jpeg","png","webp","gif","bmp","svg"].includes(f))c(D);else if(f==="pdf"||f==="ai"){let h=!0;return(async()=>{try{const b=await fetch(D);if(!b.ok)throw new Error(`Fetch failed HTTP ${b.status}`);const C=await b.arrayBuffer(),u=await W({data:C}).promise;if(u.numPages>0){const P=await u.getPage(1),K=P.getViewport({scale:1}),z=Math.max(1.5,Math.min(3,1200/Math.max(K.width,K.height))),m=P.getViewport({scale:z}),I=document.createElement("canvas");I.width=m.width,I.height=m.height;const G=I.getContext("2d");if(G&&(G.fillStyle="#ffffff",G.fillRect(0,0,m.width,m.height),await P.render({canvasContext:G,viewport:m}).promise,h)){c(I.toDataURL("image/webp",.92));return}}}catch(b){console.warn("[PDF Preview] Remote PDF fetch/render with PDF.js failed, using card fallback:",b)}h&&c(O(f.toUpperCase(),n,l,p))})(),()=>{h=!1}}else c(O(f.toUpperCase(),n,l,p))}else c(null);return()=>{w&&URL.revokeObjectURL(w)}},[A,e,l==null?void 0:l.width,l==null?void 0:l.height,p]);const v=w=>{E&&(w.stopPropagation(),a(!0))};return t.jsxs(t.Fragment,{children:[t.jsx("div",{className:`universal-preview-wrapper ${i||""}`,style:{position:"relative",width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",cursor:E&&s?"pointer":"default",overflow:"hidden",...r},onMouseEnter:()=>d(!0),onMouseLeave:()=>d(!1),onClick:v,title:E&&s?`Clic para ampliar ${n}`:n,children:!s||H?t.jsx("div",{className:"universal-preview-fallback",style:{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(255, 255, 255, 0.03)",border:"1px solid rgba(255, 255, 255, 0.08)",borderRadius:"4px",fontSize:"22px",userSelect:"none"},children:mA(x)}):t.jsxs(t.Fragment,{children:[t.jsx("img",{src:s,alt:g||n,style:{width:"100%",height:"100%",objectFit:"contain"},onError:()=>U(!0)}),E&&B&&t.jsx("div",{onClick:v,style:{position:"absolute",inset:0,background:"rgba(15, 23, 42, 0.65)",backdropFilter:"blur(2px)",display:"flex",alignItems:"center",justifyContent:"center",color:"#ffffff",transition:"all 0.15s ease",cursor:"pointer",zIndex:3},children:t.jsxs("svg",{width:"24",height:"24",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2.5",strokeLinecap:"round",strokeLinejoin:"round",style:{filter:"drop-shadow(0 2px 4px rgba(0,0,0,0.5))"},children:[t.jsx("circle",{cx:"11",cy:"11",r:"8"}),t.jsx("line",{x1:"21",y1:"21",x2:"16.65",y2:"16.65"}),t.jsx("line",{x1:"11",y1:"8",x2:"11",y2:"14"}),t.jsx("line",{x1:"8",y1:"11",x2:"14",y2:"11"})]})})]})}),E&&F&&t.jsx(xA,{isOpen:F,onClose:()=>a(!1),imgSrc:s,fileName:n,format:x.toUpperCase(),dimensions:l,dpi:p,colorMode:Q,fileSize:y,downloadUrl:A||void 0})]})},DA=`
    @page {
        size: A4 portrait;
        margin: 0;
    }

    * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }

    html, body {
        margin: 0;
        padding: 0;
        background: #334155;
        color: #1e2433;
        font-size: 13px;
        line-height: 1.4;
    }

    .no-print-bar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: #1e2433;
        color: #ffffff;
        padding: 12px 24px;
        width: 100%;
        max-width: 210mm;
        margin: 20px auto 10px auto;
        border-radius: 8px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.3);
    }
    .btn-print {
        background: #2563eb;
        color: #ffffff;
        border: none;
        padding: 9px 22px;
        font-size: 13px;
        font-weight: 700;
        border-radius: 6px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 8px;
        box-shadow: 0 2px 8px rgba(37,99,235,0.4);
    }
    .btn-print:hover { background: #1d4ed8; }

    .a4-page {
        width: 210mm;
        min-height: 297mm;
        padding: 14mm 18mm 12mm 18mm;
        margin: 0 auto 30px auto;
        background: #ffffff;
        position: relative;
        box-shadow: 0 8px 25px rgba(0,0,0,0.25);
        display: flex;
        flex-direction: column;
        justify-content: space-between;
    }

    .header-brand {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
        padding-bottom: 12px;
        border-bottom: 2px solid #1e2433;
    }
    .brand-left {
        display: flex;
        align-items: center;
        gap: 14px;
    }
    .brand-logo-img {
        height: 52px;
        width: auto;
        display: block;
    }
    .brand-name {
        font-size: 20px;
        font-weight: 900;
        color: #1e2433;
        letter-spacing: -0.5px;
    }
    .brand-sub {
        font-size: 11.5px;
        color: #64748b;
        font-weight: 500;
    }
    .brand-right {
        text-align: right;
    }
    .badge-doc-type {
        display: inline-block;
        color: #ffffff;
        font-size: 11px;
        font-weight: 800;
        letter-spacing: 0.8px;
        padding: 4px 10px;
        border-radius: 4px;
        text-transform: uppercase;
        margin-bottom: 4px;
    }
    .ot-label {
        font-size: 15px;
        font-weight: 800;
        color: #1e2433;
    }

    .meta-section {
        display: grid;
        grid-template-columns: 1.4fr 1fr;
        gap: 16px;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 12px 16px;
        margin-bottom: 18px;
    }
    .section-label {
        font-size: 10px;
        font-weight: 800;
        color: #64748b;
        text-transform: uppercase;
        letter-spacing: 0.8px;
        margin-bottom: 4px;
    }
    .meta-text {
        font-size: 12.5px;
        color: #1e2433;
        margin-top: 2px;
    }

    .artwork-and-items {
        display: grid;
        gap: 16px;
        margin-bottom: 18px;
    }

    .artwork-card {
        background: #f8fafc;
        border: 1px solid #cbd5e1;
        border-radius: 6px;
        padding: 8px;
        text-align: center;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
    }
    .artwork-img {
        max-width: 100%;
        max-height: 120px;
        object-fit: contain;
        border-radius: 4px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        margin-bottom: 6px;
    }
    .artwork-caption {
        font-size: 9.5px;
        font-weight: 700;
        color: #64748b;
        word-break: break-all;
    }

    .items-table {
        width: 100%;
        border-collapse: collapse;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        overflow: hidden;
    }
    .items-table th {
        background: #1e2433;
        color: #ffffff;
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.6px;
        padding: 8px 12px;
    }
    .items-table td {
        padding: 10px 12px;
        border-bottom: 1px solid #e2e8f0;
        font-size: 12.5px;
        color: #1e2433;
    }
    .items-table tr:nth-child(even) td {
        background: #f8fafc;
    }

    .tech-specs {
        margin: 14px 0;
        padding: 10px 14px;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
    }
    .tech-specs-title {
        font-size: 10px;
        font-weight: 800;
        color: #64748b;
        text-transform: uppercase;
        letter-spacing: 0.6px;
        margin-bottom: 6px;
    }
    .tech-specs-grid {
        display: flex;
        gap: 18px;
        flex-wrap: wrap;
    }
    .tech-spec-item {
        display: flex;
        flex-direction: column;
    }
    .tech-spec-label {
        font-size: 9.5px;
        font-weight: 700;
        color: #94a3b8;
        text-transform: uppercase;
    }
    .tech-spec-value {
        font-size: 12.5px;
        font-weight: 700;
        color: #1e2433;
    }

    .bottom-blocks {
        display: grid;
        grid-template-columns: 1.2fr 1fr;
        gap: 16px;
        margin-top: 14px;
    }

    .commercial-notice {
        border-radius: 6px;
        padding: 12px;
        font-size: 11.5px;
        line-height: 1.45;
    }
    .commercial-title {
        font-weight: 800;
        margin-bottom: 4px;
        font-size: 12px;
        display: flex;
        align-items: center;
        gap: 6px;
    }

    .totals-table {
        width: 100%;
        border-collapse: collapse;
        border: 1px solid #cbd5e1;
        border-radius: 6px;
        overflow: hidden;
    }
    .totals-table td {
        padding: 8px 14px;
        font-size: 12.5px;
    }
    .row-subtotal td {
        background: #f8fafc;
        color: #334155;
    }
    .row-total-general td {
        background: #1e2433;
        color: #ffffff;
        font-weight: 800;
        font-size: 14px;
    }

    .bank-box {
        margin-top: 12px;
        padding: 10px 14px;
        background: #f1f5f9;
        border: 1px dashed #cbd5e1;
        border-radius: 6px;
        font-size: 11px;
        color: #334155;
    }

    .fine-print {
        text-align: center;
        font-size: 10px;
        color: #94a3b8;
        margin-top: auto;
        padding-top: 10px;
        border-top: 1px solid #e2e8f0;
    }

    @media print {
        .no-print-bar { display: none !important; }
        html, body { background: #ffffff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        * {
            box-shadow: none !important;
            text-shadow: none !important;
            filter: none !important;
            -webkit-filter: none !important;
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
        }
        .a4-page {
            width: 210mm !important;
            max-width: 210mm !important;
            min-width: 210mm !important;
            height: auto !important;
            min-height: auto !important;
            margin: 0 auto !important;
            padding: 12mm 15mm 10mm 15mm !important;
            box-shadow: none !important;
            overflow: visible !important;
            background: #ffffff !important;
        }
        img {
            max-width: 300px !important;
            max-height: 300px !important;
        }
        .artwork-and-items { break-inside: avoid; page-break-inside: avoid; }
        .tech-specs { break-inside: avoid; page-break-inside: avoid; }
        .bottom-blocks { break-inside: avoid; page-break-inside: avoid; }
        .fine-print { break-inside: avoid; page-break-inside: avoid; }
        .items-table tr { break-inside: avoid; page-break-inside: avoid; }
    }
`,bA=`
    <!DOCTYPE html>
    <html>
    <head>
        <title>Optimizando PDF...</title>
        <style>
            body { margin:0; height:100vh; display:flex; flex-direction:column; align-items:center; justify-content:center; background:#1e2433; color:#f8fafc; font-family:sans-serif; }
            .spinner { width:38px; height:38px; border:4px solid #334155; border-top-color:#38bdf8; border-radius:50%; animation:spin 0.8s linear infinite; }
            @keyframes spin { to { transform: rotate(360deg); } }
        </style>
    </head>
    <body>
        <div class="spinner"></div>
        <p style="margin-top:14px; font-weight:600; font-size:13.5px; letter-spacing:0.3px;">Optimizando resolución de imagen y preparando documento...</p>
    </body>
    </html>
`,CA=`
    (function() {
        function waitForImagesAndPrint() {
            var images = Array.from(document.images);
            var promises = images.map(function(img) {
                if (img.complete && img.naturalWidth > 0) {
                    return img.decode ? img.decode().catch(function() {}) : Promise.resolve();
                }
                return new Promise(function(resolve) {
                    img.onload = function() {
                        if (img.decode) img.decode().catch(function() {}).then(resolve);
                        else resolve();
                    };
                    img.onerror = function() { resolve(); };
                });
            });
            var timeoutPromise = new Promise(function(resolve) { setTimeout(resolve, 3500); });
            Promise.race([Promise.all(promises), timeoutPromise]).then(function() {
                setTimeout(function() { window.print(); }, 250);
            });
        }
        if (document.readyState === 'complete') waitForImagesAndPrint();
        else window.addEventListener('load', waitForImagesAndPrint);
    })();
`;function EA(A){var i;const o=[],e=A.imgMetadata;return A.archivos&&A.archivos.length>0?A.archivos.forEach((r,g)=>{var p;const l=((p=A.archivosOriginales)==null?void 0:p[g])||r.split("/").pop()||`Archivo ${g+1}`;o.push({url:j(r),name:l})}):e!=null&&e.thumbnailUrl&&o.push({url:j(e.thumbnailUrl),name:((i=A.archivosOriginales)==null?void 0:i[0])||"Archivo cargado"}),o}function M(A){return`$${A.toLocaleString("es-AR",{minimumFractionDigits:2,maximumFractionDigits:2})}`}function eA(A){return A?String(A).replace(/[^a-zA-Z0-9]/g,"").slice(0,8):"00000"}function uA(A,o,e){var P,K,k,z;const i=o==="simplificado",r=["impreso","post","completo","entregado","finalizado"].includes(A.status),g=r?"ORDEN DE TRABAJO IMPRESA":"COTIZACIÓN",l=r?"#15803d":"#2563eb",p=(A.operarioNombre||A.vendedorNombre||((P=A.vendedor)==null?void 0:P.nombre)||A.vendedorName||"ADRIAN").toUpperCase(),Q=A.vendedorRol||((K=A.vendedor)==null?void 0:K.rol)||"Administración",y=A.clienteNombre||A.clientName||"Cliente General",E=A.clienteDireccion||A.direccion||"Jose V. Cardozo 912, Córdoba",s=A.imgMetadata,c=(s==null?void 0:s.dpi)||0,H=(s==null?void 0:s.colorMode)||"",U=(s==null?void 0:s.format)||"",F=s!=null&&s.width&&(s!=null&&s.height)?`${s.width} × ${s.height} cm`:"",a=A.ancho&&A.alto?`${Number(A.ancho).toFixed(2)} × ${Number(A.alto).toFixed(2)} m`:"",B=c>0||H||U,x=(m=>m<=0?{label:"Sin datos",color:"#94a3b8"}:m>=300?{label:"Alta Calidad",color:"#16a34a"}:m>=150?{label:"Estándar",color:"#2563eb"}:m>=72?{label:"Media",color:"#d97706"}:{label:"Baja Resolución",color:"#dc2626"})(c),n=A.ot||`OT-${eA(A.id)}`,v=A.createdAt?new Date(A.createdAt).toLocaleDateString("es-AR"):new Date().toLocaleDateString("es-AR"),w=Number(A.total||A.subtotal||0),D=Number(A.subtotal||A.total||0),f=w*.5,h=A.carteles||[{descripcion:A.nombreTarea&&!A.nombreTarea.startsWith("Proyecto")?A.nombreTarea:`Cartel ${A.material||"Lona Front"} ${A.ancho||0}x${A.alto||0}m`,cant:A.copias||1,unit:w/(A.copias||1),subtotal:w}],b=((k=e[0])==null?void 0:k.url)||"",C=i?`
            <table class="items-table">
                <thead>
                    <tr>
                        <th style="text-align: left;">DESCRIPCIÓN DEL TRABAJO</th>
                        <th style="width: 14%; text-align: center;">CANT</th>
                    </tr>
                </thead>
                <tbody>
                    ${h.map(m=>`
                        <tr>
                            <td style="vertical-align: top;">
                                <strong>${m.descripcion||`Cartel ${A.material||"Lona Front"} ${A.ancho||0}x${A.alto||0}m`}</strong>
                                <div style="font-size: 11px; color: #64748b; margin-top: 2px;">
                                    Material: ${A.material||"Lona"} · Medida: ${A.ancho||0}x${A.alto||0}m
                                    ${A.bobinaAsignada?` · Bobina: <strong>${A.bobinaAsignada}m</strong>`:""}
                                    ${A.consumoEstimado?` · Consumo: <strong>${Number(A.consumoEstimado).toFixed(2)} ml</strong>`:""}
                                </div>
                            </td>
                            <td style="text-align: center; font-weight: 700;">${m.cant||A.copias||1}</td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>
        `:`
            <table class="items-table">
                <thead>
                    <tr>
                        <th style="text-align: left;">DESCRIPCIÓN DEL TRABAJO</th>
                        <th style="width: 12%; text-align: center;">CANT</th>
                        <th style="width: 20%; text-align: right;">P. UNIT</th>
                        <th style="width: 22%; text-align: right;">SUBTOTAL</th>
                    </tr>
                </thead>
                <tbody>
                    ${h.map(m=>`
                        <tr>
                            <td style="vertical-align: top;">
                                <strong>${m.descripcion||`Cartel ${A.material||"Lona Front"} ${A.ancho||0}x${A.alto||0}m`}</strong>
                                <div style="font-size: 11px; color: #64748b; margin-top: 2px;">
                                    Material: ${A.material||"Lona"} · Medida: ${A.ancho||0}x${A.alto||0}m
                                    ${A.bobinaAsignada?` · Bobina: <strong>${A.bobinaAsignada}m</strong>`:""}
                                    ${A.consumoEstimado?` · Consumo: <strong>${Number(A.consumoEstimado).toFixed(2)} ml</strong>`:""}
                                </div>
                            </td>
                            <td style="text-align: center; font-weight: 700;">${m.cant||A.copias||1}</td>
                            <td style="text-align: right;">${M(m.unit||w/(A.copias||1))}</td>
                            <td style="text-align: right; font-weight: 700;">${M(m.subtotal||w)}</td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>
        `,u=i?`
            <div class="bottom-blocks" style="grid-template-columns: 1fr;">
                <div>
                    <div class="commercial-notice" style="background: #f8fafc; border: 1px solid #e2e8f0; color: #475569;">
                        <div class="commercial-title">📋 Documento Simplificado</div>
                        Detalle de materiales y medidas sin valores monetarios. Emitido por XignuX Servicios Gráficos.
                    </div>
                </div>
            </div>
        `:`
            <div class="bottom-blocks">
                <div>
                    ${r?`
                        <div class="commercial-notice" style="background: #f0fdf4; border: 1px solid #bbf7d0; color: #166534;">
                            <div class="commercial-title">✔ Orden de Impresión Finalizada</div>
                            Trabajo procesado y controlado según especificaciones técnicas de taller. Válido como comprobante y detalle de entrega.
                        </div>
                    `:`
                        <div class="commercial-notice" style="background: #eff6ff; border: 1px solid #bfdbfe; color: #1e40af;">
                            <div class="commercial-title">💡 Condición Comercial</div>
                            Se sugiere una <strong>seña del 50% (${M(f)})</strong> para confirmar la orden e iniciar la impresión en taller.
                        </div>
                        <div class="bank-box">
                            <strong>Datos para Transferencia:</strong><br>
                            CBU / Alias: <code>a.flores.24</code><br>
                            Titular: Adrian Flores
                        </div>
                    `}
                </div>

                <div>
                    <table class="totals-table">
                        <tr class="row-subtotal">
                            <td style="text-align: left;">Subtotal:</td>
                            <td style="text-align: right; font-weight: 600;">${M(D)}</td>
                        </tr>
                        <tr class="row-total-general">
                            <td style="text-align: left;">TOTAL:</td>
                            <td style="text-align: right; font-weight: 800;">${M(w)}</td>
                        </tr>
                    </table>
                </div>
            </div>
        `;return`
        <div class="a4-page">
            <div>
                <div class="header-brand">
                    <div class="brand-left">
                        <img src="${_}" class="brand-logo-img" alt="XignuX Logo" />
                        <div>
                            <div class="brand-name" style="font-size: 15px; font-weight: 800; color: #1e2433;">Servicios Gráficos e Impresión Digital Profesional</div>
                            <div class="brand-sub">José V. Cardozo 912, Córdoba · Tel: 3517897667/3517717071</div>
                        </div>
                    </div>
                    <div class="brand-right">
                        <div class="badge-doc-type" style="background: ${l};">${g}</div>
                        <div class="ot-label">${n}</div>
                        <div style="font-size: 11px; color: #64748b;">Fecha: ${v}</div>
                    </div>
                </div>

                <div class="meta-section">
                    <div>
                        <div class="section-label">DATOS DEL CLIENTE</div>
                        <div class="meta-text"><strong>Razón Social:</strong> ${y}</div>
                        <div class="meta-text"><strong>Dirección / Obra:</strong> ${E}</div>
                        ${A.envio?`<div class="meta-text"><strong>Logística / Envío:</strong> ${A.envio}</div>`:""}
                    </div>
                    <div style="text-align: right;">
                        <div class="section-label">RESPONSABLE DE ATENCIÓN</div>
                        <div class="meta-text"><strong>${p}</strong></div>
                        <div style="font-size: 11px; color: #64748b;">${Q}</div>
                    </div>
                </div>

                <div class="artwork-and-items" style="grid-template-columns: ${b?"150px 1fr":"1fr"};">
                    ${b?`
                        <div class="artwork-card">
                            <div class="section-label" style="font-size: 8.5px; margin-bottom: 4px;">ARTE A IMPRIMIR</div>
                            <img src="${b}" class="artwork-img" alt="Arte Gráfico" />
                            <div class="artwork-caption">${((z=A.archivosOriginales)==null?void 0:z[0])||"Archivo cargado"}</div>
                        </div>
                    `:""}
                    ${C}
                </div>

                ${e.length>1?`
                <div style="margin: 12px 0 16px 0; padding: 10px 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; break-inside: avoid; page-break-inside: avoid;">
                    <div class="tech-specs-title" style="margin-bottom: 8px;">🎨 Archivos Adjuntos a la Orden (${e.length} piezas)</div>
                    <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                        ${e.map((m,I)=>`
                            <div style="flex: 1 1 110px; max-width: 140px; padding: 6px; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; text-align: center;">
                                <img src="${m.url}" alt="${m.name}" style="max-width: 100%; max-height: 80px; object-fit: contain; border-radius: 4px; margin-bottom: 4px;" />
                                <div style="font-size: 9.5px; font-weight: 700; color: #1e2433; word-break: break-all; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${m.name}</div>
                                <div style="font-size: 8.5px; color: #64748b;">Pieza #${I+1}</div>
                            </div>
                        `).join("")}
                    </div>
                </div>
                `:""}

                ${B||A.bobinaAsignada||A.consumoEstimado?`
                <div class="tech-specs">
                    <div class="tech-specs-title">📐 Especificaciones Técnicas de Impresión</div>
                    <div class="tech-specs-grid">
                        ${c>0?`
                        <div class="tech-spec-item">
                            <span class="tech-spec-label">Resolución</span>
                            <span class="tech-spec-value">${c} DPI (${x.label})</span>
                        </div>`:""}
                        ${H?`
                        <div class="tech-spec-item">
                            <span class="tech-spec-label">Modo Color</span>
                            <span class="tech-spec-value">${H}</span>
                        </div>`:""}
                        ${U?`
                        <div class="tech-spec-item">
                            <span class="tech-spec-label">Formato</span>
                            <span class="tech-spec-value">${U.toUpperCase()}</span>
                        </div>`:""}
                        ${a?`
                        <div class="tech-spec-item">
                            <span class="tech-spec-label">Medida Final</span>
                            <span class="tech-spec-value">${a}</span>
                        </div>`:""}
                        ${F?`
                        <div class="tech-spec-item">
                            <span class="tech-spec-label">Dimensión Archivo</span>
                            <span class="tech-spec-value">${F}</span>
                        </div>`:""}
                        ${A.bobinaAsignada?`
                        <div class="tech-spec-item">
                            <span class="tech-spec-label">Bobina Asignada</span>
                            <span class="tech-spec-value" style="color: #2563eb;">Rollo ${A.bobinaAsignada}m</span>
                        </div>`:""}
                        ${A.consumoEstimado?`
                        <div class="tech-spec-item">
                            <span class="tech-spec-label">Consumo Lineal</span>
                            <span class="tech-spec-value" style="color: #0284c7;">${Number(A.consumoEstimado).toFixed(2)} ml</span>
                        </div>`:""}
                        <div class="tech-spec-item">
                            <span class="tech-spec-label">Copias</span>
                            <span class="tech-spec-value">${A.copias||1} un</span>
                        </div>
                    </div>
                </div>
                `:""}

                ${u}
            </div>

            <div class="fine-print">
                XignuX Servicios Gráficos e Impresión Digital Profesional · José V. Cardozo 912, Córdoba · Tel: 3517897667/3517717071 · ${i?"Documento simplificado sin valores monetarios.":"Presupuesto sujeto a confirmación técnica de archivos."}
            </div>
        </div>
    `}async function UA(A,o,e,i){const r=window.open("","_blank");if(!r){alert("Por favor permite las ventanas emergentes (popups) para abrir el PDF.");return}r.document.write(bA);const g=A.map(EA),l=Array.from(new Set(g.flat().map(s=>s.url))),p=await AA(l,{maxWidth:400,maxHeight:400,quality:.75,timeoutMs:8e3}),Q=new Map(l.map((s,c)=>[s,p[c]||s])),y=A.map((s,c)=>{const H=g[c].map(U=>({url:Q.get(U.url)||U.url,name:U.name}));return uA(s,o,H)}),E=`
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="utf-8">
            <title>${i}</title>
            <style>${DA}</style>
        </head>
        <body>
            <div class="no-print-bar">
                <span><strong>${e}</strong> — XignuX Gráfica</span>
                <button onclick="window.print()" class="btn-print">🖨️ Imprimir / Guardar como PDF</button>
            </div>
            ${y.join("")}
            <script>${CA}<\/script>
        </body>
        </html>
    `;r.document.open(),r.document.write(E),r.document.close(),r.focus()}async function FA(A,o={}){const e=o.mode||"detallado",i=A.ot||`OT-${eA(A.id)}`,r=["impreso","post","completo","entregado","finalizado"].includes(A.status)?"DETALLE DE IMPRESIÓN":"PRESUPUESTO COMERCIAL",g=`${r.replace(/\s+/g,"_")}_XignuX_${i}.pdf`;await UA([A],e,`${r} (${i})`,g)}async function XA(A,o={}){const e=o.mode||"detallado";await BA(A,{clienteNombre:`Consolidado de ${A.length} Órdenes`,tituloReporte:"CONSOLIDADO DE ÓRDENES DE TRABAJO",mode:e})}const Y="T1RUTwANAIAAAwBQQ0ZGIBJPIGQAAAlUAAAjk0ZGVE2IHFmKAABmUAAAABxHREVGACcAZwAALOgAAAAeR1BPUyNXlR8AAC4gAAA4LkdTVUKHXJIrAAAtCAAAARZPUy8yXrxbqQAAAUAAAABgY21hcLUchzAAAAfoAAABSmhlYWQVbvG4AAAA3AAAADZoaGVhDxQGcwAAARQAAAAkaG10eIurHAMAAGZsAAABfm1heHAAYVAAAAABOAAAAAZuYW1lIpbAMgAAAaAAAAZGcG9zdP9pAGYAAAk0AAAAIAABAAAAAQHKc0qCbF8PPPUACwgAAAAAANSilJkAAAAA2moSYv9C/ewIAAYKAAEACAACAAAAAAAAAAEAAAXs/ewB5Ago/0IAAAgAAAEAAAAAAAAAAAAAAAAAAABeAABQAABhAAAABAQ1ArwABQAEBZoFMwAAAR8FmgUzAAAD0QBmAgAAAAAAAAAAAAAAAACgAAL/QADh+wAAAAQAAAAAQVJURQAgACAAfgXs/ewB5AfQAhQgAAGfAAAAAAQGBZoAIAAgAAMAAAAdAWIAAQAAAAAAAAAzAAAAAQAAAAAAAQAXADMAAQAAAAAAAgAEAEoAAQAAAAAAAwBBAE4AAQAAAAAABAAcAI8AAQAAAAAABQANAKsAAQAAAAAABgAeALgAAQAAAAAABwAsANYAAQAAAAAACAAHAQIAAQAAAAAACQAOAQkAAQAAAAAACgAzARcAAQAAAAAACwAaAUoAAQAAAAAADAAaAWQAAwABBAkAAABmAX4AAwABBAkAAQAuAeQAAwABBAkAAgAIAhIAAwABBAkAAwCCAhoAAwABBAkABAA4ApwAAwABBAkABQAaAtQAAwABBAkABgA8Au4AAwABBAkABwBYAyoAAwABBAkACAAOA4IAAwABBAkACQAcA5AAAwABBAkACgBmA6wAAwABBAkACwA0BBIAAwABBAkADAA0BEYAAwABBAkAEAA8BHoAAwABBAkAEQAIBLYAAwABBAkD5wAmBL5Db3B5cmlnaHQgKGMpIDIwMTcgYnkgQXJ0ZWdyYS4gQWxsIHJpZ2h0cyByZXNlcnZlZC5GU1AgREVNTyAtIEFydGVncmEgU2Fuc0JvbGRGT05UU1BSSU5HIERFTU86VmVyc2lvbiAxLjAwNztBUlRFO0FydGVncmFTYW5zLUJvbGQ7MjAxNztGTFZJLTcwMUZTUCBERU1PIC0gQXJ0ZWdyYSBTYW5zIEJvbGRWZXJzaW9uIDEuMDA3Rk9OVFNQUklOR0RFTU8tQXJ0ZWdyYVNhbnNCb2xkQXJ0ZWdyYSBTYW5zIEJvbGQgaXMgYSB0cmFkZW1hcmsgb2YgQXJ0ZWdyYS5BcnRlZ3JhQ2V5aHVuIEJpcmluY2lDb3B5cmlnaHQgKGMpIDIwMTcgYnkgQXJ0ZWdyYS4gQWxsIHJpZ2h0cyByZXNlcnZlZC5odHRwOi8vd3d3LmFydGVncmF0eXBlLmNvbWh0dHA6Ly93d3cuYXJ0ZWdyYXR5cGUuY29tAEMAbwBwAHkAcgBpAGcAaAB0ACAAKABjACkAIAAyADAAMQA3ACAAYgB5ACAAQQByAHQAZQBnAHIAYQAuACAAQQBsAGwAIAByAGkAZwBoAHQAcwAgAHIAZQBzAGUAcgB2AGUAZAAuAEYAUwBQACAARABFAE0ATwAgAC0AIABBAHIAdABlAGcAcgBhACAAUwBhAG4AcwBCAG8AbABkAEYATwBOAFQAUwBQAFIASQBOAEcAIABEAEUATQBPADoAVgBlAHIAcwBpAG8AbgAgADEALgAwADAANwA7AEEAUgBUAEUAOwBBAHIAdABlAGcAcgBhAFMAYQBuAHMALQBCAG8AbABkADsAMgAwADEANwA7AEYATABWAEkALQA3ADAAMQBGAFMAUAAgAEQARQBNAE8AIAAtACAAQQByAHQAZQBnAHIAYQAgAFMAYQBuAHMAIABCAG8AbABkAFYAZQByAHMAaQBvAG4AIAAxAC4AMAAwADcARgBPAE4AVABTAFAAUgBJAE4ARwBEAEUATQBPAC0AQQByAHQAZQBnAHIAYQBTAGEAbgBzAEIAbwBsAGQAQQByAHQAZQBnAHIAYQAgAFMAYQBuAHMAIABCAG8AbABkACAAaQBzACAAYQAgAHQAcgBhAGQAZQBtAGEAcgBrACAAbwBmACAAQQByAHQAZQBnAHIAYQAuAEEAcgB0AGUAZwByAGEAQwBlAHkAaAB1AG4AIABCAGkAcgBpAG4AYwBpAEMAbwBwAHkAcgBpAGcAaAB0ACAAKABjACkAIAAyADAAMQA3ACAAYgB5ACAAQQByAHQAZQBnAHIAYQAuACAAQQBsAGwAIAByAGkAZwBoAHQAcwAgAHIAZQBzAGUAcgB2AGUAZAAuAGgAdAB0AHAAOgAvAC8AdwB3AHcALgBhAHIAdABlAGcAcgBhAHQAeQBwAGUALgBjAG8AbQBoAHQAdABwADoALwAvAHcAdwB3AC4AYQByAHQAZQBnAHIAYQB0AHkAcABlAC4AYwBvAG0ARgBPAE4AVABTAFAAUgBJAE4ARwAgAEQARQBNAE8AIAAtACAAQQByAHQAZQBnAHIAYQAgAFMAYQBuAHMAQgBvAGwAZAAyADAAMgAwAC0AMAAyAC0AMQAyACAAMQA1ADoAMwA2ADoANAA3AAAAAAADAAAAAwAAABwAAQAAAAAARAADAAEAAAAcAAQAKAAAAAYABAABAAIAAAB+//8AAAAAACD//wAB/+IAAQAAAAAAAAAAAQYAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgMEBQYHCAkKCwwNDg8QERITFBUWFxgZGhscHR4fICEiIyQlJicoKSorLC0uLzAxMjM0NTY3ODk6Ozw9Pj9AQUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVpbXF1eX2AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADAAAAAAAA/2YAZgAAAAAAAAAAAAAAAAAAAAAAAAAAAQAEBAABAQEfRk9OVFNQUklOR0RFTU8tQXJ0ZWdyYVNhbnNCb2xkAAECAAEAUfgcAPgdAfgeAvgfA/gUBPthDAPxDAQeCgAEiCgfi4seCgAEiCgfi4sMB/tS/KgcCAAcBgoFHQAAARkPHAAAEB0AAAHaER0AAAA/HQAAIhESAAUCAAEACAAVAEoAbQCLdW5pMDAwMFZlcnNpb24gMS4wMDdDb3B5cmlnaHQgXChjXCkgMjAxNyBieSBBcnRlZ3JhLiBBbGwgcmlnaHRzIHJlc2VydmVkLkZPTlRTUFJJTkcgREVNTyAtIEFydGVncmEgU2FucyBCb2xkRk9OVFNQUklORyBERU1PIC0gQXJ0ZWdyYSBTYW5zAAAAAYcAAQACAAMABAAFAAYABwBoAAkACgALAAwADQAOAA8AEAARABIAEwAUABUAFgAXABgAGQAaABsAHAAdAB4AHwAgACEAIgAjACQAJQAmACcAKAApACoAKwAsAC0ALgAvADAAMQAyADMANAA1ADYANwA4ADkAOgA7ADwAPQA+AD8AQAB8AEIAQwBEAEUARgBHAEgASQBKAEsATABNAE4ATwBQAFEAUgBTAFQAVQBWAFcAWABZAFoAWwBcAF0AXgBfAGECAAEAaQBtAHAA2AFAAagCEAJ4AuADSAOwBBgEgAToBQEFaQV6BeIGOwZlBsgHVge+CC8IsQjXCYgKDAomCk8KtwsfC4cL5gxODIQNAg1rDbUN5g4SDocOuQ7TDw8PSQ9qD6kP3xA9EIkRDxFtEfcSHhJlEo0SxxL+EywTVxO/FCcUjxT3FV8VxxZOFp0XABdSF8gYFRiRGNoZCRlcGZQZxxo7GoEa2hssG38bvRw8HIoc0hz1HS0dYh2oHdEeOR6hHwkfcfSjc/clOKOtpPcB9wcSyqizqKKozafUqJ+ovKgTtdDw91kVIAr3LGcVIQoTlgAiCvsuSxUjCvdP9ycVE7GAJAoTQMAlCvcx+ycVJgr3EAQnCoH3vxUoChOYsPvhVxUpCvdD9ykVKgoOHPraDv3NDvSjc/clOKOtpPcB9wcSyqizqKKozafUqJ+ovKgTtdDw91kVIAr3LGcVIQoTlgAiCvsuSxUjCvdP9ycVE7GAJAoTQMAlCvcx+ycVJgr3EAQnCoH3vxUoChOYsPvhVxUpCvdD9ykVKgoO9KNz9yU4o62k9wH3BxLKqLOooqjNp9Son6i8qBO10PD3WRUgCvcsZxUhChOWACIK+y5LFSMK90/3JxUTsYAkChNAwCUK9zH7JxUmCvcQBCcKgfe/FSgKE5iw++FXFSkK90P3KRUqCg70o3P3JTijraT3AfcHEsqos6iiqM2n1KifqLyoE7XQ8PdZFSAK9yxnFSEKE5YAIgr7LksVIwr3T/cnFROxgCQKE0DAJQr3MfsnFSYK9xAEJwqB978VKAoTmLD74VcVKQr3Q/cpFSoKDvSjc/clOKOtpPcB9wcSyqizqKKozafUqJ+ovKgTtdDw91kVIAr3LGcVIQoTlgAiCvsuSxUjCvdP9ycVE7GAJAoTQMAlCvcx+ycVJgr3EAQnCoH3vxUoChOYsPvhVxUpCvdD9ykVKgoO9KNz9yU4o62k9wH3BxLKqLOooqjNp9Son6i8qBO10PD3WRUgCvcsZxUhChOWACIK+y5LFSMK90/3JxUTsYAkChNAwCUK9zH7JxUmCvcQBCcKgfe/FSgKE5iw++FXFSkK90P3KRUqCg70o3P3JTijraT3AfcHEsqos6iiqM2n1KifqLyoE7XQ8PdZFSAK9yxnFSEKE5YAIgr7LksVIwr3T/cnFROxgCQKE0DAJQr3MfsnFSYK9xAEJwqB978VKAoTmLD74VcVKQr3Q/cpFSoKDvSjc/clOKOtpPcB9wcSyqizqKKozafUqJ+ovKgTtdDw91kVIAr3LGcVIQoTlgAiCvsuSxUjCvdP9ycVE7GAJAoTQMAlCvcx+ycVJgr3EAQnCoH3vxUoChOYsPvhVxUpCvdD9ykVKgoO9KNz9yU4o62k9wH3BxLKqLOooqjNp9Son6i8qBO10PD3WRUgCvcsZxUhChOWACIK+y5LFSMK90/3JxUTsYAkChNAwCUK9zH7JxUmCvcQBCcKgfe/FSgKE5iw++FXFSkK90P3KRUqCg70o3P3JTijraT3AfcHEsqos6iiqM2n1KifqLyoE7XQ8PdZFSAK9yxnFSEKE5YAIgr7LksVIwr3T/cnFROxgCQKE0DAJQr3MfsnFSYK9xAEJwqB978VKAoTmLD74VcVKQr3Q/cpFSoKDvSjc/clOKOtpPcB9wcSyqizqKKozafUqJ+ovKgTtdDw91kVIAr3LGcVIQoTlgAiCvsuSxUjCvdP9ycVE7GAJAoTQMAlCvcx+ycVJgr3EAQnCoH3vxUoChOYsPvhVxUpCvdD9ykVKgoO9KNz9yU4o62k9wH3BxLKqLOooqjNp9Son6i8qBO10PD3WRUgCvcsZxUhChOWACIK+y5LFSMK90/3JxUTsYAkChNAwCUK9zH7JxUmCvcQBCcKgfe/FSgKE5iw++FXFSkK90P3KRUqCg79CPuVdviydwHR+6oV962L9434svvTiwUO9KNz9yU4o62k9wH3BxLKqLOooqjNp9Son6i8qBO10PD3WRUgCvcsZxUhChOWACIK+y5LFSMK90/3JxUTsYAkChNAwCUK9zH7JxUmCvcQBCcKgfe/FSgKE5iw++FXFSkK90P3KRUqCg79rIH37gHl9+4D5fc3FSsKDvSjc/clOKOtpPcB9wcSyqizqKKozafUqJ+ovKgTtdDw91kVIAr3LGcVIQoTlgAiCvsuSxUjCvdP9ycVE7GAJAoTQMAlCvcx+ycVJgr3EAQnCoH3vxUoChOYsPvhVxUpCvdD9ykVKgoO9xpj97T6Pve0AeX34fjy9+ED+WpjFfhS91L39fgo+Cj7Uvf1/FL8UvtS+/X8KPwo91L79fhSHxwEygT3k7v7nvtf+19b+577k/uTW/ee91/3X7v3nveTHw78V6B2HAWadwH4KPfhA/eM+dEV9zD3HYv+Wvfhi4scBZr7nYv8RPwVBQ57i/e1+hT3tQH56ffhA/cC+tUV970nBb73B9Hc9xyL9YveWIv7Bos3PDxTVAj84vzUi/t2+ryLi/e1/MiL98P3vAX3DvcM9xn3GIv3S4v30Pt69x77uIv7mov7Z/sZOvuQCA6kY/e19+v3q/fO97US+gT34fu59+ET6OX3sRXq+5L3gET3j4v3sov3u/cQi/fci/dEJ/cB+ze7CBPw9xy/4vcAi/coi/fF+6j3CPudi/twi/t+MzP7bQj3vScFweLnqO6LCOH3DnX7AvtI+5yJ+xIf+6sHE+j3G/e7lftS+xv7IG/7AB/7BYv7BatQ8wgO9KNz9yU4o62k9wH3BxLKqLOooqjNp9Son6i8qBO10PD3WRUgCvcsZxUhChOWACIK+y5LFSMK90/3JxUTsYAkChNAwCUK9zH7JxUmCvcQBCcKgfe/FSgKE5iw++FXFSkK90P3KRUqCg7TY/e1+Cf3q/dq97UB92T35fgm9+ED9xb3JBX3L/so91tn92SLCPfV95/3Hvf1+AL7lvcG+94fWItWh1mCCJj3d/kDi4v3tf4/i1X+CgX3L833ULH3PIsI9x73CV/7Mfsu+wxb+xsf+xaL+wqrJd0IDuBj97X4VPe192D3qAH3Avfg+Jr34QP5UWMV99T3pPc79+737vuk9zv71B9AiyJ4T1mj90v3L+X3QYvWi9Z80nMI9w/3iAX7Brj7DqX7DosI/HX7ZPwQ/Ez8F/cm+7/4UR/5dQT3JPcHSPsx+zH7B0j7JPsk+wfO9zH3MPcHz/ckHw4goHYcBHn3tQHlHAR5Ffkpi/ywHPuH9/WL+MEcBK+L93/+m4sFDq9j97X38Pek99D3tRLl9+H7wPfh+E734fvA9+ET8vk5YxX3v/e09w336h+L9ydH9wb7Fs4IE+ztws73AIv3BQj30vui9xX7sPuw+6L7FfvSHov7Bc77AO1UCBPy+xZIR/sGi/snCPvq97T7Dfe/HvkRBPcI9x5r+yL7Ivsea/sI+wj7Hqv3Ivci9x6r9wgfE+z7cfhCFfcU9wap9vb3Bm37FPsU+wZtIB4g+wap9xQfDuBr96j3YPe1+FT3tQH3Avfh+Jr34AP5UvhUFdaL9J7HvXP7S/svMftBi0CLQJpEowj7D/uIBfcGXvcOcfcOiwj4dfdk+BH4S/gX+yb3v/xR+9T7pPs7++777vek+zv31B/7l/iVFfcx9wfO9yT3JPcHSPsx+zD7B0f7JPsk+wfO9zEeDv2sgffu9/r37gHl9+4D5fc3FSsK+VQEKwoO/U77lXb6YPfuAfdM9+4D96P7qhX3jfiy+9OL+2f8sgX3VhwEeRUrCg70o3P3JTijraT3AfcHEsqos6iiqM2n1KifqLyoE7XQ8PdZFSAK9yxnFSEKE5YAIgr7LksVIwr3T/cnFROxgCQKE0DAJQr3MfsnFSYK9xAEJwqB978VKAoTmLD74VcVKQr3Q/cpFSoKDvSjc/clOKOtpPcB9wcSyqizqKKozafUqJ+ovKgTtdDw91kVIAr3LGcVIQoTlgAiCvsuSxUjCvdP9ycVE7GAJAoTQMAlCvcx+ycVJgr3EAQnCoH3vxUoChOYsPvhVxUpCvdD9ykVKgoO9KNz9yU4o62k9wH3BxLKqLOooqjNp9Son6i8qBO10PD3WRUgCvcsZxUhChOWACIK+y5LFSMK90/3JxUTsYAkChNAwCUK9zH7JxUmCvcQBCcKgfe/FSgKE5iw++FXFSkK90P3KRUqCg4ngffu4fgw9/P3tQH4MvfnyffhA/fl+qIVz+zXvfcOi/GL9wJ0i/sQi/tE+6hx+xGJCPww9+H3bQf3dKr3RfcTi/eFi/fM+6D3EPupi/tyi/thMyH7Xwj35f6QFSsKDvSjc/clOKOtpPcB9wcSyqizqKKozafUqJ+ovKgTtdDw91kVIAr3LGcVIQoTlgAiCvsuSxUjCvdP9ycVE7GAJAoTQMAlCvcx+ycVJgr3EAQnCoH3vxUoChOYsPvhVxUpCvdD9ykVKgoO96qgdvet96v5/ncBsxb3+4v3Avet+NaL9wL7rff7i/zlHAWa+96LBfc5/DgV90f8Wvv6iwUO90KL96r32Peh97D3qxL3Fvfh+Lz35Pu19+gT9PnLFvew97vv994fi/dL+xH3Avs/rwgT+PchqPP3Cov3JQj30fupzfufHv05HPpmBvfh+O4V9/QGE/T3DvcRf/sq+yn7EX77Dh/79Ab45QT3sPf0BxP47+90+wv7Cyd0Jx8O91tj97X6PPe1AeX36wP59mMV93GL91Cw90D3Jgj7Ofd2BfsWMvsUbPsyiwj7tvsj91P3qfep9yP3U/e2H/cyi/cUbPcWMgj3Ofd2BftA9yb7ULD7cYsI/Gn7x/uw/G38bffH+7D4aR8O93WL97X57Pe1AfcW9+H5G/frA/l1FvhW9573ofhU+FT7nveh/FYf/PMc+mYG+PMcBHkV95r3A/tP+4X7hfsD+0/7mh/7pvnsBg6Ji/e19773tfeh97UB9xb34QP3FhwFmhUc+mb6yPe1/Xv3vvlG97X9Rveh+XH3tQcOf6B2+Mv3tfe197UB9xb34QP3FhwFmhUc+mb34fjL+Ub3tf1G97X5cfe1Bw73jWP3tffS96v35/e1AeX36/lW98kD5flhFfxt98f7sPhpHvdfi/dwrvcz9xsI+WD83vur96n7mwc3YCx/LYsI+7b7I/dT96n3qfcj91P3th/3Kov3JWz3EjYI9z73cgX7Qvce+1u4+26LCPxp+8f7sPxtHw73faB2+N/3tfjCdwH3Fvfh+QX34QP4Yxb43/kF/N/34RwFmvvh/ML9BfjC++Ec+mYHDv1VoHYcBZp3Afcg9+ED9yAW9+EcBZr74QYOS2P3tRwEoXcB+av34QPR99IV2fub904s956LCPfv90X3PvfyH/pO++H+Tgf7HWUt+y0e+waLS79f8QgO90ugdhwFmncB9xb34QP4YxaL+Eb3Kfct+Fr83/gfi/0K+cH49vkB/CuL/M/82ov42vvhi4sc+mYFDkiL97UcBHl3AfcW9+ED+GMcBZoV++Ec+mb6m/e1/U4GDvjcoHYcBZp3AfcW9+H6ZPfhA/cWFvfh+hgG9/v+GPeWi/f7+hiL/hj34YuLHAWa/F2L/AD+IPwA+iD8XYsFDveToHYcBZp3AfcW9+H5G/fhA/hjFov6UPjC/lD4OouLHAWa++GLi/5Q/ML6UPw6i4sc+mYFDvgyY/e1+jz3tQHl9+v59vfrA/n2YxX4affH97D4bfht+8f3sPxp/Gn7x/uw/G38bffH+7D4aR/8RfmJFfep9yP3U/e297b3I/tT+6n7qfsj+1P7tvu2+yP3U/epHg73IKB2+EL3tfg+97UB9xb34fi49+UD9xYW9+H4QvfJBvfV95P3L/fv9+/7k/cv+9Uf/RYG9+H9XxX4PvfJB/ci7E37K/srKk37Ih8O+DJIdrv3tfo897UB5ffr+fb36wP59mMV84vzmO6sCN0t9/2L+2X3dwX3Ovcm0Pdsi/dsCPht+8f3sPxp/Gn7x/uw/G38bffH+7D4aR4cBMkE97b3I/tT+6kfi/sNb/sUOC8IMe374Yv3UvtuBW6GbYltiwj7tvsj91P3qfep9yP3U/e2Hw73DqB2+IL3l/gc97UB9xb34fis9+UD+GMW+IL3kgf3qPyC9/mL+8D4rQX3Rtb3APcgi/dZCPfh+5T3LPvIHv0WHPpmBvfhHAR5FffJBvcX61T7IfshK1T7Fx/7yQYOsWP3tfo897UB9wj35fiE9+UD0fcYFfdD+xv3Zmb3bYv3t4v31+SL9/GL99j7xOL7msYtoPtBqov3Eov3CfcToeeL9yOL9w5x9xVLCPc2938F+zb3APter/tUi/usi/uo+wCL+9SL+8j3sfsC95RT5nf3XW+L+xKL+x/7Q4Eli/sti/swr/sX3QgO9qB2HAR597UB+Lb34QP4thwEeRUc+4f34RwEefhw97Uc+vv7tQcO929j97UcBKF3AfcW9+H49/fhA/mVYxX4VvdQ95v4QB/5o/vh/aMH+3Vh+0X7m/ucYfdE93Ye+aP74f2jB/xB91D7mvhXHg73gqB2HAWadwGzHAWaFfjRHPpm996L+NEcBZr7+4v8D/6K/A/6igUO+ZagdhwFmncB+HEW99eL94j52veI/dr314v4SRwFmvv6i/uP/gj7kfoI+7CL+5H+CPuP+gj7+osFDveaoHYcBZp3AfhFFvf5+IT3+fyE+B2L/Kr5dviK+Uz8HYv72fxa+9n4Wvwdi/iJ/Uz8qf12BQ73YqB2HAWadwH45/fiA/jn+NQV/NT34vjUB/i/+e78Eov76Pyy++j4svwSiwUOwIv3tfns97UBHATtFve1/TgH+Tj6XYv3RP7ri4v7tfkRi/05/l2L+0QFDvSjc/clOKOtpPcB9wcSyqizqKKozafUqJ+ovKgTtdDw91kVIAr3LGcVIQoTlgAiCvsuSxUjCvdP9ycVE7GAJAoTQMAlCvcx+ycVJgr3EAQnCoH3vxUoChOYsPvhVxUpCvdD9ykVKgoO9KNz9yU4o62k9wH3BxLKqLOooqjNp9Son6i8qBO10PD3WRUgCvcsZxUhChOWACIK+y5LFSMK90/3JxUTsYAkChNAwCUK9zH7JxUmCvcQBCcKgfe/FSgKE5iw++FXFSkK90P3KRUqCg70o3P3JTijraT3AfcHEsqos6iiqM2n1KifqLyoE7XQ8PdZFSAK9yxnFSEKE5YAIgr7LksVIwr3T/cnFROxgCQKE0DAJQr3MfsnFSYK9xAEJwqB978VKAoTmLD74VcVKQr3Q/cpFSoKDvSjc/clOKOtpPcB9wcSyqizqKKozafUqJ+ovKgTtdDw91kVIAr3LGcVIQoTlgAiCvsuSxUjCvdP9ycVE7GAJAoTQMAlCvcx+ycVJgr3EAQnCoH3vxUoChOYsPvhVxUpCvdD9ykVKgoO9KNz9yU4o62k9wH3BxLKqLOooqjNp9Son6i8qBO10PD3WRUgCvcsZxUhChOWACIK+y5LFSMK90/3JxUTsYAkChNAwCUK9zH7JxUmCvcQBCcKgfe/FSgKE5iw++FXFSkK90P3KRUqCg70o3P3JTijraT3AfcHEsqos6iiqM2n1KifqLyoE7XQ8PdZFSAK9yxnFSEKE5YAIgr7LksVIwr3T/cnFROxgCQKE0DAJQr3MfsnFSYK9xAEJwqB978VKAoTmLD74VcVKQr3Q/cpFSoKDiNz95D3m/dO9yH3hgHR99z4DffdA/hlcxX3E4v3E6vD9xMI+xv33fkPB/fm+0Hi+9Ie+yiL+0Vu+xhHCPcB+2YF9rj0n/cIi/cIi9B2ifsTWZBZjVmLCPuB+9NR+8D7f/dG+wD3bR9I+AkV9xX3YJjnHqaLpoqmiQgyB/sN+xNZJDtIq+QeDsFt95D43veQ+Fx3AfcC99z4rPfcA/cCFvfc9xwG1/sH9xRY9xqLCPfb91v3dPfV99X7W/d0+9sf+xqL+xRYP/sHCPkC+9wH+Oj9WBUsCg77JW33kPje95AB0ffcA/k4bRX3OYv3OrH3CPcSCPsx91MFOEYoafsAiwj7Rif3DPdB90Hv9wz3Rh/3AIvuad5GCPcx91MF+wj3Evs6sfs5iwj74ful+1T79fv196X7VPfhHw7BbfeQ+N73kPhcdwHR99z4rPfcA9H4lxX71fdb+3T32x73Gov3FL7X9wcI+xz33BwF7Pvc/QIHP/cH+xS++xqLCPvb+1v7dPvVH/jo97kVLAoOVm33hvdK92j3aPeGAdH36vhc99sD0fiXFfvz93X7VvftHvdDi/dGs/ce9wQI+zb3TAUpSPsFcPsKi/sLi/sDu4z3Ggj5nwaOrY2ti60I9/f7Wfdl+/r75/t7+1v77h74zvfDFfcY60D7HR/8XAb3HevW9xgeDvwNoHb5nveQ95z3kAH3gvfcA/eC+Z4V/Z733Pme97D3kPuwB/cGd/cq9zIeuIu3g7Z+COD3eQU9qSuZOIv79ItH+2aF+8YI+1D7kAYOwfyo95D3jveQ+N73kAHR99z4rPfcA9H4lxX71fdb+3T32x73Gov3FL7X9wcI+xwH+1b7EzX7Sh77Gov7A6j7C8oI+xH7eAX3KTf3P2v3PYsI9/X3sPce+B4f+pr73PscBz/3B/sUvvsaiwj72/tb+3T71R/46Pe5FSwKDnWgdvm895D4XHcB9wL33Pg499wD9wIW99z4qgb3KbD3EfdB90Gw+xH7KR78qvfc+KoH99f7Ffdf++we+weLLGJKKQj45/vcBw79hqB2HASK9+wB9wr33AP3Chb33Pqa+9wGg/fEFSzYPurq2Njq6j7YLCw+PiweDv12/Kj3kBwFovfsAfca99wD+1L8fBXMad6B1IsI99f3APc798Uf+tb73P7WBzGL+xb7Dx5ki2CTZpgI+CocBY0V6tjY6uo+2CwsPj4sLNg+6h8OVaB2HAXsdwH3AvfcA/cCHAXsFRz6FPfc98IH8uf30vwe+BWL/HX46Ph1+Eb8M4v8G/v1i/nbBQ79R4v3kBwE8HcS9wL33Pvc+FMT0PcC+BoV+4TQ+yr3pB7195BkBhPgNJL2yB/63PvcBw74rqB2+bz3kAH3Avfc99r33Pfa99wDFDj3Ahb33PjcBvcCq/cG9xf3F6v7BvsCHvzc99z43Af3Aqv3BvcX9xer+wb7Ah783Pfc+NwH96P7Cvdh+7oe+x6L+wBQUPsTQvca+xS/+yiL+wCLNWtbIwj1+9wHDnWgdvm895AB9wL33Pg499wD9wIW99z4qgb3KbD3EfdB90Gw+xH7KR78qvfc+KoH99f7Ffdf++we+weLLGJKKQj3AfvcBw6tbfeQ+N73kAHR99z4wPfcA9H4lxX79fel+1T34ffh96X3VPf19/X7pfdU++H74ful+1T79R748ve5FfdH7vsM+0H7QSj7DPtH+0co9wz3QfdB7vcM90cfDsH8k3b4iveQ+N73kAH3Avfc+Kz33AP3AvyoFffc+TAG1/sH9xRY9xqLCPfb91v3dPfV99X7W/d0+9sf+xqL+xRYP/sHCPcc+9wH+Oj7chUsCg7B/JN2+Ir3kPje95AB0ffc+Kz33APR+JcV+9X3W/t099se9xqL9xS+1/cHCP0w99wcBhr73PscBz/3B/sUvvsaiwj72/tb+3T71R/46Pe5FSwKDvvooHb5vPeQAfcC99wD9wIW99z4qgb3KbD3EfdBHsKLy326bQj3JPeMBT+vNZc4i/sIiy1iSikI9wH73AcO+35t95D43veQAej33Pex99wDvfQV9xv7AfdVcfc9i/dni/eoy4v3mov3kPuNxvtds16U+wqbi8uLytqUuovxi/cJc+hhCPcQ92cF+xfZ+y6o+yuL+2iL+4ZFi/uSi/t895BD901mwoD3DYGLPYtB+wCLWIv7E4v7G6r7A8oIDvv5bfeQ+MD3kPe/dwH3iPfcA735nhX3VvvyBvvO9vsk99se1Ivnm8+mCEX3fgVcfF2BWYsI+wuE9wfmH/fy97b3kPu297/73Pu/+1YHDnVt95D5vHcB9wL33Pg499wD+NttFfcHi+q0zO0I+wH33Pqa+9z8qgf7KWb7EftB+0Fm9xH3KR74qvvc/KoH+9f3Fftf9+weDiWgdvqadwGf+poV+EP+mvfOi/hD+pr76ov7iv00+4r5NAUO9+6gdvqadwH3+xb3tIv3Tfjb90382/e0i/fn+pr70ov7RP0P+135D/t+i/td/Q/7RPkP+9KLBQ4xoHb6mncB+BkW93X32vd1+9r4BYv8E/iv9+/4f/wFi/tR+6v7Ufer/AWL9+/8f/wT/K8FDiX8qPeQHAUedwH4YRZC+zoFc1RpUEeLZYtlk2eYCCb7cwXOaOl814v3S4vp3ND3Ngj4yBwFJ/vqi/uK/TT7ivk0++qLBQ77aYv3kPii95AB5fcpFfsp+jH3kPyEB/iE+QiL9yr+FIuL+5D4Z4sFDvSjc/clOKOtpPcB9wcSyqizqKKozafUqJ+ovKgTtdDw91kVIAr3LGcVIQoTlgAiCvsuSxUjCvdP9ycVE7GAJAoTQMAlCvcx+ycVJgr3EAQnCoH3vxUoChOYsPvhVxUpCvdD9ykVKgoO9KNz9yU4o62k9wH3BxLKqLOooqjNp9Son6i8qBO10PD3WRUgCvcsZxUhChOWACIK+y5LFSMK90/3JxUTsYAkChNAwCUK9zH7JxUmCvcQBCcKgfe/FSgKE5iw++FXFSkK90P3KRUqCg70o3P3JTijraT3AfcHEsqos6iiqM2n1KifqLyoE7XQ8PdZFSAK9yxnFSEKE5YAIgr7LksVIwr3T/cnFROxgCQKE0DAJQr3MfsnFSYK9xAEJwqB978VKAoTmLD74VcVKQr3Q/cpFSoKDvSjc/clOKOtpPcB9wcSyqizqKKozafUqJ+ovKgTtdDw91kVIAr3LGcVIQoTlgAiCvsuSxUjCvdP9ycVE7GAJAoTQMAlCvcx+ycVJgr3EAQnCoH3vxUoChOYsPvhVxUpCvdD9ykVKgoO+OoUHAUmFWOz+pqp+AqztYsG/KiLBx4KAl8MCZIMCowMC/e1CveQsAwM9+EL99yQDA2MDA4eCgb/DBIcAD8TAA0CAAEAHQAjAC0ASgBtAH4AkgCkAL8A2AD1AQcBJYsHpZB5a2yGeHEfiIuHi4mMCO0HjoyOi46LCAtjrbqkBgs/+yXXo1yxswYLiwe4nKK+vXukXh+Bi32JfokI+yMHmImai5OLCAuLB4hoiEyKXAinBoutjK+MrQiMi585pouf3QWNaYxni2kIC6gGibqJyomuCGOLeDt42wULiwezmaK+vn2jY2N+c1hYmHSzHwugj3pqa4d5dneHnausj5yfHwuLBzhC+0+LH7W0v6LTk6COqp2LqgiggbVXHguLB2J2bGtsqnaqH8qLv3e0VwiLTfdPLR4LiwdtqGaDdXV2dJNnoXW4YKJXhEmLi+H3RkjMCAss2T3q6tnZ6uo92SwsPT0sHgv3Q+j7E/s6+zou+xP7Q/tDLvcT9zr3Ouj3E/dDHwsAAAEAAAAMAAAAFgAAAAIAAQABAGAAAQAEAAAAAgAAAAAAAQAAAAoAdgCQAAJERkxUAA5sYXRuABoABAAAAAD//wABAAAAQAAKQVpFIABAQ0FUIABIQ1JUIABAS0FaIABATU9MIABATkxEIABAUExLIABAUk9NIABAVEFUIABAVFJLIABAAAD//wABAAAAAP//AAIAAAABAAJmcmFjAA5sb2NsABQAAAABAAEAAAABAAAAAgAGABAABgAAAAIAFAA0AAYAAAACAEoAYAADAAAAAgAQABYAAQAaAAAAAQABAE4AAQAAAAEAAQBOAAMAAAACABAAFgABABoAAAABAAEALgABAAAAAQABAC4AAwABABIAAQAOAAAAAAABAAAAAQAAAAMAAQASAAEADgAAAAAAAQAAAAEAAAAAAAEAAAAKAGwAegACREZMVAAObGF0bgAaAAQAAAAA//8AAQAAAEAACkFaRSAAQENBVCAAQENSVCAAQEtBWiAAQE1PTCAAQE5MRCAAQFBMSyAAQFJPTSAAQFRBVCAAQFRSSyAAQAAA//8AAQAAAAFrZXJuAAgAAAABAAAAAQAEAAIAAAAFABAC2gM0BQwFJAABAoYABAAAACAASgBwAI4AtADaAPwBIgFEAVIBcAF6AYABkgGgAaoBoAG0AcYB6AICAiACQgJMAloBcAJaAmgCTAJMAloCdgKAAAkAEv/yABP/4QAU/9MAF//hABj/8gAZ/5wAGv/yABv/xQAh/7QABwAS/+EAFP/hABf/4QAY/+EAGf/FABr/8gAb/+EACQAS/+EAE//hABT/4QAX/88AGP/hABn/xQAa//IAG/+cACH/nAAJABL/0wAT/4cAFP/FABf/xQAY/9MAGf+HABr/8gAb/4cAIf+cAAgAEv/FABT/4QAX/8UAGP+wABn/4QAa/8UAG//TACH/zwAJABL/8gAT/+EAFP/yABf/4QAY//IAGf+wABr/8gAb/+EAIf/PAAgAEv/hABT/4QAX/8UAGP/yABn/xQAa//IAG//hACH/tAADABf/5wAZ/88AG//nAAcAEv/hABP/agAX/8UAGP/hABn/xQAb/8UAIf83AAIAGf/hACH/zwABABL/4QAEABL/4QAT/8UAGP/FACH/zwADABP/nAAZ/84AIf83AAIAGf/hACH/tAACABf/4QAY/+EABAAS/+EAF//hABj/4QAc/5wACAAS/8UAE//hABT/4QAY/5wAGv/FABv/xQAc/5wAIf/nAAYAFP/hABf/xQAY/5wAGv/FABv/nAAc/88ABwAS/8UAE//FABf/4QAY/+EAGv/hABv/4QAh/88ACAAS/5wAE//FABT/xQAX/+EAGP9qABr/xQAb/5wAIf/PAAIAEv/hACH/5wADABP/4QAZ/+EAIf/PAAMAE//hABn/4QAh/5wAAwAT/5wAGf/FACH/zwACABn/xQAh/5wAAQAh/88AAQAgABIAFAAXABgAGQAaABsAIQAjACQAJQAtAC4AMQAyADMANgA4ADkAOgA7ADwAQwBEAEUARwBKAE8AUABRAFIAVQABAFAABAAAAAMAEAAQADIACAAS/4cAE/8GABf/xQAY/4cAGf9qABr/xQAb/2oAIf83AAcAEv/hABT/4QAX/+EAGP/hABn/0wAb/+EAIf/nAAEAAwAOABAAFQABAcIABAAAAAkAHABCAFQAfgC0ASoBUAF6AYgACQAO/4cAEP+HABX/xQAj/8UALP/FADb/xQA4/8UAOv/FADv/nAAEABX/4QA4/+EAOf/FADv/xQAKAA7/xQAQ/8UAFf/TACP/4QAs/+EANv/FADj/4QA5/8UAOv/hADv/4QANAA7/hwAQ/4cAFf/TACP/4QAx/+EAM//hADb/nAA4/5wAOf+cADr/xQA7/5wAPP/hAFb/4QAdAA7/BgAQ/wYAFf/hACP/NwAl/8UAKf/FACz/TAAx/8UAM//FAEP/agBF/2oARv9qAEf/agBI/7AASf9qAE//xQBQ/8UAUf9qAFL/xQBT/2oAVP/FAFX/hwBW/7AAV//FAFj/xQBZ/8UAWv/FAFv/xQBc/5wACQAO/8UAEP/FACP/4QA2/+EAOP/FADn/xQA6/+EAO//FAFr/4QAKAA7/hwAQ/4cAFf/TACP/xQAs/+EANv/hADj/4QA5/5wAOv/hADv/xQADADb/nAA4/5wAOf/PAA4ADv7uABD+7gAj/2oALP+cADb/5wA4/+cAOv/PADv/zwBF/88ARv/PAEf/zwBJ/88AUf/PAFP/zwABAAkAEgAUABcAGAAZABoAGwAcACEAAQASAAQAAAABAAwAAQAV/+cAAQABACEAAjI0AAQAADDAMXoAUgBMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/F/5z/hwAAAAAAAP83/+H/4QAAAAAAAAAAAAAAAAAA/4f/5/+HAAAAAAAAAAAAAAAA/5wAAAAAAAAAAAAA/8UAAAAAAAAAAP+cAAAAAAAAAAD/xQAAAAAAAP8fAAAAAAAAAAAAAP/hAAAAAAAA/2oAAP/hAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP+cAAAAAAAAAAAAAAAAAAD/xQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/8UAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/FAAAAAAAAAAAAAP+c/8UAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/2oAAP/nAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/hAAD/nAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/h/4P/4QAAAAAAAP+w/8X/xQAAAAAAAAAAAAAAAAAAAAD/z//FAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/+EAAAAAAAAAAAAAAAAAAAAAAAD/hwAAAAAAAP/PAAAAAAAAAAAAAP/hAAAAAAAA/7AAAP+HAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/hAAAAAAAAAAAAAAAAAAAAAP+cAAAAAAAA/2r/4f/hAAAAAAAAAAAAAAAAAAAAAAAA/4cAAAAAAAD/4f/hAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/FAAAAAAAA/4MAAAAAAAAAAAAAAAAAAAAAAAD/nAAAAAAAAAAAAAAAAAAAAAAAAP/hAAAAAAAA/5wAAAAAAAAAAAAAAAAAAAAA/8//zf/F/5z/zwAAAAD/agAAAAD/nP/F/5wAAAAA/8//xQAA/8UAAP+D/4P/xQAAAAD/zwAAAAD/oAAAAAD/zwAA/4cAAP/F/8X/xQAAAAD/4f83AAAAAAAAAAD/4f/FAAD/zwAA/8UAAP/FAAAAAP+cAAD/h/+HAAD/xQAA/4MAAAAAAAAAAP/F/+H/xf+c/4cAAAAA/5wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP+0AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/hAAAAAAAA/+H/4f/hAAAAAAAAAAAAAAAAAAAAAAAA/+EAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/FAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/4QAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/4QAA/yUAAAAAAAD+ogAAAAAAAAAA/+EAAP/h/qL/4f8l/+H/TP/hAAD/4f+H/4f/xQAAAAD/xQAAAAD/nP/F/+H/xf/h/2oAAAAA/8X/xf/hAAD/xf+D/8X/N//hAAD/agAAAAD/4QAA/+EAAP8G/+EAAP+c/2r/av9q/+H/av/h/4cAAAAAAAD/G//F/8X/xf+c/2oAAP/hAAD/Jf/hAAAAAP6iAAAAAP9qAAD/4f/hAAD+ov/h/zf/4f9M/+H/xf/h/2r/h//FAAAAAP/FAAAAAP+c/8X/4f/h/+H/agAA/8X/xf/F/+EAAP+c/2r/xf8G/+EAAP91/8UAAP/hAAAAAAAA/tX/4QAA/5z/av+H/4f/4f+H/+H/hwAAAAAAAP8G/8X/xf/F/5z/agAAAAAAAAAAAAAAAAAAAAD/4f/hAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/sP+wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/FAAD/gwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP+wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/BgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/PAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/2oAAAAAAAAAAAAA/2oAAAAA/wYAAAAAAAD/agAAAAAAAP/PAAAAAAAAAAAAAAAA/5wAAAAA/5wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/BgAAAAAAAAAAAAAAAAAAAAAAAP+cAAAAAAAAAAAAAP83AAAAAAAAAAAAAAAAAAAAAAAAAAAAAP+cAAAAAAAAAAAAAAAAAAAAAP+cAAAAAAAA/ucAAAAAAAAAAAAAAAAAAAAAAAD/nAAA/0wAAAAAAAD/4f/hAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/zcAAAAAAAAAAAAAAAAAAAAAAAD/nAAAAAAAAAAAAAAAAAAAAAAAAP/hAAAAAAAA/5wAAAAAAAAAAAAAAAAAAAAAAAD/nP9MAAAAAAAAAAAAAAAAAAD/tP/hAAAAAAAAAAD+1QAA/5wAAAAAAAAAAAAAAAAAAP/hAAAAAAAAAAAAAAAA/zcAAAAAAAD/nAAAAAD/nP9SAAD+ogAAAAD/TP91AAAAAAAA/+EAAAAAAAAAAP+c/zf/NwAAAAD/agAAAAAAAAAAAAD+wf+c/+H/nP+c/zcAAAAA/5wAAAAAAAAAAAAA/8UAAAAAAAAAAAAAAAAAAAAAAAAAAP83AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP9qAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/FAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP9MAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/88AAAAAAAAAAAAAAAAAAAAA/4cAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/hAAAAAAAAAAAAAAAA/+EAAAAAAAAAAAAA/+EAAAAAAAAAAAAAAAAAAAAAAAAAAP/h/+H/4QAA/+EAAAAAAAAAAAAA/5wAAAAAAAAAAP/hAAAAAP+cAAAAAAAAAAAAAP+c/5wAAAAAAAAAAAAAAAAAAP/FAAAAAAAAAAAAAAAAAAAAAP/FAAAAAP/PAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/2oAAAAAAAD/nAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/agAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/nAAAAAAAAAAAAAAAAP/h/6gAAAAAAAAAAP9q/5z/sAAAAAAAAAAAAAD/agAA/+EAAP+HAAAAAAAAAAAAAAAA/+EAAAAA/+EAAAAA/+EAAAAAAAAAAP+cAAAAAAAAAAD/av/hAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/8UAAP/hAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP+cAAAAAAAAAAAAAAAAAAD/z/9qAAAAAAAA/wb/4f/hAAAAAAAAAAAAAAAAAAD/agAA/4cAAAAAAAD/4f/hAAD/4QAAAAAAAAAAAAAAAAAAAAAAAAAA/+EAAAAAAAAAAP/FAAD/agAA/2oAAAAAAAAAAAAAAAAAAAAAAAD/TAAAAAAAAAAAAAAAAAAAAAAAAP/FAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/h/+EAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP+c/5wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/8UAAP9qAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/5wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/xQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/4QAAAAAAAAAAAAD/nAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/4f/hAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/4QAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD+PQAA/2oAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/5wAAAAAAAAAAP9qAAAAAAAAAAAAAAAAAAD/nAAAAAAAAAAA/2oAAAAAAAAAAP/hAAAAAAAAAAD/nP9q/5wAAAAA/2oAAAAAAAAAAAAA/tX/xf/hAAD/nP9qAAAAAP+c/2oAAAAAAAD+1f+c/7AAAAAAAAAAAAAA/tUAAP9MAAD/TAAAAAAAAP/h/+EAAP/FAAAAAP/hAAAAAP/hAAAAAAAA/+H/agAAAAD/4QAA/5z/4f/PAAD+1QAAAAD/4QAAAAAAAAAAAAAAAP9qAAAAAAAA/+H/4f/hAAD/4QAA/+EAAAAAAAD/TAAAAAAAAAAA/+EAAAAAAAAAAP/h/zcAAAAAAAAAAAAAAAAAAP9qAAAAAAAA/pgAAP7VAAD/nAAAAAAAAAAAAAAAAAAAAAAAAP/hAAAAAAAAAAD/nAAA/zf/nP+cAAAAAP+c/wb/nP8GAAAAAP+c/5wAAAAAAAAAAAAAAAAAAAAA/+H/nP+cAAAAAP+cAAAAAAAAAAAAAP83/5z/nP+c/+H/nAAAAAD/nAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/zcAAAAAAAAAAAAAAAAAAAAAAAAAAP/hAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/zcAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/+EAAAAAAAAAAAAA/2oAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/nAAAAAAAAAAAAAAAAAAA/5wAAP/hAAD/xQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/hAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/xQAAAAAAAAAAAAAAAAAA/8UAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/z//hAAAAAAAAAAD/4f/hAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/FAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/+EAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/FAAAAAAAA/7QAAP9M/0z/zwAAAAD/N//FAAAAAAAA/4cAAAAAAAAAAP+w/7D/xQAAAAAAAP/F/5z/hwAAAAAAAAAA/8UAAAAAAAAAAAAA/0wAAP+cAAAAAAAAAAAAAAAAAAD/hwAA/0wAAAAAAAD/TP+H/8X/xf/FAAD/4f/FAAAAAP+HAAAAAAAA/4f/xf+H/8UAAAAA/88AAAAAAAAAAAAA/wb/NwAAAAAAAP+c/7AAAAAAAAD/BgAAAAAAAAAA/+H/4QAAAAD+cQAAAAAAAP/hAAAAAAAAAAAAAAAAAAAAAAAAAAD+mAAA/zcAAAAAAAAAAAAAAAAAAP9M/tX/sAAAAAAAAP6i/+EAAAAAAAAAAAAA/8X/4QAA/+H/BgAAAAD/nAAA/+EAAAAAAAD/tP/hAAAAAAAAAAD/nP+wAAAAAAAAAAAAAAAAAAD/4QAAAAAAAAAAAAD/4f/hAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/hAAAAAAAAAAAAAP+cAAD/zwAAAAAAAAAA/+EAAAAAAAAAAAAAAAAAAAAAAAAAAP/h/+H/4QAA/+EAAP/hAAAAAAAAAAAAAAAAAAAAAP/hAAAAAP/PAAAAAAAAAAAAAP/F/8UAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/4cAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/xQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/7AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/FAAAAAAAAAAAAAAAAAAAAAAAA/+EAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/4QAA/88AAAAAAAAAAAAA/+EAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/nAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/4MAAAAA/+EAAAAAAAAAAP/hAAAAAAAAAAD/4f/hAAAAAAAAAAAAAAAA/8UAAAAAAAAAAP/FAAAAAAAAAAAAAAAAAAD/agAAAAAAAAAAAAAAAAAA/+EAAAAAAAAAAAAAAAD/xf/F/8UAAAAA/+EAAP/hAAAAAAAAAAAAAP/hAAD/xf/FAAAAAP/PAAAAAAAAAAAAAAAA/+EAAAAAAAAAAAAA/8UAAAAAAAD/xQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/4QAAAAAAAAAAAAAAAAAAAAD/4QAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/+EAAAAAAAAAAAAA/8UAAAAAAAAAAAAA/5z/agAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/nAAAAAD/xQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP+cAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/4QAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/4f/hAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/FAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/PAAAAAAAAAAAAAP+c/8UAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/5wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/xQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/4cAAAAAAAAAAAAA/2r/agAAAAAAAAAA/+EAAAAAAAAAAP/FAAAAAAAAAAAAAAAAAAAAAAAA/+H/4QAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/Bv/hAAAAAAAAAAAAAAAAAAAAAAAAAAD/4QAAAAAAAP7VAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/hAAD/4QAAAAAAAAAAAAD/xQAAAAAAAAAAAAD/4QAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/FAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/zcAAP/F/8UAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/FAAAAAP/FAAAAAAAAAAAAAAAA/8UAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/+EAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/+H/4QAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/+EAAAAAAAAAAAAAAAAAAAAAAAD/4QAAAAAAAAAAAAD/xQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/xf/FAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/4f/hAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP+cAAD/zwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/8UAAAAAAAAAAAAAAAAAAP/hAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/hAAAAAAAAAAAAAP/F/+EAAAAAAAAAAAAAAAAAAP9MAAD/BgAAAAAAAAAAAAAAAAAAAAAAAP/hAAAAAAAAAAAAAAAA/+EAAAAAAAAAAAAA/8UAAAAAAAD/nAAAAAD/4QAAAAAAAAAAAAAAAAAAAAD/nAAA/+H/4QAAAAD/4QAAAAAAAAAAAAD/nAAAAAAAAAAA/8UAAAAA/+EAAAAAAAAAAAAAAAD/xQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/xQAAAAAAAAAAAAD/xQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/hAAD/xf/F/8UAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/xQAA/4P/N/9S/5z/5wAA/zf/av+DAAD/zwAAAAAAAP8fAAD/nP9q/5wAAAAAAAAAAAAAAAD/av/PAAD/g/9qAAD/agAA/+cAAAAA/zcAAAAAAAAAAP8GAAAAAAAA/4MAAAAAAAAAAP+0/4MAAAAA/2r/agAA/zcAAAAAAAAAAAAA/88AAAAAAAAAAAAA/2oAAAAAAAAAAAAAAAD/xQAA/wYAAAAAAAD+gwAAAAD/BgAA/8UAAP/h/oP/xf8G/8X/TP/F/5z/xf83/zf/nAAAAAD/h//yAAD/av/F/8X/xf/F/wYAAAAA/5z/xf/FAAD/av8G/5z+1f/F/8X/Jf91AAD/xQAA/+EAAP7V/8UAAP9q/wb/Bv8G/8X/N//F/zcAAAAAAAD+5/91/5z/nP9q/wYAAAAAAAAAAAAAAAAAAAAA/zf/NwAAAAAAAAAAAAAAAAAAAAD/TAAAAAAAAAAA/8X/xQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD+5wAA/zcAAAAAAAAAAAAAAAAAAP9MAAAAAAAAAAAAAP8GAAAAAAAAAAAAAAAA/8X/xQAA/+H/agAAAAAAAAAA/+EAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/5z/4QAAAAD/4f/hAAAAAAAAAAD/xf/FAAAAAAAAAAAAAAAA/5wAAAAA//IAAAAAAAAAAAAAAAAAAAAAAAD/NwAAAAAAAAAAAAAAAAAA/+EAAAAAAAAAAAAA//L/nAAAAAAAAAAAAAAAAP/FAAD/4QAAAAAAAAAAAAD/nAAAAAAAAAAAAAAAAAAAAAAAAP/h/+EAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/+EAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/4QAAAAAAAP/F/+H/xQAAAAAAAAAAAAD/hwAA/+EAAP/FAAAAAAAAAAAAAAAA/+EAAAAA/+EAAAAAAAAAAAAAAAAAAP/hAAAAAAAAAAD/xf/h/88AAAAAAAAAAAAA/+EAAAAAAAAAAAAA/+EAAP/hAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/hAAAAAAAAAAAAAAAAAAD/xQAAAAAAAAAAAAD/nP+cAAAAAAAAAAAAAAAAAAAAAAAA/8UAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP9qAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/wYAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/F/8UAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/F/8UAAAAAAAAAAAAAAAAAAP/hAAAAAAAAAAAAAAAAAAAAAAAA/8UAAP+cAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/8UAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/5wAAAAAAAAAAAAA/5wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/dQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP83AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/hwAAAAAAAAAAAAD/av9qAAAAAAAAAAD/4QAAAAAAAAAA/8UAAAAAAAAAAAAAAAAAAP+cAAD/4f/hAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP83/+EAAAAAAAAAAAAAAAAAAAAAAAAAAP/hAAAAAAAA/tUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/hAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP8G/zcAAAAAAAD/agAAAAAAAAAA/2oAAAAAAAAAAP/P/88AAAAAAAAAAAAA/5z/nAAAAAAAAAAAAAAAAAAAAAAAAAAA/tUAAAAAAAAAAAAAAAAAAAAAAAD/NwAA/4MAAAAAAAD+1f+cAAAAAAAAAAAAAAAA/88AAP+c/2oAAAAAAAAAAP+cAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/7QAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/z/9qAAAAAAAA/yX/4f/h/5wAAAAAAAAAAAAAAAAAAAAA/4cAAAAAAAD/sP+wAAD/4QAAAAAAAAAAAAAAAAAAAAAAAAAA/+EAAAAAAAAAAP/FAAD/gwAA/zcAAAAAAAAAAAAAAAAAAAAAAAD/EAAAAAAAAAAAAAAAAAAAAAAAAP+wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/hAAAAAP/h/8UAAAAAAAAAAP+H/4cAAAAAAAAAAAAAAAD/nAAAAAAAAAAA/8UAAAAAAAAAAAAAAAAAAP83AAAAAAAAAAAAAAAAAAD/nAAA/+EAAAAAAAAAAP+c/8X/xf/FAAD/4QAA/4cAAAAAAAAAAAAA/5z/4f+c/8UAAAAA/8UAAAAAAAAAAAAAAAD/sP/nAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/nAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/hAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/h/88AAAAA/+EAAP/hAAD/4QAAAAAAAAAAAAAAAAAA/+EAAAAAAAAAAAAA/8UAAAAAAAAAAP/hAAAAAAAAAAAAAAAA/+H/gwAAAAAAAAAA/+EAAAAAAAAAAP/hAAAAAAAAAAD/xf/h/+H/4QAA/+EAAP/hAAAAAAAAAAAAAP/h/+H/xf/hAAAAAAAAAAAAAAAAAAAAAP/h/+EAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/8UAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/Bv/F/2oAAP6DAAAAAP83AAAAAP+cAAD+gwAA/zcAAP9MAAD/nAAA/5z/nP+cAAAAAP+cAAAAAP+cAAAAAAAAAAD+1QAA/5z/nP+cAAAAAP+c/zf/nP7VAAAAAP8G/zcAAAAAAAD/4QAA/wYAAAAA/5z+1f8G/tUAAP8GAAD/nP8GAAAAAP8G/0z/nP+c/5z+1QAAAAD/4QAAAAAAAAAAAAD/nP/FAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/hAAAAAAAAAAAAAP+cAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/5wAAP/h/+EAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/hAAAAAP/FAAAAAAAAAAAAAP7V/wYAAAAAAAAAAAAAAAAAAAAA/0wAAAAAAAAAAP+w/7AAAAAAAAAAAAAAAAD/xQAAAAAAAAAAAAAAAAAAAAAAAAAA/tUAAP9qAAAAAAAAAAAAAAAAAAD/EAAAAAAAAAAAAAD/Bv/FAAAAAAAAAAAAAP/F/7AAAP/h/2oAAAAAAAAAAP/FAAAAAAAA/8UAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/nP/FAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP+cAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/5wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/h/+EAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/8UAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/8UAAAAAAAAAAAAA/2r/agAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/nAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/agAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP8GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/4QAAAAAAAAAAAAAAAP/hAAAAAAAA/2oAAAAAAAAAAAAAAAAAAP9qAAD/4QAA/4cAAAAAAAAAAAAAAAD/4QAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/5wAAAAAAAAAAAAAAAAAAAAAAAD/4QAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/+EAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/h/+EAAAAAAAAAAAAAAAAAAAAAAAD/xQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/8UAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/FAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP+w/4P/4QAAAAAAAP/F/4f/hwAAAAAAAAAAAAAAAAAAAAD/xf+wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/8UAAAAAAAAAAP/FAAAAAAAAAAD/NwAAAAAAAP/PAAAAAAAAAAAAAP+wAAAAAAAA/7AAAP+cAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/5wAA/2oAAAAAAAAAAAAAAAAAAAAAAAD/agAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/0wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/BgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/8UAAAAAAAAAAAAA/5z/xQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/nAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP+cAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/4QAAAAAAAAAAAAD/4QAAAAAAAAAAAAAAAP/FAAAAAAAAAAAAAAAAAAD/nAAA/4cAAAAAAAAAAAAAAAAAAAAAAAD/4QAAAAAAAAAAAAAAAP/PAAAAAAAAAAAAAP/hAAAAAAAAAAAAAAAA/+EAAAAAAAAAAAAAAAAAAAAAAAAAAP/P/8//zwAA/+EAAAAAAAAAAAAA/0wAAAAAAAAAAP/PAAAAAAAAAAAAAAAAAAAAAP8G/xv/nAAAAAD/TP/FAAAAAAAA/4cAAAAAAAAAAP/F/8X/xQAA/1IAAAAA/8X/nAAAAAAAAAAA/+EAAAAAAAAAAAAA/ucAAP9qAAAAAAAAAAAAAAAA/5z/JQAA/5wAAAAAAAD/Bv+c/+H/4f/hAAAAAP/F/8UAAP+c/0wAAAAA/0z/xf+c/+EAAAAA/8UAAAAAAAAAAAAA/8X/xQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/xQAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/nAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP+cAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/oAAAAAAAAAAA/2r/nP+cAAAAAAAAAAAAAP9qAAD/4QAA/4cAAAAAAAAAAAAAAAD/xf/hAAD/z//hAAAAAAAAAAAAAAAA/5wAAAAAAAAAAP9qAAAAAAAA/5wAAAAAAAAAAAAAAAAAAAAAAAD/xQAA/5wAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/5wAAAAAAAAAAAAAAAAAAP+HAAAAAAAAAAAAAP9q/2oAAAAAAAAAAP/hAAAAAAAAAAD/xQAAAAAAAAAAAAAAAAAA/5wAAAAA/+EAAAAAAAAAAAAAAAAAAAAAAAD/4QAA/wb/xQAAAAAAAAAAAAAAAP/hAAAAAAAA/+EAAAAAAAD+1QAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/88AAAAAAAAAAQAGAFoAJAA6AAAAAAAGAAcASgAvAB4ALwAeAAAAAAAAAAAAIgAAAAAAAAAAAAAAAAAAAAAADAAvAA0AAABJAE4ANAA+ABMAAAAOACsAAAAAABsAPAAfAAAAAABQABgAUAAgACQAQABHAAoACQAyADAAIwAGAAAABwAAAAAAAABGADgAQQAAAFEAEQBEACUAAAAAABYAAABMAEwAUQAoAEQALQA1AD0ATwBNAE0ALgBNACoABgAAAAcAAQAGAFoAIgAzAAAAAAAGAAIARQAsABMALAATAAAAAAAAAAAAHQAAAAAAAAAAAAAAAAAAAAAACgAsAAsAAABCAEYAAAA7AAAAAAAAAB8AAAAAABEAAAAAAAAAAABKAAAASgAAACIAOgBEAAgACQAlACoAGgAGAAAAAgAAAAAAAABAAAAAPQAkAEsADgA8AAAAAAAAAAAAAABHAEcASwAtADwAJwAxADYASQBIAEgAKwBIACgABgAAAAIAAgAOAAYABwAAAAoAEAACABUAFQAJAB4AIAAKACIAJgANACgAKQASACwALgAUADEAPQAXAD8APwAkAEMARQAlAEcASgAoAE0ATQAsAE8AXQAtAF8AXwA8AAAAAAABAAAAANkPso4AAAAA1KKUmQAAAADaahJiAlYAPwAAAAAB7QAAAlYAPwJWAD8CVgA/AlYAPwJWAD8CVgA/AlYAPwJWAD8CVgA/AlYAPwJWAD8CsgBGAlYAPwIOAFoCVgA/BawAWgNjACgFFgBuBT8AWgJWAD8FbgCCBXsAbgS7AFoFSgBaBXsAbgIOAFoCbP/2AlYAPwJWAD8CVgA/BMIARgJWAD8GPAAoBdQAggXtAFoGBwCCBSQAggUaAIIGHwBaBg8AggJlAIwE5gBGBd0AggTjAIIHbgCCBiUAggbEAFoFsgCCBsQAWgWgAIIFTABGBZEARgYBAIIGFAAoCCgAKAYsACgF9AAoBVsAbgJWAD8CVgA/AlYAPwJWAD8CVgA/AlYAPwS+AEYFXABuBJUARgVcAEYE8QBGA60AMgVcAEYFEABuAjQAbgJE/0IE8ABuAnMAbgdAAG4FEABuBUgARgVcAG4FXABGA9IAbgQ8ADIDwQAyBRAAbgTAABQGgAAUBMwAFATAABQEUQBaAlYAPwA/AD8APwAA",X="T1RUTwANAIAAAwBQQ0ZGIIEr53UAAAnwAAAkBEZGVE2IHFm8AABnXAAAABxHREVGACcAZwAALfQAAAAeR1BPUyNYlR8AAC8sAAA4LkdTVUKHXJIrAAAuFAAAARZPUy8yXlhbsgAAAUAAAABgY21hcLUchzAAAAiEAAABSmhlYWQVV/HgAAAA3AAAADZoaGVhDv4GcQAAARQAAAAkaG10eIYaIRcAAGd4AAABfm1heHAAYVAAAAABOAAAAAZuYW1lCyMAMgAAAaAAAAbhcG9zdP9pAGYAAAnQAAAAIAABAAAAAQHK0LphRF8PPPUACwgAAAAAANSilMAAAAAA2moSbf9C/ewH6gYAAAAACAACAAAAAAAAAAEAAAXs/ewB5Agm/0IAAAfqAAEAAAAAAAAAAAAAAAAAAABeAABQAABhAAAABAQmAlgABQAEBZoFMwAAAR8FmgUzAAAD0QBmAgAAAAAAAAAAAAAAAACgAAL/QADh+wAAAAQAAAAAQVJURQBAACAAfgXs/ewB5AfQAhQgAAGfAAAAAAP+BZoAIAAgAAMAAAAfAXoAAQAAAAAAAAAzAAAAAQAAAAAAAQAZADMAAQAAAAAAAgAHAEwAAQAAAAAAAwBFAFMAAQAAAAAABAAhAJgAAQAAAAAABQANALkAAQAAAAAABgApAMYAAQAAAAAABwAwAO8AAQAAAAAACAAHAR8AAQAAAAAACQAOASYAAQAAAAAACgAzATQAAQAAAAAACwAaAWcAAQAAAAAADAAaAYEAAQAAAAAAEAAMAZsAAQAAAAAAEQAIAacAAwABBAkAAABmAa8AAwABBAkAAQAyAhUAAwABBAkAAgAOAkcAAwABBAkAAwCKAlUAAwABBAkABABCAt8AAwABBAkABQAaAyEAAwABBAkABgBSAzsAAwABBAkABwBgA40AAwABBAkACAAOA+0AAwABBAkACQAcA/sAAwABBAkACgBmBBcAAwABBAkACwA0BH0AAwABBAkADAA0BLEAAwABBAkAEABOBOUAAwABBAkAEQAOBTMAAwABBAkD5wAmBUFDb3B5cmlnaHQgKGMpIDIwMTcgYnkgQXJ0ZWdyYS4gQWxsIHJpZ2h0cyByZXNlcnZlZC5GU1AgREVNTyAtIHJ0Z3IgU25zIFNtQmxkUmVndWxhckZPTlRTUFJJTkcgREVNTzpWZXJzaW9uIDEuMDA3O0FSVEU7QXJ0ZWdyYVNhbnMtU2VtaUJvbGQ7MjAxNztGTFZJLTcwMUZTUCBERU1PIC0gcnRnciBTbnMgU21CbGQgUmVndWxhclZlcnNpb24gMS4wMDdGT05UU1BSSU5HREVNTy1BcnRlZ3JhU2Fuc1NlbWlCb2xkUmVndWxhckFydGVncmEgU2FucyBTZW1pQm9sZCBpcyBhIHRyYWRlbWFyayBvZiBBcnRlZ3JhLkFydGVncmFDZXlodW4gQmlyaW5jaUNvcHlyaWdodCAoYykgMjAxNyBieSBBcnRlZ3JhLiBBbGwgcmlnaHRzIHJlc2VydmVkLmh0dHA6Ly93d3cuYXJ0ZWdyYXR5cGUuY29taHR0cDovL3d3dy5hcnRlZ3JhdHlwZS5jb21BcnRlZ3JhIFNhbnNTZW1pQm9sZABDAG8AcAB5AHIAaQBnAGgAdAAgACgAYwApACAAMgAwADEANwAgAGIAeQAgAEEAcgB0AGUAZwByAGEALgAgAEEAbABsACAAcgBpAGcAaAB0AHMAIAByAGUAcwBlAHIAdgBlAGQALgBGAFMAUAAgAEQARQBNAE8AIAAtACAAcgB0AGcAcgAgAFMAbgBzACAAUwBtAEIAbABkAFIAZQBnAHUAbABhAHIARgBPAE4AVABTAFAAUgBJAE4ARwAgAEQARQBNAE8AOgBWAGUAcgBzAGkAbwBuACAAMQAuADAAMAA3ADsAQQBSAFQARQA7AEEAcgB0AGUAZwByAGEAUwBhAG4AcwAtAFMAZQBtAGkAQgBvAGwAZAA7ADIAMAAxADcAOwBGAEwAVgBJAC0ANwAwADEARgBTAFAAIABEAEUATQBPACAALQAgAHIAdABnAHIAIABTAG4AcwAgAFMAbQBCAGwAZAAgAFIAZQBnAHUAbABhAHIAVgBlAHIAcwBpAG8AbgAgADEALgAwADAANwBGAE8ATgBUAFMAUABSAEkATgBHAEQARQBNAE8ALQBBAHIAdABlAGcAcgBhAFMAYQBuAHMAUwBlAG0AaQBCAG8AbABkAFIAZQBnAHUAbABhAHIAQQByAHQAZQBnAHIAYQAgAFMAYQBuAHMAIABTAGUAbQBpAEIAbwBsAGQAIABpAHMAIABhACAAdAByAGEAZABlAG0AYQByAGsAIABvAGYAIABBAHIAdABlAGcAcgBhAC4A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AAAAAQAMAAEAFf/nAAEAAQAhAAIyNAAEAAAwwDF6AFIATAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/xf+c/4cAAAAAAAD/N//h/+EAAAAAAAAAAAAAAAAAAP+H/+f/hwAAAAAAAAAAAAAAAP+cAAAAAAAAAAAAAP/FAAAAAAAAAAD/nAAAAAAAAAAA/8UAAAAAAAD/HwAAAAAAAAAAAAD/4QAAAAAAAP9qAAD/4QAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/nAAAAAAAAAAAAAAAAAAA/8UAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/FAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/xQAAAAAAAAAAAAD/nP/FAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP9qAAD/5wAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/4QAA/5wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/4f+D/+EAAAAAAAD/sP/F/8UAAAAAAAAAAAAAAAAAAAAA/8//xQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/hAAAAAAAAAAAAAAAAAAAAAAAA/4cAAAAAAAD/zwAAAAAAAAAAAAD/4QAAAAAAAP+wAAD/hwAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/4QAAAAAAAAAAAAAAAAAAAAD/nAAAAAAAAP9q/+H/4QAAAAAAAAAAAAAAAAAAAAAAAP+HAAAAAAAA/+H/4QAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/xQAAAAAAAP+DAAAAAAAAAAAAAAAAAAAAAAAA/5wAAAAAAAAAAAAAAAAAAAAAAAD/4QAAAAAAAP+cAAAAAAAAAAAAAAAAAAAAAP/P/83/xf+c/88AAAAA/2oAAAAA/5z/xf+cAAAAAP/P/8UAAP/FAAD/g/+D/8UAAAAA/88AAAAA/6AAAAAA/88AAP+HAAD/xf/F/8UAAAAA/+H/NwAAAAAAAAAA/+H/xQAA/88AAP/FAAD/xQAAAAD/nAAA/4f/hwAA/8UAAP+DAAAAAAAAAAD/xf/h/8X/nP+HAAAAAP+cAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/tAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/4QAAAAAAAP/h/+H/4QAAAAAAAAAAAAAAAAAAAAAAAP/hAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/xQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/+EAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/+EAAP8lAAAAAAAA/qIAAAAAAAAAAP/hAAD/4f6i/+H/Jf/h/0z/4QAA/+H/h/+H/8UAAAAA/8UAAAAA/5z/xf/h/8X/4f9qAAAAAP/F/8X/4QAA/8X/g//F/zf/4QAA/2oAAAAA/+EAAP/hAAD/Bv/hAAD/nP9q/2r/av/h/2r/4f+HAAAAAAAA/xv/xf/F/8X/nP9qAAD/4QAA/yX/4QAAAAD+ogAAAAD/agAA/+H/4QAA/qL/4f83/+H/TP/h/8X/4f9q/4f/xQAAAAD/xQAAAAD/nP/F/+H/4f/h/2oAAP/F/8X/xf/hAAD/nP9q/8X/Bv/hAAD/df/FAAD/4QAAAAAAAP7V/+EAAP+c/2r/h/+H/+H/h//h/4cAAAAAAAD/Bv/F/8X/xf+c/2oAAAAAAAAAAAAAAAAAAAAA/+H/4QAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/7D/sAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/xQAA/4MAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/sAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/wYAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/zwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP9qAAAAAAAAAAAAAP9qAAAAAP8GAAAAAAAA/2oAAAAAAAD/zwAAAAAAAAAAAAAAAP+cAAAAAP+cAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/wYAAAAAAAAAAAAAAAAAAAAAAAD/nAAAAAAAAAAAAAD/NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/nAAAAAAAAAAAAAAAAAAAAAD/nAAAAAAAAP7nAAAAAAAAAAAAAAAAAAAAAAAA/5wAAP9MAAAAAAAA/+H/4QAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP83AAAAAAAAAAAAAAAAAAAAAAAA/5wAAAAAAAAAAAAAAAAAAAAAAAD/4QAAAAAAAP+cAAAAAAAAAAAAAAAAAAAAAAAA/5z/TAAAAAAAAAAAAAAAAAAA/7T/4QAAAAAAAAAA/tUAAP+cAAAAAAAAAAAAAAAAAAD/4QAAAAAAAAAAAAAAAP83AAAAAAAA/5wAAAAA/5z/UgAA/qIAAAAA/0z/dQAAAAAAAP/hAAAAAAAAAAD/nP83/zcAAAAA/2oAAAAAAAAAAAAA/sH/nP/h/5z/nP83AAAAAP+cAAAAAAAAAAAAAP/FAAAAAAAAAAAAAAAAAAAAAAAAAAD/NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/agAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/xQAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/TAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/PAAAAAAAAAAAAAAAAAAAAAP+HAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/4QAAAAAAAAAAAAAAAP/hAAAAAAAAAAAAAP/hAAAAAAAAAAAAAAAAAAAAAAAAAAD/4f/h/+EAAP/hAAAAAAAAAAAAAP+cAAAAAAAAAAD/4QAAAAD/nAAAAAAAAAAAAAD/nP+cAAAAAAAAAAAAAAAAAAD/xQAAAAAAAAAAAAAAAAAAAAD/xQAAAAD/zwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP9qAAAAAAAA/5wAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/2oAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/5wAAAAAAAAAAAAAAAD/4f+oAAAAAAAAAAD/av+c/7AAAAAAAAAAAAAA/2oAAP/hAAD/hwAAAAAAAAAAAAAAAP/hAAAAAP/hAAAAAP/hAAAAAAAAAAD/nAAAAAAAAAAA/2r/4QAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/FAAD/4QAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/nAAAAAAAAAAAAAAAAAAA/8//agAAAAAAAP8G/+H/4QAAAAAAAAAAAAAAAAAA/2oAAP+HAAAAAAAA/+H/4QAA/+EAAAAAAAAAAAAAAAAAAAAAAAAAAP/hAAAAAAAAAAD/xQAA/2oAAP9qAAAAAAAAAAAAAAAAAAAAAAAA/0wAAAAAAAAAAAAAAAAAAAAAAAD/xQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/4f/hAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/nP+cAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/FAAD/agAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP+cAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/8UAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/+EAAAAAAAAAAAAA/5wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/+H/4QAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/+EAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/j0AAP9qAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP+cAAAAAAAAAAD/agAAAAAAAAAAAAAAAAAA/5wAAAAAAAAAAP9qAAAAAAAAAAD/4QAAAAAAAAAA/5z/av+cAAAAAP9qAAAAAAAAAAAAAP7V/8X/4QAA/5z/agAAAAD/nP9qAAAAAAAA/tX/nP+wAAAAAAAAAAAAAP7VAAD/TAAA/0wAAAAAAAD/4f/hAAD/xQAAAAD/4QAAAAD/4QAAAAAAAP/h/2oAAAAA/+EAAP+c/+H/zwAA/tUAAAAA/+EAAAAAAAAAAAAAAAD/agAAAAAAAP/h/+H/4QAA/+EAAP/hAAAAAAAA/0wAAAAAAAAAAP/hAAAAAAAAAAD/4f83AAAAAAAAAAAAAAAAAAD/agAAAAAAAP6YAAD+1QAA/5wAAAAAAAAAAAAAAAAAAAAAAAD/4QAAAAAAAAAA/5wAAP83/5z/nAAAAAD/nP8G/5z/BgAAAAD/nP+cAAAAAAAAAAAAAAAAAAAAAP/h/5z/nAAAAAD/nAAAAAAAAAAAAAD/N/+c/5z/nP/h/5wAAAAA/5wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP83AAAAAAAAAAAAAAAAAAAAAAAAAAD/4QAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP83AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/hAAAAAAAAAAAAAP9qAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/5wAAAAAAAAAAAAAAAAAAP+cAAD/4QAA/8UAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/4QAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/8UAAAAAAAAAAAAAAAAAAP/FAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/8//4QAAAAAAAAAA/+H/4QAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/xQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/hAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/xQAAAAAAAP+0AAD/TP9M/88AAAAA/zf/xQAAAAAAAP+HAAAAAAAAAAD/sP+w/8UAAAAAAAD/xf+c/4cAAAAAAAAAAP/FAAAAAAAAAAAAAP9MAAD/nAAAAAAAAAAAAAAAAAAA/4cAAP9MAAAAAAAA/0z/h//F/8X/xQAA/+H/xQAAAAD/hwAAAAAAAP+H/8X/h//FAAAAAP/PAAAAAAAAAAAAAP8G/zcAAAAAAAD/nP+wAAAAAAAA/wYAAAAAAAAAAP/h/+EAAAAA/nEAAAAAAAD/4QAAAAAAAAAAAAAAAAAAAAAAAAAA/pgAAP83AAAAAAAAAAAAAAAAAAD/TP7V/7AAAAAAAAD+ov/hAAAAAAAAAAAAAP/F/+EAAP/h/wYAAAAA/5wAAP/hAAAAAAAA/7T/4QAAAAAAAAAA/5z/sAAAAAAAAAAAAAAAAAAA/+EAAAAAAAAAAAAA/+H/4QAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/4QAAAAAAAAAAAAD/nAAA/88AAAAAAAAAAP/hAAAAAAAAAAAAAAAAAAAAAAAAAAD/4f/h/+EAAP/hAAD/4QAAAAAAAAAAAAAAAAAAAAD/4QAAAAD/zwAAAAAAAAAAAAD/xf/FAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP+HAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/8UAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP+wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/xQAAAAAAAAAAAAAAAAAAAAAAAP/hAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/+EAAP/PAAAAAAAAAAAAAP/hAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/5wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP+DAAAAAP/hAAAAAAAAAAD/4QAAAAAAAAAA/+H/4QAAAAAAAAAAAAAAAP/FAAAAAAAAAAD/xQAAAAAAAAAAAAAAAAAA/2oAAAAAAAAAAAAAAAAAAP/hAAAAAAAAAAAAAAAA/8X/xf/FAAAAAP/hAAD/4QAAAAAAAAAAAAD/4QAA/8X/xQAAAAD/zwAAAAAAAAAAAAAAAP/hAAAAAAAAAAAAAP/FAAAAAAAA/8UAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/+EAAAAAAAAAAAAAAAAAAAAA/+EAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/hAAAAAAAAAAAAAP/FAAAAAAAAAAAAAP+c/2oAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/5wAAAAA/8UAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/nAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/+EAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/+H/4QAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/xQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/zwAAAAAAAAAAAAD/nP/FAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP+cAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/8UAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP+HAAAAAAAAAAAAAP9q/2oAAAAAAAAAAP/hAAAAAAAAAAD/xQAAAAAAAAAAAAAAAAAAAAAAAP/h/+EAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/wb/4QAAAAAAAAAAAAAAAAAAAAAAAAAA/+EAAAAAAAD+1QAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/4QAA/+EAAAAAAAAAAAAA/8UAAAAAAAAAAAAA/+EAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/xQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP83AAD/xf/FAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/xQAAAAD/xQAAAAAAAAAAAAAAAP/FAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/hAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/h/+EAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/hAAAAAAAAAAAAAAAAAAAAAAAA/+EAAAAAAAAAAAAA/8UAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/8X/xQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/+H/4QAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/nAAA/88AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/FAAAAAAAAAAAAAAAAAAD/4QAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/4QAAAAAAAAAAAAD/xf/hAAAAAAAAAAAAAAAAAAD/TAAA/wYAAAAAAAAAAAAAAAAAAAAAAAD/4QAAAAAAAAAAAAAAAP/hAAAAAAAAAAAAAP/FAAAAAAAA/5wAAAAA/+EAAAAAAAAAAAAAAAAAAAAA/5wAAP/h/+EAAAAA/+EAAAAAAAAAAAAA/5wAAAAAAAAAAP/FAAAAAP/hAAAAAAAAAAAAAAAA/8UAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/8UAAAAAAAAAAAAA/8UAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/4QAA/8X/xf/FAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/8UAAP+D/zf/Uv+c/+cAAP83/2r/gwAA/88AAAAAAAD/HwAA/5z/av+cAAAAAAAAAAAAAAAA/2r/zwAA/4P/agAA/2oAAP/nAAAAAP83AAAAAAAAAAD/BgAAAAAAAP+DAAAAAAAAAAD/tP+DAAAAAP9q/2oAAP83AAAAAAAAAAAAAP/PAAAAAAAAAAAAAP9qAAAAAAAAAAAAAAAA/8UAAP8GAAAAAAAA/oMAAAAA/wYAAP/FAAD/4f6D/8X/Bv/F/0z/xf+c/8X/N/83/5wAAAAA/4f/8gAA/2r/xf/F/8X/xf8GAAAAAP+c/8X/xQAA/2r/Bv+c/tX/xf/F/yX/dQAA/8UAAP/hAAD+1f/FAAD/av8G/wb/Bv/F/zf/xf83AAAAAAAA/uf/df+c/5z/av8GAAAAAAAAAAAAAAAAAAAAAP83/zcAAAAAAAAAAAAAAAAAAAAA/0wAAAAAAAAAAP/F/8UAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/ucAAP83AAAAAAAAAAAAAAAAAAD/TAAAAAAAAAAAAAD/BgAAAAAAAAAAAAAAAP/F/8UAAP/h/2oAAAAAAAAAAP/hAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP+c/+EAAAAA/+H/4QAAAAAAAAAA/8X/xQAAAAAAAAAAAAAAAP+cAAAAAP/yAAAAAAAAAAAAAAAAAAAAAAAA/zcAAAAAAAAAAAAAAAAAAP/hAAAAAAAAAAAAAP/y/5wAAAAAAAAAAAAAAAD/xQAA/+EAAAAAAAAAAAAA/5wAAAAAAAAAAAAAAAAAAAAAAAD/4f/hAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/hAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/+EAAAAAAAD/xf/h/8UAAAAAAAAAAAAA/4cAAP/hAAD/xQAAAAAAAAAAAAAAAP/hAAAAAP/hAAAAAAAAAAAAAAAAAAD/4QAAAAAAAAAA/8X/4f/PAAAAAAAAAAAAAP/hAAAAAAAAAAAAAP/hAAD/4QAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/4QAAAAAAAAAAAAAAAAAA/8UAAAAAAAAAAAAA/5z/nAAAAAAAAAAAAAAAAAAAAAAAAP/FAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/agAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP8GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/xf/FAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/xf/FAAAAAAAAAAAAAAAAAAD/4QAAAAAAAAAAAAAAAAAAAAAAAP/FAAD/nAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/FAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP+cAAAAAAAAAAAAAP+cAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/3UAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/4cAAAAAAAAAAAAA/2r/agAAAAAAAAAA/+EAAAAAAAAAAP/FAAAAAAAAAAAAAAAAAAD/nAAA/+H/4QAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/N//hAAAAAAAAAAAAAAAAAAAAAAAAAAD/4QAAAAAAAP7VAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/4QAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/Bv83AAAAAAAA/2oAAAAAAAAAAP9qAAAAAAAAAAD/z//PAAAAAAAAAAAAAP+c/5wAAAAAAAAAAAAAAAAAAAAAAAAAAP7VAAAAAAAAAAAAAAAAAAAAAAAA/zcAAP+DAAAAAAAA/tX/nAAAAAAAAAAAAAAAAP/PAAD/nP9qAAAAAAAAAAD/nAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP+0AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/8//agAAAAAAAP8l/+H/4f+cAAAAAAAAAAAAAAAAAAAAAP+HAAAAAAAA/7D/sAAA/+EAAAAAAAAAAAAAAAAAAAAAAAAAAP/hAAAAAAAAAAD/xQAA/4MAAP83AAAAAAAAAAAAAAAAAAAAAAAA/xAAAAAAAAAAAAAAAAAAAAAAAAD/sAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/4QAAAAD/4f/FAAAAAAAAAAD/h/+HAAAAAAAAAAAAAAAA/5wAAAAAAAAAAP/FAAAAAAAAAAAAAAAAAAD/NwAAAAAAAAAAAAAAAAAA/5wAAP/hAAAAAAAAAAD/nP/F/8X/xQAA/+EAAP+HAAAAAAAAAAAAAP+c/+H/nP/FAAAAAP/FAAAAAAAAAAAAAAAA/7D/5wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/5wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/4QAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/4f/PAAAAAP/hAAD/4QAA/+EAAAAAAAAAAAAAAAAAAP/hAAAAAAAAAAAAAP/FAAAAAAAAAAD/4QAAAAAAAAAAAAAAAP/h/4MAAAAAAAAAAP/hAAAAAAAAAAD/4QAAAAAAAAAA/8X/4f/h/+EAAP/hAAD/4QAAAAAAAAAAAAD/4f/h/8X/4QAAAAAAAAAAAAAAAAAAAAD/4f/hAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/FAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/wb/xf9qAAD+gwAAAAD/NwAAAAD/nAAA/oMAAP83AAD/TAAA/5wAAP+c/5z/nAAAAAD/nAAAAAD/nAAAAAAAAAAA/tUAAP+c/5z/nAAAAAD/nP83/5z+1QAAAAD/Bv83AAAAAAAA/+EAAP8GAAAAAP+c/tX/Bv7VAAD/BgAA/5z/BgAAAAD/Bv9M/5z/nP+c/tUAAAAA/+EAAAAAAAAAAAAA/5z/xQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/4QAAAAAAAAAAAAD/nAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP+cAAD/4f/hAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/4QAAAAD/xQAAAAAAAAAAAAD+1f8GAAAAAAAAAAAAAAAAAAAAAP9MAAAAAAAAAAD/sP+wAAAAAAAAAAAAAAAA/8UAAAAAAAAAAAAAAAAAAAAAAAAAAP7VAAD/agAAAAAAAAAAAAAAAAAA/xAAAAAAAAAAAAAA/wb/xQAAAAAAAAAAAAD/xf+wAAD/4f9qAAAAAAAAAAD/xQAAAAAAAP/FAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/5z/xQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/nAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP+cAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/4f/hAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/FAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/FAAAAAAAAAAAAAP9q/2oAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/5wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/2oAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/BgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/+EAAAAAAAAAAAAAAAD/4QAAAAAAAP9qAAAAAAAAAAAAAAAAAAD/agAA/+EAAP+HAAAAAAAAAAAAAAAA/+EAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP+cAAAAAAAAAAAAAAAAAAAAAAAA/+EAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/hAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/4f/hAAAAAAAAAAAAAAAAAAAAAAAA/8UAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/FAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/xQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/sP+D/+EAAAAAAAD/xf+H/4cAAAAAAAAAAAAAAAAAAAAA/8X/sAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/FAAAAAAAAAAD/xQAAAAAAAAAA/zcAAAAAAAD/zwAAAAAAAAAAAAD/sAAAAAAAAP+wAAD/nAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/zcAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/+cAAP9qAAAAAAAAAAAAAAAAAAAAAAAA/2oAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP9MAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/wYAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/FAAAAAAAAAAAAAP+c/8UAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/5wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA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",S={whatsapp:"3517897667",website:"XIGNUX.COM.AR",labelWidthMM:105,thumbSize:180,thumbQuality:.85},yA=`<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Generando Etiqueta...</title>
    <style>
        body {
            margin: 0;
            height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background: #0f172a;
            color: #f8fafc;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        .spinner {
            width: 48px;
            height: 48px;
            border: 4px solid rgba(255,255,255,0.15);
            border-top-color: #0d9488;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
            margin-bottom: 18px;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        h2 { font-size: 19px; font-weight: 700; margin: 0 0 6px 0; }
        p { font-size: 13px; color: #94a3b8; margin: 0; }
    </style>
</head>
<body>
    <div class="spinner"></div>
    <h2>🏷️ Armando Etiqueta de Producción</h2>
    <p>Preparando documento de impresión...</p>
</body>
</html>`;function Z(A){const e=(A.split(/[/\\]/).pop()||A).replace(/\.[^./\\]+$/,"");try{return decodeURIComponent(e)}catch{return e}}function HA(A,o,e){if(!A&&!o)return"";const i=A?A<20?Math.round(A*100):Math.round(A):0,r=o?o<20?Math.round(o*100):Math.round(o):0;let g="";return i>0&&r>0?g=`${i} x ${r} cm`:i>0?g=`${i} cm`:r>0&&(g=`${r} cm`),g&&e&&e>1&&(g+=` (x${e})`),g}function $(){const A=new Date,o=String(A.getDate()).padStart(2,"0"),e=String(A.getMonth()+1).padStart(2,"0"),i=A.getFullYear();return`${o}/${e}/${i}`}function IA(A){var o;for(const e of A){const i=(e.loteNombre||"").trim();if(i&&!i.toLowerCase().startsWith("lote ")&&!i.toLowerCase().startsWith("lote_"))return i}for(const e of A){const i=(e.nombreTarea||"").trim();if(!i)continue;if(i.includes(" - ")){const l=i.split(" - ")[0].trim();if(l)return l}let r=i;if((o=e.archivosOriginales)!=null&&o.length)for(const g of e.archivosOriginales){const l=g.replace(/\.[^/.]+$/,"").trim();l&&r.toLowerCase().includes(l.toLowerCase())&&(r=r.replace(new RegExp(l,"gi"),"").trim(),r=r.replace(/^[\s\-–—:]+|[\s\-–—:]+$/g,"").trim())}if(r)return r}return""}function T(A){return(A||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}const LA=`
    @font-face {
        font-family: 'Artegra Sans';
        src: url(data:font/opentype;charset=utf-8;base64,${Y}) format('opentype');
        font-weight: 700;
        font-style: normal;
        unicode-range: U+0020, U+002C, U+002E, U+0030-0033, U+0035-0039, U+003A-003B, U+003F, U+0041-005A, U+0061-007A;
    }
    @font-face {
        font-family: 'Artegra Sans';
        src: url(data:font/opentype;charset=utf-8;base64,${Y}) format('opentype');
        font-weight: 800;
        font-style: normal;
        unicode-range: U+0020, U+002C, U+002E, U+0030-0033, U+0035-0039, U+003A-003B, U+003F, U+0041-005A, U+0061-007A;
    }
    @font-face {
        font-family: 'Artegra Sans';
        src: url(data:font/opentype;charset=utf-8;base64,${Y}) format('opentype');
        font-weight: 900;
        font-style: normal;
        unicode-range: U+0020, U+002C, U+002E, U+0030-0033, U+0035-0039, U+003A-003B, U+003F, U+0041-005A, U+0061-007A;
    }
    @font-face {
        font-family: 'Artegra Sans';
        src: url(data:font/opentype;charset=utf-8;base64,${X}) format('opentype');
        font-weight: 600;
        font-style: normal;
        unicode-range: U+0020, U+002C, U+002E, U+0030-0033, U+0035-0039, U+003A-003B, U+003F, U+0041-005A, U+0061-007A;
    }
    @font-face {
        font-family: 'Artegra Sans';
        src: url(data:font/opentype;charset=utf-8;base64,${X}) format('opentype');
        font-weight: 400;
        font-style: normal;
        unicode-range: U+0020, U+002C, U+002E, U+0030-0033, U+0035-0039, U+003A-003B, U+003F, U+0041-005A, U+0061-007A;
    }
    @font-face {
        font-family: 'Artegra Sans';
        src: url(data:font/opentype;charset=utf-8;base64,${X}) format('opentype');
        font-weight: 500;
        font-style: normal;
        unicode-range: U+0020, U+002C, U+002E, U+0030-0033, U+0035-0039, U+003A-003B, U+003F, U+0041-005A, U+0061-007A;
    }

    @page {
        size: ${S.labelWidthMM}mm 297mm;
        margin: 0;
    }

    * {
        box-sizing: border-box;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
    }

    html, body {
        margin: 0;
        padding: 0;
        background: #cbd5e1;
        color: #0f172a;
        font-family: 'Artegra Sans', sans-serif;
        font-weight: 600;
        font-size: 13px;
        line-height: 1.35;
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        align-items: center;
    }

    .no-print-bar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: #0f172a;
        color: #fff;
        padding: 12px 18px;
        width: ${S.labelWidthMM}mm;
        max-width: ${S.labelWidthMM}mm;
        box-sizing: border-box;
        margin: 14px auto 8px auto;
        border-radius: 8px;
        box-shadow: 0 4px 16px rgba(0,0,0,0.3);
    }
    .no-print-bar .title {
        font-family: 'Artegra Sans', sans-serif;
        font-weight: 700;
        font-size: 14px;
        letter-spacing: 0.5px;
        display: flex;
        align-items: center;
        gap: 8px;
    }
    .btn-print {
        background: #0d9488;
        color: #fff;
        border: none;
        padding: 9px 22px;
        border-radius: 6px;
        cursor: pointer;
        font-family: 'Artegra Sans', sans-serif;
        font-weight: 700;
        font-size: 14px;
        letter-spacing: 0.5px;
        box-shadow: 0 2px 8px rgba(13,148,136,0.5);
        transition: background 0.15s, transform 0.1s;
    }
    .btn-print:hover { background: #0f766e; }
    .btn-print:active { transform: scale(0.97); }

    @media print {
        .no-print-bar { display: none !important; }
        html, body {
            background: #fff !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            display: block !important;
        }
        .label-page {
            box-shadow: none !important;
            margin: 0 auto !important;
            border: 2px solid #0f172a !important;
            width: ${S.labelWidthMM}mm !important;
            max-width: ${S.labelWidthMM}mm !important;
            min-width: ${S.labelWidthMM}mm !important;
            box-sizing: border-box !important;
            padding: 6mm 5mm !important;
            page-break-inside: auto;
        }
    }

    .label-page {
        width: ${S.labelWidthMM}mm;
        max-width: ${S.labelWidthMM}mm;
        min-width: ${S.labelWidthMM}mm;
        box-sizing: border-box;
        margin: 10px auto 40px auto;
        background: #fff;
        border: 2.5px solid #0f172a;
        border-radius: 8px;
        box-shadow: 0 8px 30px rgba(0,0,0,0.15);
        padding: 18px 16px;
    }

    /* Logo prominente y de impacto */
    .label-logo {
        text-align: center;
        padding: 6px 0 12px 0;
    }
    .label-logo img {
        width: 240px;
        max-width: 95%;
        height: auto;
        object-fit: contain;
        display: block;
        margin: 0 auto;
    }

    /* Separadores punteados de estilo técnico */
    .dotted-divider {
        border-top: 2.5px dotted #0f172a;
        margin: 14px 0;
    }

    /* Bloque Destacado de Proyecto / Fecha */
    .label-project-block {
        background: #f8fafc;
        border: 2px solid #0f172a;
        border-radius: 8px;
        padding: 12px 14px;
        text-align: center;
    }
    .label-project-block .project-title {
        font-family: 'Artegra Sans', sans-serif;
        font-size: 19px;
        font-weight: 700;
        color: #0f172a;
        margin: 0 0 6px 0;
        line-height: 1.25;
        letter-spacing: 0.3px;
        word-break: break-word;
        text-transform: uppercase;
    }
    .label-project-block .project-meta {
        font-family: 'Artegra Sans', sans-serif;
        font-weight: 600;
        font-size: 12.5px;
        color: #475569;
    }
    .label-project-block .label-material {
        background: #0f172a;
        color: #fff;
        padding: 4px 10px;
        border-radius: 4px;
        font-family: 'Artegra Sans', sans-serif;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.8px;
        text-transform: uppercase;
        margin-top: 8px;
        display: inline-block;
    }

    /* Secciones (Destinatario, Dirección) */
    .label-section {
        margin: 12px 0;
        text-align: center;
    }
    .label-section-header {
        font-family: 'Artegra Sans', sans-serif;
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 2px;
        color: #64748b;
        margin: 0 0 4px 0;
        text-align: center;
    }
    .label-section-value {
        font-family: 'Artegra Sans', sans-serif;
        font-size: 24px;
        font-weight: 700;
        color: #000000;
        margin: 0;
        line-height: 1.2;
        letter-spacing: 0.5px;
        word-break: break-word;
        text-transform: uppercase;
        text-align: center;
    }
    .label-section-address {
        font-family: 'Artegra Sans', sans-serif;
        font-size: 15px;
        font-weight: 600;
        color: #1e293b;
        margin: 0;
        line-height: 1.35;
        word-break: break-word;
        text-align: center;
    }

    /* Detalle de Archivos */
    .detail-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin: 14px 0 10px 0;
    }
    .detail-title {
        font-family: 'Artegra Sans', sans-serif;
        font-size: 12px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 2px;
        color: #0f172a;
        margin: 0;
    }
    .detail-count {
        font-family: 'Artegra Sans', sans-serif;
        font-size: 11.5px;
        font-weight: 700;
        background: #0f172a;
        color: #fff;
        padding: 2px 8px;
        border-radius: 12px;
    }

    /* Grilla de Miniaturas */
    .thumbs-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 10px;
    }
    .thumb-card {
        border: 2px solid #e2e8f0;
        border-radius: 8px;
        padding: 8px;
        background: #fff;
        break-inside: avoid;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        box-shadow: 0 2px 6px rgba(0,0,0,0.04);
    }
    .thumb-card .img-container {
        width: 100%;
        height: 115px;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        margin-bottom: 6px;
    }
    .thumb-card img {
        max-width: 100%;
        max-height: 100%;
        width: auto;
        height: auto;
        object-fit: contain;
        display: block;
    }
    .thumb-no-img {
        font-size: 26px;
        color: #94a3b8;
    }
    .thumb-card .thumb-name {
        font-family: 'Artegra Sans', sans-serif;
        font-size: 11.5px;
        font-weight: 700;
        color: #0f172a;
        margin: 0 0 4px 0;
        word-break: break-word;
        line-height: 1.25;
        letter-spacing: -0.2px;
    }
    .thumb-card .thumb-dims-badge {
        font-family: 'Artegra Sans', sans-serif;
        font-size: 11px;
        font-weight: 700;
        background: #0f172a;
        color: #ffffff;
        padding: 3px 8px;
        border-radius: 4px;
        display: inline-block;
        letter-spacing: 0.3px;
        white-space: nowrap;
    }

    /* Footer de Alto Impacto */
    .label-footer {
        margin-top: 18px;
        padding: 12px 0 4px 0;
        border-top: 3px solid #0f172a;
        text-align: center;
    }
    .label-footer .footer-whatsapp {
        font-family: 'Artegra Sans', sans-serif;
        font-size: 17px;
        font-weight: 700;
        color: #15803d;
        margin: 0 0 3px 0;
        letter-spacing: 0.5px;
    }
    .label-footer .footer-web {
        font-family: 'Artegra Sans', sans-serif;
        font-size: 14px;
        font-weight: 700;
        color: #0f172a;
        letter-spacing: 2px;
        margin: 0;
    }
`;async function KA(A){var e,i,r;if(!A||A.length===0)return;const o=window.open("","_blank","width=580,height=880");if(!o){alert("Por favor permite las ventanas emergentes (popups) para abrir la etiqueta de impresión.");return}o.document.open(),o.document.write(yA);try{const g=A[0],l=IA(A),p=(g.clienteNombre||g.clientName||"").trim();let Q="";try{const B=tA().find(d=>g.clientId&&d.id===g.clientId||p&&d.nombre.trim().toLowerCase()===p.toLowerCase());(e=B==null?void 0:B.direccion)!=null&&e.trim()&&(Q=B.direccion.trim())}catch(a){console.warn("[Label] Could not lookup client address in local DB:",a)}if(!Q){const a=A.find(B=>{var d,x;return((d=B.observaciones2)==null?void 0:d.trim())||((x=B.observaciones)==null?void 0:x.trim())});if(a){const B=(a.observaciones2||"").trim(),d=(a.observaciones||"").trim();B?Q=B:/calle|av\.|avenida|barrio|piso|depto|altura|entre|b°|direcci/i.test(d)&&(Q=d)}}const E=Array.from(new Set(A.map(a=>a.material).filter(Boolean))).join(" / "),s=[];for(const a of A){const B=a.archivos&&a.archivos.length>0?a.archivos:[];if(B.length>0)B.forEach((d,x)=>{var w;const n=((w=a.archivosOriginales)==null?void 0:w[x])||d.split("/").pop()||`Archivo ${x+1}`,v=j(d);s.push({name:Z(n),url:v,ancho:a.ancho,alto:a.alto,copias:a.copias})});else if((i=a.imgMetadata)!=null&&i.thumbnailUrl){const d=((r=a.archivosOriginales)==null?void 0:r[0])||a.nombreTarea||"Archivo";s.push({name:Z(d),url:j(a.imgMetadata.thumbnailUrl),ancho:a.ancho,alto:a.alto,copias:a.copias})}else(a.ancho||a.alto||a.conceptoPersonalizado||a.descripcionItem)&&s.push({name:a.descripcionItem||a.conceptoPersonalizado||a.nombreTarea||a.material||"Trabajo sin archivo",url:"",ancho:a.ancho,alto:a.alto,copias:a.copias})}const c=Array.from(new Set(s.map(a=>a.url).filter(Boolean)));let H=new Map;if(c.length>0)try{const a=await AA(c,{maxWidth:320,maxHeight:320,quality:S.thumbQuality,timeoutMs:3e3});H=new Map(c.map((B,d)=>[B,a[d]||B]))}catch(a){console.warn("[Label] Thumbnail optimization fallback:",a)}const U=s.map(a=>({name:a.name,dimensions:HA(a.ancho,a.alto,a.copias),thumbUrl:a.url?H.get(a.url)||a.url:""})),F=kA({projectName:l,clientName:p,material:E,address:Q,items:U});o.document.open(),o.document.write(F),o.document.close()}catch(g){console.error("[Label] Error generating production label:",g),o.document.open(),o.document.write(`
            <div style="font-family:sans-serif;padding:30px;color:#ef4444;text-align:center;">
                <h3>Error al generar la etiqueta</h3>
                <p>${String(g)}</p>
                <button onclick="window.close()" style="padding:8px 16px;cursor:pointer;">Cerrar</button>
            </div>
        `),o.document.close()}}function kA(A){const{projectName:o,clientName:e,material:i,address:r,items:g}=A,l=e?`
        <div class="label-section">
            <p class="label-section-header">DESTINATARIO</p>
            <p class="label-section-value">${T(e)}</p>
        </div>
    `:"",p=r?`
        <div class="label-section">
            <p class="label-section-header">DIRECCIÓN</p>
            <p class="label-section-address">${T(r)}</p>
        </div>
    `:"",Q=i?`
        <div><span class="label-material">${T(i)}</span></div>
    `:"",E=!!(o||i)?`
        <div class="label-project-block">
            ${o?`<h1 class="project-title">${T(o)}</h1>`:""}
            <div class="project-meta">
                <span>Fecha: <strong>${$()}</strong></span>
            </div>
            ${Q}
        </div>
    `:`
        <div style="text-align:center;font-weight:700;color:#64748b;font-size:12px;margin-bottom:6px;">
            Fecha: ${$()}
        </div>
    `,s=g.length>0?`
        <div class="dotted-divider"></div>
        <div class="detail-header">
            <p class="detail-title">DETALLE DE ARCHIVOS</p>
            <span class="detail-count">${g.length} ${g.length===1?"ítem":"ítems"}</span>
        </div>
        <div class="thumbs-grid">
            ${g.map(c=>`
                <div class="thumb-card">
                    <div class="img-container">
                        ${c.thumbUrl?`
                            <img src="${c.thumbUrl}" alt="" loading="eager" />
                        `:`
                            <div class="thumb-no-img">📄</div>
                        `}
                    </div>
                    <div>
                        <p class="thumb-name">${T(c.name)}</p>
                        ${c.dimensions?`<span class="thumb-dims-badge">${T(c.dimensions)}</span>`:""}
                    </div>
                </div>
            `).join("")}
        </div>
    `:"";return`<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Etiqueta — ${T(o||e||"Producción")}</title>
    <style>${LA}</style>
</head>
<body>
    <div class="no-print-bar">
        <span class="title">🏷️ Etiqueta de Producción</span>
        <div>
            <button class="btn-print" onclick="window.print()">🖨️ Imprimir</button>
            <button class="btn-print" style="margin-left:8px;background:#475569" onclick="window.close()">✕ Cerrar</button>
        </div>
    </div>

    <div class="label-page">
        <!-- Logo Oficial XignuX Prominente -->
        <div class="label-logo">
            <img src="${_}" alt="XignuX — Graficamos Arte" />
        </div>

        <div class="dotted-divider"></div>

        <!-- Bloque de Proyecto & Fecha -->
        ${E}

        <div class="dotted-divider"></div>

        <!-- Destinatario & Dirección -->
        ${l}
        ${p}

        <!-- Detalle de Archivos -->
        ${s}

        <!-- Footer Oficial -->
        <div class="label-footer">
            <p class="footer-whatsapp">
                <span>📱 WhatsApp: ${T(S.whatsapp)}</span>
            </p>
            <p class="footer-web">${T(S.website)}</p>
        </div>
    </div>
</body>
</html>`}function zA(A,o,e){let i=String(A.ot||A.id||"0").trim();i.toUpperCase().startsWith("OT-")?i=i.slice(3).trim():i.toUpperCase().startsWith("OT")&&(i=i.slice(2).trim());const r=i||"0",g=A.copias||1;let l=(A.material||"MAT").trim(),p=l;try{const F=iA().find(a=>a.codigo&&a.codigo.toLowerCase()===l.toLowerCase()||a.descripcion&&a.descripcion.toLowerCase()===l.toLowerCase());F&&F.codigo&&(p=F.codigo.trim())}catch{}p=p.replace(/\s+/g,"-").replace(/[^a-zA-Z0-9_-]/g,"");const Q=[];if(A.servicios&&typeof A.servicios=="object")try{const U=cA();Object.entries(A.servicios).forEach(([F,a])=>{if(a){const B=U.find(d=>String(d.id)===String(F)||d.codigo&&d.codigo.toLowerCase()===String(F).toLowerCase()||d.nombre&&d.nombre.toLowerCase()===String(F).toLowerCase());B&&B.codigo?Q.push(B.codigo.trim().replace(/[^a-zA-Z0-9_-]/g,"")):B&&B.nombre?Q.push(B.nombre.substring(0,4).toUpperCase().trim().replace(/[^a-zA-Z0-9_-]/g,"")):typeof F=="string"&&isNaN(Number(F))&&Q.push(F.substring(0,4).toUpperCase().trim().replace(/[^a-zA-Z0-9_-]/g,""))}})}catch{}const E=/\d+[.,]?\d*\s*[xX]\s*\d+[.,]?\d*/.test(e);let s="";!E&&A.ancho&&A.alto&&(s=`_${Number(A.ancho).toFixed(2)}x${Number(A.alto).toFixed(2)}`);const c=Q.length>0?`_${Q.join("_")}`:"",H=`OT-${r}_x${g}_${p}${c}${s}`;return e.startsWith(`OT-${r}`)||e.startsWith("OT-")?e:`${H} --- ${e}`}function NA({isOpen:A,onClose:o,order:e,onUpdate:i,showStandardize:r=!1}){var B;const g=sA(),[l,p]=L.useState(!1),[Q,y]=L.useState(null);if(!A||!e)return null;const E=d=>d?d.startsWith("data:")||d.startsWith(`${e.id}_`):!0,s=async()=>{if(!(!i||!e||!e.archivos)){p(!0);try{const{saveOrden:d}=await oA(async()=>{const{saveOrden:n}=await import("./index-E2jpRi4R-1791045891352.js").then(v=>v.aj);return{saveOrden:n}},__vite__mapDeps([0,1,2,3]),import.meta.url),x=e.archivos.map((n,v)=>{var f;if(E(n))return n;const D=(((f=e.archivosOriginales)==null?void 0:f[v])||n).replace(/\s+/g,"_");return`${e.id}_${D}`});await d({...e,archivos:x}),i()}catch(d){console.error("Error al estandarizar nombres:",d),alert("Error al renombrar archivos.")}finally{p(!1)}}},c=()=>{FA(e)},H=()=>{e&&KA([e])},U=(d,x)=>new Promise(n=>{const v=new Image;v.crossOrigin="anonymous",v.onload=()=>{try{const w=document.createElement("canvas");w.width=v.naturalWidth||v.width,w.height=v.naturalHeight||v.height;const D=w.getContext("2d");if(!D)return n(!1);D.drawImage(v,0,0);const f=w.toDataURL("image/jpeg",.95),h=document.createElement("a");h.href=f,h.download=x,h.style.display="none",document.body.appendChild(h),h.click(),setTimeout(()=>{try{document.body.removeChild(h)}catch{}},300),n(!0)}catch(w){console.warn("[Canvas Download] Canvas conversion fallback error:",w),n(!1)}},v.onerror=()=>n(!1),v.src=d}),F=async(d,x)=>{y(x);const n=j(d);try{if(n.startsWith("data:")){const h=document.createElement("a");h.href=n,h.download=x,h.style.display="none",document.body.appendChild(h),h.click(),setTimeout(()=>{try{document.body.removeChild(h)}catch{}},300),y(null);return}const v=n.includes("r2.cloudflarestorage.com")||n.includes("s3.amazonaws.com")||n.includes(".r2.dev")||n.includes("X-Amz-Signature")&&n.includes("X-Amz-Credential"),w=localStorage.getItem("luxius_auth_token")||"",D=w?`&token=${encodeURIComponent(w)}`:"";if(v){console.log("[Download] R2/S3 URL detected, using server proxy...");const h=`${N}/download?url=${encodeURIComponent(n)}&filename=${encodeURIComponent(x)}${D}`;try{const b=await fetch(h,{headers:J()});if(b.ok){const C=await b.blob(),u=URL.createObjectURL(C),P=document.createElement("a");P.href=u,P.download=x,P.style.display="none",document.body.appendChild(P),P.click(),setTimeout(()=>{URL.revokeObjectURL(u);try{document.body.removeChild(P)}catch{}},500),y(null);return}console.warn("[Download] Proxy fetch failed, opening in new tab..."),window.open(h,"_blank"),y(null);return}catch(b){console.warn("[Download] Proxy fetch error, opening in new tab:",b),window.open(h,"_blank"),y(null);return}}const f=await fetch(n,{method:"GET",headers:J()});if(f.ok){const h=await f.blob(),b=URL.createObjectURL(h),C=document.createElement("a");C.href=b,C.download=x,C.style.display="none",document.body.appendChild(C),C.click(),setTimeout(()=>{URL.revokeObjectURL(b);try{document.body.removeChild(C)}catch{}},500),y(null);return}throw new Error(`HTTP ${f.status}`)}catch(v){if(console.warn("[Download] Direct fetch failed, trying canvas fallback:",v),await U(n,x)){y(null);return}const D=localStorage.getItem("luxius_auth_token")||"",f=D?`&token=${encodeURIComponent(D)}`:"",h=`${N}/download?url=${encodeURIComponent(n)}&filename=${encodeURIComponent(x)}${f}`;window.open(h,"_blank")}finally{y(null)}},a=(B=e.archivos)==null?void 0:B.every(E);return t.jsxs(aA,{isOpen:A,onClose:o,title:"Visualizador de Archivos & Multimedia",size:"lg",className:"shared-file-viewer",children:[t.jsxs("div",{className:"file-viewer-content",children:[t.jsxs("div",{className:"order-production-info",style:{display:"flex",justifyContent:"space-between",alignItems:"center"},children:[t.jsxs("div",{style:{display:"flex",gap:"1rem",flexWrap:"wrap"},children:[t.jsxs("div",{className:"info-item",children:[t.jsx("span",{className:"label",children:"Material"}),t.jsx("span",{className:"value",children:e.material||"S/D"})]}),t.jsxs("div",{className:"info-item",children:[t.jsx("span",{className:"label",children:"Medidas"}),t.jsxs("span",{className:"value",children:[Number(e.ancho||0).toFixed(2)," x ",Number(e.alto||0).toFixed(2)," m"]})]}),t.jsxs("div",{className:"info-item",children:[t.jsx("span",{className:"label",children:"Cantidad"}),t.jsxs("span",{className:"value",children:[e.copias||1," Unidades"]})]}),t.jsxs("div",{className:"info-item",children:[t.jsx("span",{className:"label",children:"Cliente"}),t.jsx("span",{className:"value",children:e.clienteNombre||"S/D"})]})]}),t.jsxs("div",{style:{display:"flex",gap:"8px",flexWrap:"wrap"},children:[t.jsx("button",{onClick:c,style:{background:"linear-gradient(135deg, #2563eb, #1d4ed8)",color:"#fff",border:"none",borderRadius:"8px",padding:"0.6rem 1.2rem",fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:"6px",boxShadow:"0 4px 12px rgba(37,99,235,0.3)",whiteSpace:"nowrap"},children:"📄 Ver / Imprimir PDF Presupuesto"}),t.jsx("button",{onClick:H,style:{background:"linear-gradient(135deg, #0d9488, #0f766e)",color:"#fff",border:"none",borderRadius:"8px",padding:"0.6rem 1.2rem",fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:"6px",boxShadow:"0 4px 12px rgba(13,148,136,0.3)",whiteSpace:"nowrap"},children:"🏷️ Imprimir Etiqueta"})]})]}),t.jsx("div",{className:"files-grid",children:!e.archivos||e.archivos.length===0?t.jsxs("div",{className:"empty-files",children:[t.jsx("span",{className:"empty-icon",children:"📂"}),t.jsx("p",{children:"No hay archivos adjuntos"})]}):e.archivos.map((d,x)=>{var K,k,z,m;const n=j(d),v=n.startsWith("data:"),w=n.split("?")[0],D=v?n.startsWith("data:image/"):!!w.match(/\.(jpg|jpeg|png|gif|webp|tiff|tif|bmp|svg)$/i),f=v?n.startsWith("data:video/"):!!w.match(/\.(mp4|webm|ogv|mov|avi)$/i),h=v?n.startsWith("data:application/pdf"):!!w.match(/\.pdf$/i),b=v?n.startsWith("data:audio/"):!!w.match(/\.(mp3|wav|ogg|m4a)$/i),C=((K=e.archivosOriginales)==null?void 0:K[x])||(v?`archivo_adjunto_${x+1}`:((k=d.split("/").pop())==null?void 0:k.split("?")[0])||d),u=zA(e,x,C),P=E(d);return t.jsxs("div",{className:`file-card ${P?"is-standard":"is-pending"}`,children:[t.jsxs("div",{className:"file-preview-container",style:{minHeight:h?"250px":f?"200px":"auto"},children:[D?t.jsx("img",{src:n,alt:C,className:"img-preview",onError:I=>{var G;if(console.warn("[Image Error] Fallback thumbnail or card:",n),(G=e.imgMetadata)!=null&&G.thumbnailUrl&&I.currentTarget.src!==e.imgMetadata.thumbnailUrl)I.currentTarget.src=e.imgMetadata.thumbnailUrl;else{I.currentTarget.style.display="none";const q=I.currentTarget.parentElement;if(q&&!q.querySelector(".universal-preview-fallback")){const V=document.createElement("div");V.className="universal-preview-fallback",V.style.padding="20px",V.style.textAlign="center",V.innerHTML=`<div style="font-size: 2.5rem; margin-bottom: 8px;">🖼️</div><div style="font-size: 0.85rem; color: #94a3b8; word-break: break-all;">${C}</div>`,q.appendChild(V)}}}}):f?t.jsx("div",{className:"video-preview-box",style:{width:"100%",padding:"4px"},children:t.jsx("video",{controls:!0,src:n,style:{width:"100%",maxHeight:"220px",borderRadius:"8px",background:"#000"},playsInline:!0})}):b?t.jsxs("div",{className:"audio-preview-box",style:{padding:"8px",width:"100%",display:"flex",flexDirection:"column",alignItems:"center",gap:"8px"},children:[t.jsx("span",{style:{fontSize:"1.8rem"},children:"🎙️"}),t.jsx("audio",{controls:!0,src:n,style:{width:"100%",height:"36px"}})]}):t.jsx(QA,{fileUrl:n,fileName:C,dimensions:e.ancho&&e.alto?{width:Number(e.ancho)*100,height:Number(e.alto)*100}:void 0,dpi:(z=e.imgMetadata)==null?void 0:z.dpi,colorMode:(m=e.imgMetadata)==null?void 0:m.colorMode,style:{minHeight:"180px",maxHeight:"250px"}}),!P&&t.jsx("div",{className:"quick-warning",title:"Nombre no estandarizado",children:"⚠️"})]}),t.jsxs("div",{className:"file-info-container",children:[t.jsxs("div",{className:"name-wrapper",children:[t.jsxs("span",{className:"file-label",children:["Archivo ",x+1]}),t.jsx("span",{className:"file-name",title:C,children:C}),t.jsxs("span",{style:{fontSize:"0.72rem",color:"#fbbf24",fontFamily:"monospace",fontWeight:600,marginTop:"3px",display:"block",wordBreak:"break-all"},children:["🏷️ Nombre Producción: ",u]}),e.imgMetadata&&t.jsxs("div",{className:"tech-specs",children:[t.jsxs("span",{className:"spec-badge dpi",children:[e.imgMetadata.dpi," DPI"]}),t.jsx("span",{className:"spec-badge mode",children:e.imgMetadata.colorMode||"RGB"})]})]}),t.jsxs("div",{className:"card-actions",style:{display:"flex",gap:"6px",flexWrap:"wrap"},children:[t.jsxs("button",{type:"button",className:"btn-download-premium",onClick:()=>{o();const I=e!=null&&e.id?`&orderId=${e.id}`:"";g(`/xpress-viewer?fileUrl=${encodeURIComponent(n)}&fileName=${encodeURIComponent(u)}${I}`)},style:{background:"linear-gradient(135deg, #0284c7, #0369a1)",borderColor:"#0284c7",color:"#fff",cursor:"pointer"},title:"Inspeccionar en Xpress Studio (Medir, demasías, vectorizar)",children:[t.jsx("span",{className:"icon",children:"👁️"}),"Xpress Studio"]}),t.jsxs("button",{type:"button",className:"btn-download-premium",disabled:Q===u,onClick:I=>{I.preventDefault(),I.stopPropagation(),F(n,u)},style:{cursor:Q===u?"wait":"pointer",opacity:Q===u?.7:1},children:[t.jsx("span",{className:"icon",children:Q===u?"⏳":"📥"}),Q===u?"Descargando...":"Descargar"]})]})]})]},x)})})]}),t.jsxs("div",{className:"modal-footer-shared",children:[r&&!a&&e.archivos&&e.archivos.length>0&&t.jsx("button",{className:"btn-standardize",onClick:s,disabled:l,children:l?"...":"⚡ Estandarizar Nombres"}),t.jsx("button",{className:"btn-close-modal",onClick:o,children:"Cerrar"})]})]})}export{vA as P,NA as S,QA as U,YA as a,KA as b,FA as c,XA as d,qA as g,RA as s};
