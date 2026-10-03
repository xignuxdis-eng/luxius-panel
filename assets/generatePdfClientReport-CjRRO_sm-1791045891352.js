import{X as L}from"./logoBase64Light-C-oYOwEg-1791045891352.js";import{r as P}from"./index-E2jpRi4R-1791045891352.js";const O="data:image/svg+xml;base64,"+btoa('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" fill="#f1f5f9"/><text x="100" y="108" text-anchor="middle" fill="#94a3b8" font-size="12" font-family="sans-serif">Sin vista previa</text></svg>');async function M(e,m={}){if(!e||typeof e!="string")return"";if(e.startsWith("data:image/svg+xml")||e.endsWith(".svg"))return e;const{maxWidth:d=320,maxHeight:r=320,quality:f=.72,timeoutMs:b=8e3}=m;try{let o=null;if(e.startsWith("data:"))o=await(await fetch(e)).blob();else{const n=new AbortController,a=setTimeout(()=>n.abort(),b);try{const i=await fetch(e,{signal:n.signal});i.ok&&(o=await i.blob())}catch{o=null}finally{clearTimeout(a)}}if(o){if(o.size<100)return O;if(o.size<25e3)return await W(o);const n=await createImageBitmap(o);let{width:a,height:i}=n;if(a>d||i>r){const h=Math.min(d/a,r/i);a=Math.max(1,Math.round(a*h)),i=Math.max(1,Math.round(i*h))}const c=document.createElement("canvas");c.width=a,c.height=i;const u=c.getContext("2d");if(u){u.fillStyle="#ffffff",u.fillRect(0,0,a,i),u.drawImage(n,0,0,a,i),n.close();const h=c.toDataURL("image/jpeg",f);return h.length>15e4?c.toDataURL("image/jpeg",.5):h}n.close()}const s=new Image;s.crossOrigin="anonymous",await new Promise((n,a)=>{const i=setTimeout(()=>a(new Error("Image element timeout")),Math.min(b,5e3));s.onload=()=>{clearTimeout(i),n()},s.onerror=()=>{clearTimeout(i),a(new Error("Image element load error"))},s.src=e});let{naturalWidth:l,naturalHeight:g}=s;if(l>0&&g>0){if(l>d||g>r){const i=Math.min(d/l,r/g);l=Math.max(1,Math.round(l*i)),g=Math.max(1,Math.round(g*i))}const n=document.createElement("canvas");n.width=l,n.height=g;const a=n.getContext("2d");if(a)return a.fillStyle="#ffffff",a.fillRect(0,0,l,g),a.drawImage(s,0,0,l,g),n.toDataURL("image/jpeg",f)}return e}catch(o){return console.warn("[PDF Image Optimizer] No se pudo re-escalar imagen, usando src original o placeholder:",o),e&&(e.startsWith("http://")||e.startsWith("https://")||e.startsWith("/")||e.startsWith("blob:"))?e:O}}function W(e){return new Promise((m,d)=>{const r=new FileReader;r.onload=()=>m(r.result),r.onerror=d,r.readAsDataURL(e)})}async function G(e,m={}){const r=new Array(e.length);for(let f=0;f<e.length;f+=4){const b=e.slice(f,f+4),o=await Promise.all(b.map(s=>M(s,m)));for(let s=0;s<o.length;s++)r[f+s]=o[s]}return r}async function X(e,m){const d=window.open("","_blank");if(!d){alert("Por favor permite las ventanas emergentes (popups) para generar el PDF del reporte.");return}d.document.write(`
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
    `);const r=new Date().toLocaleDateString("es-AR",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}),f=m.clienteNombre||"Todos los Clientes",b=m.tituloReporte||"ESTADO DE CUENTA Y REPORTES DE TRABAJOS",o=m.mode==="simplificado",s=`Reporte_Cliente_${f.replace(/[^a-zA-Z0-9]/g,"_")}_${new Date().toISOString().split("T")[0]}.pdf`,l=t=>`$${t.toLocaleString("es-AR",{minimumFractionDigits:2,maximumFractionDigits:2})}`;let g=0,n=0,a=0;const i=e.map(t=>{var D,A,E,S;const p=Number(t.total||t.subtotal||0),z=Number(t.sena??t.senaMonto??t.sena_monto??0),k=t.saldoPendiente!==void 0?Number(t.saldoPendiente):Math.max(0,p-z);g+=p,n+=z,a+=k;const C=t.ot||`OT-${t.id}`,j=t.createdAt?new Date(t.createdAt).toLocaleDateString("es-AR"):"-";let x=(t.nombreTarea||t.observaciones||"").trim();(!x||x.startsWith("Proyecto #")||x.startsWith("Proyecto OT-"))&&(x=t.material||"Trabajo de Impresión"),t.ancho&&t.alto&&(x+=` (${Number(t.ancho).toFixed(2)}x${Number(t.alto).toFixed(2)}m)`);const R=t.status==="diseno"||t.status==="preorden"?"Diseño":t.status==="orden"?"En Impresión":t.status==="impreso"||t.status==="post"?"Impreso":t.status==="entregado"||t.status==="finalizado"?"Entregado":t.status;let v="";if((D=t.imgMetadata)!=null&&D.thumbnailUrl)v=P(t.imgMetadata.thumbnailUrl);else if(t.archivos&&t.archivos.length>0){const y=t.archivos[0],w=((A=y.split(".").pop())==null?void 0:A.toLowerCase())||"";["jpg","jpeg","png","webp","svg","gif","bmp","tiff","tif"].includes(w)&&(v=P(y))}const $=[];return t.archivos&&t.archivos.length>0?t.archivos.forEach((y,w)=>{var I;const U=((I=t.archivosOriginales)==null?void 0:I[w])||y.split("/").pop()||`Pieza ${w+1}`;$.push({url:P(y),fileName:U})}):v&&$.push({url:v,fileName:((E=t.archivosOriginales)==null?void 0:E[0])||"Archivo cargado"}),{ot:C,fecha:j,desc:x,material:t.material||"-",copias:t.copias||1,status:R,rawStatus:t.status,thumbUrl:v,files:$,fileName:((S=t.archivosOriginales)==null?void 0:S[0])||"",total:p,sena:z,saldo:k}}),c=[];i.forEach(t=>{t.files&&t.files.length>0?t.files.forEach(p=>{c.push({ot:t.ot,desc:t.desc,url:p.url,fileName:p.fileName})}):t.thumbUrl&&c.push({ot:t.ot,desc:t.desc,url:t.thumbUrl,fileName:t.fileName||"Archivo"})});const u=[...i.map(t=>t.thumbUrl),...c.map(t=>t.url)],h=await G(u,{maxWidth:320,maxHeight:320,quality:.72,timeoutMs:8e3}),N=L;i.forEach((t,p)=>{h[p]&&(t.thumbUrl=h[p])});const T=i.length;c.forEach((t,p)=>{h[T+p]&&(t.url=h[T+p])});const F=`
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="utf-8">
            <title>${s}</title>
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
                            <img src="${N}" alt="XignuX Logo" class="brand-logo-img">
                            <div class="brand-info">
                                <span class="brand-sub" style="font-size: 12px; font-weight: 600; color: #334155; margin-bottom: 2px;">Servicios Gráficos e Impresión Digital Profesional</span>
                                <span class="brand-sub">José V. Cardozo 912 | Tel: 3517897667/3517717071</span>
                            </div>
                        </div>
                        <div class="header-doc-info">
                            <div class="doc-type">${b}</div>
                            <div class="doc-date">Fecha de emisión: ${r}</div>
                        </div>
                    </div>

                    <!-- Client & Filter Metadata -->
                    <div class="client-box">
                        <div>
                            <div class="box-field-label">Cliente</div>
                            <div class="box-field-val">${f}</div>
                        </div>
                        <div>
                            <div class="box-field-label">Período / Filtro</div>
                            <div class="box-field-val" style="font-size: 11px;">
                                ${m.fechaDesde||"Inicio"} a ${m.fechaHasta||"Hoy"}
                            </div>
                        </div>
                        <div style="text-align: right;">
                            <div class="box-field-label">Total Trabajos</div>
                            <div class="box-field-val" style="color: #2563eb;">${e.length} OTs</div>
                        </div>
                    </div>

                    <!-- Orders Table -->
                    <table class="items-table">
                        <thead>
                            <tr>
                                <th style="width: 10%;">N° OT</th>
                                <th style="width: 12%;">Vista Previa</th>
                                <th style="width: 12%;">Fecha</th>
                                <th style="width: ${o?"48%":"36%"};">Descripción del Trabajo</th>
                                <th style="width: 14%;">Estado</th>
                                ${o?"":`
                                <th class="text-right" style="width: 14%;">Importe</th>
                                <th class="text-right" style="width: 14%;">Saldo</th>
                                `}
                            </tr>
                        </thead>
                        <tbody>
                            ${i.map(t=>`
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
                                        ${t.fileName?`<div style="font-size: 10px; color: #64748b; margin-top: 2px;">${t.fileName}</div>`:""}
                                    </td>
                                    <td><span class="badge-status">${t.status}</span></td>
                                    ${o?"":`
                                    <td class="text-right" style="font-weight: 600;">${l(t.total)}</td>
                                    <td class="text-right" style="font-weight: 700; color: ${t.saldo>0?"#dc2626":"#166534"};">
                                        ${l(t.saldo)}
                                    </td>
                                    `}
                                </tr>
                            `).join("")}
                        </tbody>
                    </table>

                    ${o?"":`
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
                                    <td class="text-right" style="font-weight: 700;">${l(g)}</td>
                                </tr>
                                <tr class="row-sena">
                                    <td>Total Abonado / Señas:</td>
                                    <td class="text-right">${l(n)}</td>
                                </tr>
                                <tr class="row-saldo">
                                    <td>SALDO PENDIENTE:</td>
                                    <td class="text-right">${l(a)}</td>
                                </tr>
                            </table>
                        </div>
                    </div>
                    `}

                    <!-- Visual Artwork Gallery Section -->
                    ${c.length>0?`
                        <div style="margin-top: 24px; padding-top: 14px; border-top: 1px solid #e2e8f0; break-inside: avoid; page-break-inside: avoid;">
                            <div style="font-size: 11px; font-weight: 800; color: #1e2433; text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 10px;">
                                🎨 Grilla Visual de Trabajos y Archivos a Imprimir (${c.length} piezas)
                            </div>
                            <div class="thumb-gallery">
                                ${c.map(t=>`
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
    `;d.document.open(),d.document.write(F),d.document.close()}export{G as b,X as g};
