import{X as tt}from"./logoBase64Light-C-oYOwEg-1791685794610.js";import{e as et,r as S}from"./index-Cs1uzS8M-1791685794610.js";const W="data:image/svg+xml;base64,"+btoa('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" fill="#f1f5f9"/><text x="100" y="108" text-anchor="middle" fill="#94a3b8" font-size="12" font-family="sans-serif">Sin vista previa</text></svg>');async function it(i,g={}){if(!i||typeof i!="string")return"";if(i.startsWith("data:image/svg+xml")||i.endsWith(".svg"))return i;const{maxWidth:m=320,maxHeight:d=320,quality:h=.72,timeoutMs:$=8e3}=g;try{let o=null;if(i.startsWith("data:"))o=await(await fetch(i)).blob();else{const s=new AbortController,n=setTimeout(()=>s.abort(),$);try{const a=await fetch(i,{signal:s.signal});a.ok&&(o=await a.blob())}catch{o=null}finally{clearTimeout(n)}}if(o){if(o.size<100)return W;if(o.size<25e3)return await at(o);const s=await createImageBitmap(o);let{width:n,height:a}=s;if(n>m||a>d){const f=Math.min(m/n,d/a);n=Math.max(1,Math.round(n*f)),a=Math.max(1,Math.round(a*f))}const x=document.createElement("canvas");x.width=n,x.height=a;const v=x.getContext("2d");if(v){v.fillStyle="#ffffff",v.fillRect(0,0,n,a),v.drawImage(s,0,0,n,a),s.close();const f=x.toDataURL("image/jpeg",h);return f.length>15e4?x.toDataURL("image/jpeg",.5):f}s.close()}const l=new Image;l.crossOrigin="anonymous",await new Promise((s,n)=>{const a=setTimeout(()=>n(new Error("Image element timeout")),Math.min($,5e3));l.onload=()=>{clearTimeout(a),s()},l.onerror=()=>{clearTimeout(a),n(new Error("Image element load error"))},l.src=i});let{naturalWidth:c,naturalHeight:b}=l;if(c>0&&b>0){if(c>m||b>d){const a=Math.min(m/c,d/b);c=Math.max(1,Math.round(c*a)),b=Math.max(1,Math.round(b*a))}const s=document.createElement("canvas");s.width=c,s.height=b;const n=s.getContext("2d");if(n)return n.fillStyle="#ffffff",n.fillRect(0,0,c,b),n.drawImage(l,0,0,c,b),s.toDataURL("image/jpeg",h)}return i}catch(o){return console.warn("[PDF Image Optimizer] No se pudo re-escalar imagen, usando src original o placeholder:",o),i&&(i.startsWith("http://")||i.startsWith("https://")||i.startsWith("/")||i.startsWith("blob:"))?i:W}}function at(i){return new Promise((g,m)=>{const d=new FileReader;d.onload=()=>g(d.result),d.onerror=m,d.readAsDataURL(i)})}async function ot(i,g={}){const d=new Array(i.length);for(let h=0;h<i.length;h+=4){const $=i.slice(h,h+4),o=await Promise.all($.map(l=>it(l,g)));for(let l=0;l<o.length;l++)d[h+l]=o[l]}return d}const G={VV:"Vinilo Vehicular (VV)",VVP:"Vinilo Vehicular Promocional (VVP)",FL:"Lona Frontlight 13oz (FL)",BL:"Lona Backlight 15oz (BL)",BO:"Lona Blackout Doble Faz (BO)",MESH:"Lona Mesh Microperforada (MESH)",MIC:"Vinilo Microperforado (MIC)",ESM:"Vinilo Esmerilado (ESM)",TRANS:"Vinilo Transparente (TRANS)",POLY:"Lienzo Polycanvas (POLY)",PAPEL:"Papel Fotográfico (PAPEL)"};async function rt(i,g){const m=window.open("","_blank");if(!m){alert("Por favor permite las ventanas emergentes (popups) para generar el PDF del reporte.");return}m.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Optimizando Reporte PDF...</title>
            <style>
                body { margin:0; height:100vh; display:flex; flex-direction:column; align-items:center; justify-content:center; background:#1e2433; color:#f8fafc; font-family:sans-serif; }
                .spinner { width:38px; height:38px; border:4px solid #334155; border-top-color:#38bdf8; border-radius:50%; animation:spin 0.8s linear infinite; }
                @keyframes spin { to { transform: rotate(360deg); } }
            </style>
        </head>
        <body>
            <div class="spinner"></div>
            <p style="margin-top:14px; font-weight:600; font-size:13.5px; letter-spacing:0.3px;">Optimizando resolución de miniaturas y preparando PDF...</p>
        </body>
        </html>
    `);const d=new Date().toLocaleDateString("es-AR",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}),h=g.clienteNombre||"Todos los Clientes",$=g.tituloReporte||"ESTADO DE CUENTA Y REPORTES DE TRABAJOS",o=g.mode==="simplificado",l=`Reporte_Cliente_${h.replace(/[^a-zA-Z0-9]/g,"_")}_${new Date().toISOString().split("T")[0]}.pdf`,c=t=>`$${t.toLocaleString("es-AR",{minimumFractionDigits:2,maximumFractionDigits:2})}`,b=et()||[],s=t=>{const e=(t||"").trim();if(!e||e==="-")return{code:"VAR",name:"Material Varios / Sin especificar"};const r=b.find(y=>y.codigo.toLowerCase()===e.toLowerCase()||y.descripcion&&y.descripcion.toLowerCase()===e.toLowerCase());if(r)return{code:r.codigo,name:`${r.descripcion} (${r.codigo})`};const p=e.toUpperCase();return G[p]?{code:p,name:G[p]}:{code:p,name:e}},n=t=>{var y,k,u;if(((y=t.precioDetalle)==null?void 0:y.consumoML)!==void 0&&Number(t.precioDetalle.consumoML)>0)return Number(t.precioDetalle.consumoML);if(t.consumoEstimado!==void 0&&Number(t.consumoEstimado)>0)return Number(t.consumoEstimado);const e=Number(t.ancho)||0,r=Number(t.alto)||0,p=Math.max(1,Number(t.copias)||1);return e<=0||r<=0?0:((k=t.precioDetalle)==null?void 0:k.rotated)===!0?Math.round(e*p*100)/100:((u=t.precioDetalle)==null?void 0:u.rotated)===!1?Math.round(r*p*100)/100:e<=1.515&&r<=1.515?Math.round(Math.min(e,r)*p*100)/100:e<=1.515?Math.round(r*p*100)/100:r<=1.515?Math.round(e*p*100)/100:Math.round(Math.max(e,r)*p*100)/100};let a=0,x=0,v=0;const f=i.map(t=>{var R,j,V,U;const e=Number(t.total||t.subtotal||0),r=Number(t.sena??t.senaMonto??t.sena_monto??0),p=t.saldoPendiente!==void 0?Number(t.saldoPendiente):Math.max(0,e-r);a+=e,x+=r,v+=p;const y=t.ot||`OT-${t.id}`,k=t.createdAt?new Date(t.createdAt).toLocaleDateString("es-AR"):"-";let u=(t.nombreTarea||t.observaciones||"").trim();(!u||u.startsWith("Proyecto #")||u.startsWith("Proyecto OT-"))&&(u=t.material||"Trabajo de Impresión"),t.ancho&&t.alto&&(u+=` (${Number(t.ancho).toFixed(2)}x${Number(t.alto).toFixed(2)}m)`);const Y=t.status==="diseno"||t.status==="preorden"?"Diseño":t.status==="orden"?"En Impresión":t.status==="impreso"||t.status==="post"?"Impreso":t.status==="entregado"||t.status==="finalizado"?"Entregado":t.status;let z="";if((R=t.imgMetadata)!=null&&R.thumbnailUrl)z=S(t.imgMetadata.thumbnailUrl);else if(t.archivos&&t.archivos.length>0){const L=t.archivos[0],E=((j=L.split(".").pop())==null?void 0:j.toLowerCase())||"";["jpg","jpeg","png","webp","svg","gif","bmp","tiff","tif"].includes(E)&&(z=S(L))}const N=[];t.archivos&&t.archivos.length>0?t.archivos.forEach((L,E)=>{var B;const Q=((B=t.archivosOriginales)==null?void 0:B[E])||L.split("/").pop()||`Pieza ${E+1}`;N.push({url:S(L),fileName:Q})}):z&&N.push({url:z,fileName:((V=t.archivosOriginales)==null?void 0:V[0])||"Archivo cargado"});const F=s(t.material),q=Number(t.ancho)||0,J=Number(t.alto)||0,I=Math.max(1,Number(t.copias)||1),K=n(t),Z=Math.round(q*J*I*100)/100;return{ot:y,fecha:k,desc:u,material:t.material||"-",materialCode:F.code,materialName:F.name,copias:I,linearMeters:K,m2:Z,status:Y,rawStatus:t.status,thumbUrl:z,files:N,fileName:((U=t.archivosOriginales)==null?void 0:U[0])||"",total:e,sena:r,saldo:p}}),w={};let P=0,C=0,A=0;f.forEach(t=>{const e=t.materialCode||"VAR";w[e]||(w[e]={code:e,name:t.materialName,ordenesCount:0,copiasCount:0,totalLinearMeters:0,totalM2:0}),w[e].ordenesCount+=1,w[e].copiasCount+=t.copias,w[e].totalLinearMeters+=t.linearMeters,w[e].totalM2+=t.m2,P+=t.linearMeters,C+=t.m2,A+=t.copias});const D=Object.values(w).sort((t,e)=>e.totalLinearMeters-t.totalLinearMeters),M=[];f.forEach(t=>{t.files&&t.files.length>0?t.files.forEach(e=>{M.push({ot:t.ot,desc:t.desc,url:e.url,fileName:e.fileName})}):t.thumbUrl&&M.push({ot:t.ot,desc:t.desc,url:t.thumbUrl,fileName:t.fileName||"Archivo"})});const H=[...f.map(t=>t.thumbUrl),...M.map(t=>t.url)],T=await ot(H,{maxWidth:320,maxHeight:320,quality:.72,timeoutMs:8e3}),_=tt;f.forEach((t,e)=>{T[e]&&(t.thumbUrl=T[e])});const O=f.length;M.forEach((t,e)=>{T[O+e]&&(t.url=T[O+e])});const X=`
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="utf-8">
            <title>${l}</title>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

                @page {
                    size: A4 portrait;
                    margin: 0;
                }

                * { box-sizing: border-box; font-family: 'Inter', system-ui, -apple-system, sans-serif; }

                html, body {
                    margin: 0;
                    padding: 0;
                    background: #525659;
                    color: #1e2433;
                    font-size: 12px;
                    line-height: 1.4;
                }

                /* Floating Top Action Bar */
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

                /* Strict A4 Sheet Container */
                .a4-page {
                    width: 210mm;
                    min-height: 297mm;
                    padding: 16mm 18mm 14mm 18mm;
                    margin: 0 auto 30px auto;
                    background: #ffffff;
                    position: relative;
                    box-shadow: 0 8px 25px rgba(0,0,0,0.25);
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                }

                /* Header Brand */
                .header-brand {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-bottom: 2px solid #1e2433;
                    padding-bottom: 12px;
                    margin-bottom: 18px;
                }
                .brand-left {
                    display: flex;
                    align-items: center;
                    gap: 14px;
                }
                .brand-logo-img {
                    width: 110px;
                    height: auto;
                }
                .brand-info {
                    display: flex;
                    flex-direction: column;
                }
                .brand-title {
                    font-size: 18px;
                    font-weight: 800;
                    color: #1e2433;
                    letter-spacing: 0.5px;
                }
                .brand-sub {
                    font-size: 11px;
                    color: #475569;
                    font-weight: 500;
                }
                .header-doc-info {
                    text-align: right;
                }
                .doc-type {
                    font-size: 14px;
                    font-weight: 800;
                    color: #2563eb;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                .doc-date {
                    font-size: 11px;
                    color: #64748b;
                    margin-top: 3px;
                }

                /* Client Info Box */
                .client-box {
                    background: #f8fafc;
                    border: 1px solid #e2e8f0;
                    border-radius: 6px;
                    padding: 12px 16px;
                    display: grid;
                    grid-template-columns: 2fr 1fr 1fr;
                    gap: 12px;
                    margin-bottom: 20px;
                }
                .box-field-label {
                    font-size: 9.5px;
                    font-weight: 700;
                    color: #64748b;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                .box-field-val {
                    font-size: 13px;
                    font-weight: 700;
                    color: #1e2433;
                    margin-top: 2px;
                }

                /* Items Table */
                .items-table {
                    width: 100%;
                    border-collapse: collapse;
                    border: 1px solid #cbd5e1;
                    margin-bottom: 20px;
                }
                .items-table th {
                    background: #1e2433;
                    color: #ffffff;
                    font-size: 10.5px;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.6px;
                    padding: 8px 10px;
                    text-align: left;
                }
                .items-table td {
                    padding: 9px 10px;
                    border-bottom: 1px solid #e2e8f0;
                    font-size: 11.5px;
                    color: #1e2433;
                }
                .items-table tr:nth-child(even) td {
                    background: #f8fafc;
                }
                .text-right { text-align: right; }
                .text-center { text-align: center; }

                .badge-status {
                    display: inline-block;
                    padding: 2px 6px;
                    border-radius: 4px;
                    font-size: 10px;
                    font-weight: 700;
                    background: #e2e8f0;
                    color: #334155;
                }

                /* Summary Totals Box */
                .summary-card {
                    display: flex;
                    justify-content: flex-end;
                    margin-bottom: 20px;
                }
                .totals-table {
                    width: 280px;
                    border-collapse: collapse;
                    border: 1px solid #cbd5e1;
                    border-radius: 6px;
                    overflow: hidden;
                }
                .totals-table td {
                    padding: 8px 14px;
                    font-size: 12px;
                }
                .row-sub td { background: #f8fafc; color: #475569; }
                .row-sena td { background: #f0fdf4; color: #166534; font-weight: 600; }
                .row-saldo td { background: #1e2433; color: #ffffff; font-weight: 800; font-size: 13.5px; }

                /* Footer */
                .footer-box {
                    border-top: 1px dashed #cbd5e1;
                    padding-top: 12px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    font-size: 10.5px;
                    color: #64748b;
                }

                /* Thumbnail gallery */
                .thumb-gallery {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 12px;
                }
                .thumb-card {
                    background: #f8fafc;
                    border: 1px solid #e2e8f0;
                    border-radius: 6px;
                    padding: 8px;
                    text-align: center;
                }
                .thumb-card img {
                    width: 100%;
                    height: 90px;
                    object-fit: contain;
                    border-radius: 4px;
                    margin-bottom: 4px;
                }

                @media print {
                    .no-print-bar { display: none !important; }
                    html, body { background: #ffffff !important; }
                    .a4-page {
                        box-shadow: none !important;
                        margin: 0 auto !important;
                        width: 210mm !important;
                        max-width: 210mm !important;
                        min-width: 210mm !important;
                        min-height: auto !important;
                        height: auto !important;
                        padding: 10mm 15mm !important;
                        overflow: visible !important;
                    }
                    .items-table tr { page-break-inside: avoid; break-inside: avoid; }
                    .thumb-gallery { break-before: auto; }
                    .thumb-card { break-inside: avoid; page-break-inside: avoid; }
                    .footer-box { break-inside: avoid; page-break-inside: avoid; }
                    .summary-grid { break-inside: avoid; page-break-inside: avoid; }
                }
            </style>
        </head>
        <body>
            <div class="no-print-bar">
                <div>
                    <strong>Reporte de Cliente XignuX</strong> — Listo para guardar o imprimir en PDF
                </div>
                <button class="btn-print" onclick="window.print()">
                    🖨️ Imprimir / Guardar en PDF
                </button>
            </div>

            <div class="a4-page">
                <div>
                    <!-- Header Brand -->
                    <div class="header-brand">
                        <div class="brand-left">
                            <img src="${_}" alt="XignuX Logo" class="brand-logo-img">
                            <div class="brand-info">
                                <span class="brand-sub" style="font-size: 12px; font-weight: 600; color: #334155; margin-bottom: 2px;">Servicios Gráficos e Impresión Digital Profesional</span>
                                <span class="brand-sub">José V. Cardozo 912 | Tel: 3517897667/3517717071</span>
                            </div>
                        </div>
                        <div class="header-doc-info">
                            <div class="doc-type">${$}</div>
                            <div class="doc-date">Fecha de emisión: ${d}</div>
                        </div>
                    </div>

                    <!-- Client & Filter Metadata -->
                    <div class="client-box">
                        <div>
                            <div class="box-field-label">Cliente</div>
                            <div class="box-field-val">${h}</div>
                        </div>
                        <div>
                            <div class="box-field-label">Período / Filtro</div>
                            <div class="box-field-val" style="font-size: 11px;">
                                ${g.fechaDesde||"Inicio"} a ${g.fechaHasta||"Hoy"}
                            </div>
                        </div>
                        <div style="text-align: right;">
                            <div class="box-field-label">Total Trabajos</div>
                            <div class="box-field-val" style="color: #2563eb;">
                                ${i.length} OTs ${o&&P>0?`· <span style="color: #0284c7;">${P.toFixed(2)} ml</span>`:""}
                            </div>
                        </div>
                    </div>

                    <!-- Orders Table -->
                    <table class="items-table">
                        <thead>
                            <tr>
                                <th style="width: 10%;">N° OT</th>
                                <th style="width: 11%;">Vista Previa</th>
                                <th style="width: 11%;">Fecha</th>
                                <th style="width: 36%;">Descripción del Trabajo</th>
                                <th style="width: 12%;">Estado</th>
                                ${o?`
                                <th style="width: 8%; text-align: center;">Copias</th>
                                <th class="text-right" style="width: 14%; background: #0f172a; color: #38bdf8;">Consumo (ml)</th>
                                `:`
                                <th class="text-right" style="width: 14%;">Importe</th>
                                <th class="text-right" style="width: 14%;">Saldo</th>
                                `}
                            </tr>
                        </thead>
                        <tbody>
                            ${f.map(t=>`
                                <tr>
                                    <td style="font-weight: 700; color: #2563eb;">${t.ot}</td>
                                    <td style="text-align: center;">
                                        ${t.thumbUrl?`
                                            <img src="${t.thumbUrl}" alt="Arte" style="width: 38px; height: 38px; object-fit: cover; border-radius: 4px; border: 1px solid #cbd5e1; display: inline-block; vertical-align: middle;" />
                                        `:`
                                            <div style="width: 38px; height: 38px; background: #f1f5f9; border: 1px dashed #cbd5e1; border-radius: 4px; display: inline-flex; align-items: center; justify-content: center; font-size: 14px; color: #94a3b8;">
                                                🖼️
                                            </div>
                                        `}
                                    </td>
                                    <td>${t.fecha}</td>
                                    <td>
                                        <strong>${t.desc}</strong>
                                        <div style="font-size: 10px; color: #475569; margin-top: 1px;">
                                            <span style="background: #e2e8f0; padding: 1px 4px; border-radius: 3px; font-weight: 600; color: #334155;">${t.materialName}</span>
                                            ${t.fileName?` · <span>${t.fileName}</span>`:""}
                                        </div>
                                    </td>
                                    <td><span class="badge-status">${t.status}</span></td>
                                    ${o?`
                                    <td style="text-align: center; font-weight: 700; color: #334155;">
                                        ${t.copias} un.
                                    </td>
                                    <td class="text-right" style="font-weight: 800; color: #0284c7; font-family: monospace;">
                                        ${t.linearMeters>0?`${t.linearMeters.toFixed(2)} ml`:"-"}
                                    </td>
                                    `:`
                                    <td class="text-right" style="font-weight: 600;">${c(t.total)}</td>
                                    <td class="text-right" style="font-weight: 700; color: ${t.saldo>0?"#dc2626":"#166534"};">
                                        ${c(t.saldo)}
                                    </td>
                                    `}
                                </tr>
                            `).join("")}
                        </tbody>
                    </table>

                    ${o?`
                    <!-- Resumen de Taller: Sumatoria de Metros Lineales por Material -->
                    <div style="margin-bottom: 20px; page-break-inside: avoid; break-inside: avoid;">
                        <div style="background: #1e2433; color: #ffffff; padding: 10px 14px; border-radius: 6px 6px 0 0; display: flex; justify-content: space-between; align-items: center;">
                            <span style="font-weight: 800; font-size: 11.5px; letter-spacing: 0.5px; text-transform: uppercase;">
                                📦 Resumen de Taller — Metros Lineales por Material
                            </span>
                            <span style="font-size: 11px; color: #38bdf8; font-weight: 700;">
                                ${D.length} material(es) en este lote
                            </span>
                        </div>
                        <table style="width: 100%; border-collapse: collapse; border: 1px solid #cbd5e1; border-top: none; font-size: 11.5px;">
                            <thead>
                                <tr style="background: #f1f5f9; color: #475569; font-size: 10px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px;">
                                    <th style="padding: 7px 12px; text-align: left; border-bottom: 1px solid #cbd5e1;">Material / Sustrato</th>
                                    <th style="padding: 7px 10px; text-align: center; border-bottom: 1px solid #cbd5e1; width: 14%;">Órdenes</th>
                                    <th style="padding: 7px 10px; text-align: center; border-bottom: 1px solid #cbd5e1; width: 14%;">Copias</th>
                                    <th style="padding: 7px 12px; text-align: right; border-bottom: 1px solid #cbd5e1; width: 18%;">Superficie (m²)</th>
                                    <th style="padding: 7px 14px; text-align: right; border-bottom: 1px solid #cbd5e1; width: 22%; background: #e0f2fe; color: #0369a1;">Metros Lineales (ml)</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${D.map(t=>`
                                    <tr style="border-bottom: 1px solid #e2e8f0;">
                                        <td style="padding: 7px 12px; font-weight: 700; color: #1e2433;">
                                            ${t.name}
                                        </td>
                                        <td style="padding: 7px 10px; text-align: center; color: #64748b;">
                                            ${t.ordenesCount} OT(s)
                                        </td>
                                        <td style="padding: 7px 10px; text-align: center; font-weight: 600; color: #334155;">
                                            ${t.copiasCount} un.
                                        </td>
                                        <td style="padding: 7px 12px; text-align: right; color: #64748b; font-family: monospace;">
                                            ${t.totalM2.toFixed(2)} m²
                                        </td>
                                        <td style="padding: 7px 14px; text-align: right; font-weight: 800; font-size: 12.5px; color: #0284c7; background: #f0f9ff; font-family: monospace;">
                                            ${t.totalLinearMeters.toFixed(2)} ml
                                        </td>
                                    </tr>
                                `).join("")}
                            </tbody>
                            <tfoot>
                                <tr style="background: #1e2433; color: #ffffff; font-weight: 800;">
                                    <td style="padding: 9px 12px; text-transform: uppercase;">TOTAL GENERAL DEL LOTE</td>
                                    <td style="padding: 9px 10px; text-align: center;">${i.length} OTs</td>
                                    <td style="padding: 9px 10px; text-align: center;">${A} un.</td>
                                    <td style="padding: 9px 12px; text-align: right; font-family: monospace;">${C.toFixed(2)} m²</td>
                                    <td style="padding: 9px 14px; text-align: right; color: #38bdf8; font-size: 13.5px; font-family: monospace; background: #0f172a;">
                                        ${P.toFixed(2)} ml
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                    `:`
                    <!-- Summary & Commercial Notes -->
                    <div class="summary-grid" style="display: grid; grid-template-columns: 1.2fr 1fr; gap: 16px; margin-bottom: 20px;">
                        <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 12px; font-size: 11.5px; color: #1e40af; line-height: 1.45;">
                            <strong style="display: block; margin-bottom: 4px; font-size: 12px;">💡 Condición de Pago y Seña</strong>
                            Para confirmar órdenes en proceso de diseño o impresión, se sugiere abonar el <strong>50% en concepto de seña</strong>. Las órdenes en estado <em>Impreso</em> o <em>Entregado</em> corresponden a trabajos formalizados.
                            <div style="margin-top: 8px; font-size: 10.5px; color: #334155; border-top: 1px dashed #cbd5e1; padding-top: 6px;">
                                <strong>CBU / Alias:</strong> <code>a.flores.24</code> · Titular: Adrian Flores
                            </div>
                        </div>

                        <div class="summary-card" style="margin-bottom: 0;">
                            <table class="totals-table" style="width: 100%;">
                                <tr class="row-sub">
                                    <td>Total Contratado:</td>
                                    <td class="text-right" style="font-weight: 700;">${c(a)}</td>
                                </tr>
                                <tr class="row-sena">
                                    <td>Total Abonado / Señas:</td>
                                    <td class="text-right">${c(x)}</td>
                                </tr>
                                <tr class="row-saldo">
                                    <td>SALDO PENDIENTE:</td>
                                    <td class="text-right">${c(v)}</td>
                                </tr>
                            </table>
                        </div>
                    </div>
                    `}

                    <!-- Visual Artwork Gallery Section -->
                    ${M.length>0?`
                        <div style="margin-top: 24px; padding-top: 14px; border-top: 1px solid #e2e8f0; break-inside: avoid; page-break-inside: avoid;">
                            <div style="font-size: 11px; font-weight: 800; color: #1e2433; text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 10px;">
                                🎨 Grilla Visual de Trabajos y Archivos a Imprimir (${M.length} piezas)
                            </div>
                            <div class="thumb-gallery">
                                ${M.map(t=>`
                                    <div class="thumb-card">
                                        <img src="${t.url}" alt="${t.ot}" />
                                        <div style="font-size: 10.5px; font-weight: 700; color: #2563eb;">${t.ot}</div>
                                        <div style="font-size: 9.5px; font-weight: 600; color: #1e2433; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${t.fileName}">${t.fileName}</div>
                                        <div style="font-size: 9px; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${t.desc}</div>
                                    </div>
                                `).join("")}
                            </div>
                        </div>
                    `:""}
                </div>

                <!-- Footer -->
                <div class="footer-box">
                    <div>XignuX Gráfica — Documento de detalle de trabajos emitido electrónicamente.</div>
                    <div>Página 1 de 1</div>
                </div>
            </div>

            <script>
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
                            setTimeout(function() {
                                window.print();
                            }, 250);
                        });
                    }

                    if (document.readyState === 'complete') {
                        waitForImagesAndPrint();
                    } else {
                        window.addEventListener('load', waitForImagesAndPrint);
                    }
                })();
            <\/script>
        </body>
        </html>
    `;m.document.open(),m.document.write(X),m.document.close()}export{ot as b,rt as g};
