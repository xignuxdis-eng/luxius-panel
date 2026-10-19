import{u as Ae,r,j as e}from"./vendor-core-DBGOFPtt-1792408604402.js";import{u as De,y as ze,G as Te,l as K,H as Me,o as Ee,q as Z}from"./index-5vzlDg3E-1792408604402.js";import{X as Ie}from"./logoBase64Light-C-oYOwEg-1792408604402.js";import"./vendor-pixi-Bqig5NkX-1792408604402.js";import"./vendor-icons-BUbkKc4T-1792408604402.js";const ee=Ie;function Re(i){const s=l=>{switch(l){case"m2":return"m²";case"ml":return"ml";case"u":return"Unid.";case"global":return"Global";case"lote":return"Lote";default:return l}},c=i.items.map(l=>`
        <tr>
            <td style="padding: 10px 12px; text-align: left; color: #1e293b; font-weight: 500; border-bottom: 1px solid #e2e8f0;">${l.concepto}</td>
            <td style="padding: 10px 12px; text-align: center; color: #334155; border-bottom: 1px solid #e2e8f0;">${l.cantidad} ${s(l.unidadMedida)}</td>
            <td style="padding: 10px 12px; text-align: right; color: #334155; border-bottom: 1px solid #e2e8f0;">$${l.precioUnitario.toLocaleString("es-AR",{minimumFractionDigits:2})}</td>
            <td style="padding: 10px 12px; text-align: right; color: #1e293b; font-weight: 600; border-bottom: 1px solid #e2e8f0;">$${l.subtotal.toLocaleString("es-AR",{minimumFractionDigits:2})}</td>
        </tr>
    `).join("");return`
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Presupuesto N° ${i.numeroPresupuesto}</title>
    <style>
        body {
            font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            margin: 0;
            padding: 40px;
            color: #1e293b;
            background-color: #ffffff;
            position: relative;
        }
        .watermark {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            opacity: 0.05;
            width: 400px;
            z-index: -1;
            pointer-events: none;
        }
        .header {
            text-align: center;
            margin-bottom: 20px;
        }
        .header img {
            height: 120px;
            object-fit: contain;
            margin-bottom: 15px;
        }
        .header h1 {
            font-size: 20px;
            color: #1e293b;
            margin: 0 0 4px 0;
            text-transform: uppercase;
            letter-spacing: 1px;
            font-weight: 700;
        }
        .header p {
            margin: 2px 0;
            font-size: 13px;
            color: #475569;
        }
        .divider {
            height: 2px;
            background-color: #1e293b;
            margin: 20px 0;
        }
        .meta-container {
            display: flex;
            justify-content: space-between;
            margin-bottom: 30px;
            font-size: 13px;
        }
        .meta-left h3, .meta-right h3 {
            font-size: 10px;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin: 0 0 8px 0;
        }
        .meta-right {
            text-align: right;
        }
        .meta-right h2 {
            font-size: 18px;
            margin: 0 0 4px 0;
            color: #1e293b;
            text-transform: uppercase;
            font-weight: 700;
        }
        .meta-right .doc-name {
            font-family: monospace;
            color: #475569;
            margin-bottom: 12px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
        }
        th {
            background-color: #1e293b;
            color: #ffffff;
            font-size: 11px;
            text-transform: uppercase;
            padding: 10px 12px;
            font-weight: 600;
            letter-spacing: 0.5px;
        }
        .totals-container {
            width: 100%;
            display: flex;
            justify-content: flex-end;
            margin-bottom: 40px;
        }
        .totals-box {
            width: 400px;
            border: 1px solid #e2e8f0;
            border-radius: 4px;
            overflow: hidden;
        }
        .totals-row {
            display: flex;
            justify-content: space-between;
            padding: 12px 16px;
            font-size: 13px;
            color: #334155;
            background: #f8fafc;
        }
        .totals-row:not(:last-child) {
            border-bottom: 1px solid #e2e8f0;
        }
        .total-row-bold {
            font-weight: 700;
            color: #1e293b;
            background: #f1f5f9;
        }
        .total-final {
            background-color: #1e293b;
            color: #ffffff;
            font-weight: 700;
            font-size: 15px;
        }
        .footer {
            text-align: center;
            font-style: italic;
            color: #64748b;
            font-size: 11px;
            margin-top: 40px;
            line-height: 1.5;
        }
    </style>
</head>
<body>
    <img src="${ee}" class="watermark" />

    <div class="header">
        <img src="${ee}" alt="XignuX Logo" />
        <h2 style="font-size: 14px; font-weight: 700; margin: 6px 0 3px 0; color: #1e2433;">Servicios Gráficos e Impresión Digital Profesional</h2>
        <p>José V. Cardozo 912, Córdoba · Tel: 3517897667/3517717071 · xignux.dis@gmail.com</p>
    </div>

    <div class="divider"></div>

    <div class="meta-container">
        <div class="meta-left">
            <h3>Datos del Cliente</h3>
            <div style="margin-bottom: 4px;"><strong>Razón Social:</strong> ${i.clienteNombre}</div>
            ${i.clienteEmpresa?`<div style="margin-bottom: 4px;"><strong>Empresa:</strong> ${i.clienteEmpresa}</div>`:""}
            ${i.clienteEmail?`<div style="margin-bottom: 4px;"><strong>Email:</strong> ${i.clienteEmail}</div>`:""}
        </div>
        <div class="meta-right">
            <h2>PRESUPUESTO</h2>
            <div class="doc-name">Presupuesto_XignuX_${i.numeroPresupuesto}_v1.pdf</div>
            <div style="margin-bottom: 12px;">Fecha: ${i.fecha}</div>
            <div style="font-weight: 700; font-size: 14px; text-transform: uppercase; color: #475569; margin-top: 10px;">${i.vendedorNombre}</div>
        </div>
    </div>

    <table>
        <thead>
            <tr>
                <th style="text-align: left;">Ítem</th>
                <th style="text-align: center;">Cant</th>
                <th style="text-align: right;">P. Unit</th>
                <th style="text-align: right;">Subtotal</th>
            </tr>
        </thead>
        <tbody>
            ${c}
        </tbody>
    </table>

    <div class="totals-container">
        <div class="totals-box">
            <div class="totals-row">
                <span>Subtotal:</span>
                <span>$${i.subtotal.toLocaleString("es-AR",{minimumFractionDigits:2})}</span>
            </div>
            ${i.descuento>0?`
            <div class="totals-row">
                <span>Bonificación:</span>
                <span>-$${i.descuento.toLocaleString("es-AR",{minimumFractionDigits:2})}</span>
            </div>
            `:""}
            <div class="totals-row total-row-bold">
                <span>TOTAL GENERAL:</span>
                <span>$${i.total.toLocaleString("es-AR",{minimumFractionDigits:2})}</span>
            </div>
            <div class="totals-row" style="color: #10b981;">
                <span>Seña Pactada (50%):</span>
                <span>$${(i.total*.5).toLocaleString("es-AR",{minimumFractionDigits:2})}</span>
            </div>
            <div class="totals-row total-final">
                <span>SALDO RESTANTE:</span>
                <span>$${(i.total*.5).toLocaleString("es-AR",{minimumFractionDigits:2})}</span>
            </div>
            <div style="margin-top: 10px; padding: 8px 12px; background: #f1f5f9; border: 1px dashed #cbd5e1; border-radius: 6px; font-size: 11px; color: #334155; line-height: 1.5;">
                <strong>Datos para Transferencia:</strong><br>
                CBU / Alias: <code style="background: #e2e8f0; padding: 1px 5px; border-radius: 3px;">a.flores.24</code><br>
                Titular: Adrian Flores
            </div>
        </div>
    </div>

    ${i.observaciones?`
    <div style="font-size: 12px; color: #334155; border-left: 3px solid #1e293b; padding-left: 12px; margin-bottom: 20px;">
        <strong>Observaciones:</strong><br/>${i.observaciones}
    </div>
    `:""}

    <div class="footer">
        Condiciones comerciales: Presupuesto válido por ${i.validezDias} días a partir de la fecha de emisión. La producción inicia con la acreditación de la seña. Los tiempos de entrega son pactados con el cliente.
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
    `}function Oe(i){const s=Re(i),c=window.open("","_blank");c&&(c.document.write(s),c.document.close(),c.focus())}function Be(){var Q;const i=Ae(),{user:s}=De(),c=ze(),l=Te().filter(t=>t.habilitado!==!1),k=r.useMemo(()=>{const t=K().filter(n=>n.habilitado!==!1&&!["tinta","solvente","insumo"].includes((n.tipo||"").toLowerCase())),o=new Set;return t.filter(n=>{const a=n.descripcion||n.codigo;return o.has(a)?!1:(o.add(a),!0)}).sort((n,a)=>(n.descripcion||n.codigo).localeCompare(a.descripcion||a.codigo))},[]),U=r.useMemo(()=>Me().filter(t=>t.habilitado!==!1),[]),[g,te]=r.useState(((Q=c[0])==null?void 0:Q.id)||""),[p,F]=r.useState(""),[y,x]=r.useState(!1),S=r.useRef(null);r.useEffect(()=>{const t=o=>{S.current&&!S.current.contains(o.target)&&x(!1)};return document.addEventListener("mousedown",t),()=>document.removeEventListener("mousedown",t)},[]);const[G,oe]=r.useState(15),[w,se]=r.useState(0),[P,ae]=r.useState(""),[$,re]=r.useState(`P-${Math.floor(1e3+Math.random()*9e3)}`),[d,b]=r.useState([]),[u,L]=r.useState("catalog"),[f,ne]=r.useState(null),[m,ie]=r.useState(""),[v,le]=r.useState("Todas"),[j,ce]=r.useState(1),[h,W]=r.useState(""),de=r.useMemo(()=>{const t=new Set;return l.forEach(o=>{o.categoria&&t.add(o.categoria)}),["Todas",...Array.from(t)]},[l]),B=r.useMemo(()=>l.filter(t=>{const o=v==="Todas"||t.categoria===v,n=!m||t.nombre.toLowerCase().includes(m.toLowerCase())||(t.descripcion||"").toLowerCase().includes(m.toLowerCase())||(t.materialCodigo||"").toLowerCase().includes(m.toLowerCase())||(t.componentes||[]).some(a=>(a.nombre||"").toLowerCase().includes(m.toLowerCase()));return o&&n}),[l,v,m]),[C,me]=r.useState(()=>{const t=k[0];return t?t.descripcion||t.codigo:"Lona Front Light 13oz"}),[X,pe]=r.useState(()=>{const t=U[0];return t?t.nombre:"Estándar 720DPI"}),[A,ue]=r.useState(1),[D,he]=r.useState(1),[z,ge]=r.useState(1),[T,_]=r.useState(12e3),[M,V]=r.useState(""),[H,xe]=r.useState("u"),[E,be]=r.useState(1),[I,fe]=r.useState(15e3);r.useEffect(()=>{const o=K().find(n=>(n.descripcion||n.codigo)===C);o&&o.precioM2&&_(o.precioM2)},[C]);const ve=t=>{t.preventDefault();const o=(A||1)*(D||1),n=o*z*T,a={id:`item-${Date.now()}`,concepto:`${C} (${X}) - ${A}x${D}m`,unidadMedida:"m2",cantidad:Math.round(o*z*100)/100,precioUnitario:T,subtotal:n,isCustom:!1};b([...d,a])},N=t=>t.precioFinal??t.precioSugerido??0,q=t=>{var o;return t.materialCodigo||((o=(t.componentes||[]).find(n=>n.tipo==="material"))==null?void 0:o.nombre)||""},R=t=>(t.componentes||[]).filter(o=>o.tipo==="servicio").map(o=>o.nombre),je=t=>{ne(t.id),W(N(t))},Ce=t=>{t.preventDefault();const o=l.find(Le=>Le.id===f);if(!o){alert("Por favor seleccione una promo o combo de la lista.");return}const n=typeof h=="number"?h:N(o),a=j>0?j:1,Pe=a*n,Y=R(o),$e={id:`item-combo-${Date.now()}`,concepto:`[PROMO] ${o.nombre} (${o.ancho}x${o.alto}m - ${q(o)}${Y.length>0?" + "+Y.join(", "):""})`,unidadMedida:"u",cantidad:a,precioUnitario:n,subtotal:Pe,isCustom:!1};b([...d,$e])},Ne=t=>{if(t.preventDefault(),!M.trim()){alert("Por favor ingrese una descripción para el trabajo especial.");return}const o=(E||1)*(I||0),n={id:`item-${Date.now()}`,concepto:M.trim(),unidadMedida:H,cantidad:E,precioUnitario:I,subtotal:o,isCustom:!0};b([...d,n]),V("")},ye=t=>{b(d.filter(o=>o.id!==t))},O=d.reduce((t,o)=>t+o.subtotal,0),J=Math.max(0,O-w),Se=()=>{if(d.length===0){alert("Agregue al menos un ítem al presupuesto para generar el PDF.");return}const t=c.find(n=>n.id===Number(g)),o={numeroPresupuesto:$,fecha:new Date().toLocaleDateString("es-AR"),validezDias:G,clienteNombre:(t==null?void 0:t.nombre)||"Cliente General",clienteEmpresa:(t==null?void 0:t.empresa)||"",clienteTelefono:(t==null?void 0:t.telefono)||"",clienteEmail:(t==null?void 0:t.email)||"",items:d,subtotal:O,descuento:w,total:J,observaciones:P,vendedorNombre:(s==null?void 0:s.name)||"Ventas"};Oe(o)},we=()=>{if(d.length===0){alert("No hay ítems para convertir a Orden de Trabajo.");return}const t=c.find(a=>a.id===Number(g)),o=(t==null?void 0:t.nombre)||"Cliente General";let n=0;d.forEach(a=>{Ee({clientId:Number(g)||1,clienteNombre:o,status:"diseno",nombreTarea:a.concepto,origen:"web",material:a.isCustom?"TRABAJO ESPECIAL":a.concepto.split(" - ")[0],calidad:"Estándar",alto:1,ancho:1,copias:a.cantidad,subtotal:a.subtotal,demasias:0,accesorios:[],laminado:!1,bordado:!1,panelizado:!1,portabanners:0,envio:"retiro",emergencia:!1,fechaCreacion:new Date().toISOString(),fechaEntrega:new Date(Date.now()+864e5*3).toISOString(),observaciones:`${P} [Cotización: ${$}]`,observaciones2:"",archivos:[],vendedorNombre:(s==null?void 0:s.name)||"Ventas",operarioNombre:Z(s==null?void 0:s.role)?(s==null?void 0:s.name)||(s==null?void 0:s.username):s==null?void 0:s.name,artistaId:Z(s==null?void 0:s.role)?s==null?void 0:s.id:void 0,creadoPor:(s==null?void 0:s.username)||(s!=null&&s.id?String(s==null?void 0:s.id):void 0),usuarioId:s==null?void 0:s.id,isCustom:a.isCustom,conceptoPersonalizado:a.isCustom?a.concepto:void 0,unidadMedida:a.unidadMedida,precioUnitarioManual:a.precioUnitario}),n++}),alert(`✅ ¡Éxito! Se han generado ${n} Órdenes de Trabajo en el sistema.`),i("/entrada")};return e.jsxs("div",{className:"presupuestador-page",children:[e.jsx("div",{className:"presupuestador-header",children:e.jsxs("div",{className:"presupuestador-title",children:[e.jsx("h1",{children:"🧮 Presupuestador & Cotizador de Trabajos"}),e.jsx("p",{children:"Genere cotizaciones formales para clientes incluyendo ítems de imprenta e ítems especiales / tercerizados."})]})}),e.jsxs("div",{className:"presupuestador-grid",children:[e.jsxs("div",{children:[e.jsxs("div",{className:"card-panel",children:[e.jsx("h2",{children:"👤 Datos del Cliente y Presupuesto"}),e.jsxs("div",{className:"form-grid-2",children:[e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Cliente"}),e.jsxs("div",{className:"relative",ref:S,children:[e.jsx("input",{type:"text",className:"form-input",placeholder:"Buscar cliente por nombre o empresa...",value:y?p:(()=>{const t=c.find(o=>String(o.id)===String(g));return t?`${t.nombre} (${t.empresa||"Particular"})`:""})(),onChange:t=>{F(t.target.value),y||x(!0)},onFocus:()=>{F(""),x(!0)}}),y&&e.jsxs("div",{className:"absolute z-50 w-full mt-1 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-md shadow-lg max-h-60 overflow-y-auto",style:{zIndex:9999},children:[c.filter(t=>t.nombre.toLowerCase().includes(p.toLowerCase())||(t.empresa||"").toLowerCase().includes(p.toLowerCase())).map(t=>e.jsxs("div",{className:"px-3 py-2 cursor-pointer hover:bg-[var(--primary-color)] hover:text-white border-b border-[var(--border-color)] last:border-0",onClick:()=>{te(Number(t.id)),x(!1)},children:[e.jsx("div",{style:{fontWeight:"bold"},children:t.nombre}),e.jsx("div",{style:{fontSize:"0.8rem",opacity:.8},children:t.empresa||"Particular"})]},t.id)),c.filter(t=>t.nombre.toLowerCase().includes(p.toLowerCase())||(t.empresa||"").toLowerCase().includes(p.toLowerCase())).length===0&&e.jsx("div",{className:"px-3 py-2 text-sm opacity-50",children:"No se encontraron clientes"})]})]})]}),e.jsxs("div",{className:"form-grid-2",children:[e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"N° Presupuesto"}),e.jsx("input",{type:"text",className:"form-input",value:$,onChange:t=>re(t.target.value)})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Validez (Días)"}),e.jsx("input",{type:"number",className:"form-input",value:G,onChange:t=>oe(Number(t.target.value))})]})]})]})]}),e.jsxs("div",{className:"card-panel",children:[e.jsx("h2",{children:"➕ Agregar Ítem al Presupuesto"}),e.jsxs("div",{className:"item-tabs",children:[e.jsx("button",{type:"button",className:`item-tab-btn ${u==="catalog"?"active":""}`,onClick:()=>L("catalog"),children:"🖨️ Impresión de Catálogo"}),e.jsxs("button",{type:"button",className:`item-tab-btn ${u==="combos"?"active":""}`,onClick:()=>L("combos"),children:["🎁 Promos y Combos (",l.length,")"]}),e.jsx("button",{type:"button",className:`item-tab-btn ${u==="custom"?"active":""}`,onClick:()=>L("custom"),children:"📦 Trabajo Especial / Tercerizado"})]}),u==="catalog"?e.jsxs("form",{onSubmit:ve,children:[e.jsxs("div",{className:"form-grid-2",children:[e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Material"}),e.jsx("select",{className:"form-select",value:C,onChange:t=>me(t.target.value),children:k.map(t=>e.jsx("option",{value:t.descripcion||t.codigo,children:t.descripcion||t.codigo},t.id))})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Calidad de Impresión"}),e.jsx("select",{className:"form-select",value:X,onChange:t=>pe(t.target.value),children:U.map(t=>e.jsx("option",{value:t.nombre,children:t.nombre},t.id))})]})]}),e.jsxs("div",{className:"form-grid-3",children:[e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Ancho (m)"}),e.jsx("input",{type:"number",step:"0.01",className:"form-input",value:A,onChange:t=>ue(Number(t.target.value))})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Alto (m)"}),e.jsx("input",{type:"number",step:"0.01",className:"form-input",value:D,onChange:t=>he(Number(t.target.value))})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Cantidad / Copias"}),e.jsx("input",{type:"number",min:"1",className:"form-input",value:z,onChange:t=>ge(Number(t.target.value))})]})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Precio m² ($)"}),e.jsx("input",{type:"number",className:"form-input",value:T,onChange:t=>_(Number(t.target.value))})]}),e.jsx("button",{type:"submit",className:"btn-add",children:"➕ Agregar Ítem de Imprenta"})]}):u==="combos"?e.jsxs("div",{className:"presupuesto-combos-container",children:[e.jsx("div",{className:"presupuesto-combos-search-bar",children:e.jsx("input",{type:"text",className:"form-input",placeholder:"🔍 Buscar combo o promo por nombre o material...",value:m,onChange:t=>ie(t.target.value),style:{flex:1}})}),e.jsx("div",{className:"presupuesto-combos-categories",children:de.map(t=>e.jsx("button",{type:"button",className:`presupuesto-cat-pill ${v===t?"active":""}`,onClick:()=>le(t),children:t},t))}),B.length===0?e.jsx("p",{style:{color:"#94a3b8",fontStyle:"italic",textAlign:"center",padding:"20px"},children:"No se encontraron combos o promociones con ese criterio."}):e.jsx("div",{className:"presupuesto-combos-grid",children:B.map(t=>{const o=f===t.id;return e.jsxs("div",{className:`presupuesto-combo-card ${o?"selected":""}`,onClick:()=>je(t),children:[e.jsxs("div",{className:"presupuesto-combo-header",children:[e.jsxs("h3",{className:"presupuesto-combo-name",children:["🎁 ",t.nombre]}),t.categoria&&e.jsx("span",{className:"presupuesto-combo-badge",children:t.categoria})]}),e.jsxs("div",{className:"presupuesto-combo-details",children:[e.jsxs("div",{children:["📐 ",e.jsx("strong",{children:"Medida:"})," ",t.ancho,"m x ",t.alto,"m"]}),e.jsxs("div",{children:["🎨 ",e.jsx("strong",{children:"Material:"})," ",q(t)||"—"]}),R(t).length>0&&e.jsxs("div",{children:["⚙️ ",e.jsx("strong",{children:"Incluye:"})," ",R(t).join(", ")]}),t.descripcion&&e.jsx("div",{style:{fontStyle:"italic",opacity:.8},children:t.descripcion})]}),e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:"6px"},children:[e.jsxs("span",{className:"presupuesto-combo-price",children:["$",N(t).toLocaleString("es-AR")]}),e.jsx("span",{style:{fontSize:"12px",color:o?"var(--primary-color, #6366f1)":"var(--text-secondary)",fontWeight:600},children:o?"✓ Seleccionado":"Seleccionar"})]})]},t.id)})}),f&&(()=>{const t=l.find(a=>a.id===f);if(!t)return null;const o=typeof h=="number"?h:N(t),n=(j||1)*o;return e.jsxs("form",{onSubmit:Ce,className:"presupuesto-combo-action-box",children:[e.jsxs("div",{style:{fontSize:"13px",fontWeight:700,color:"var(--text-primary)",marginBottom:"10px"},children:["Configurar Combo: ",e.jsx("span",{style:{color:"var(--accent-color, #818cf8)"},children:t.nombre})]}),e.jsxs("div",{className:"form-grid-2",children:[e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Cantidad de Packs / Combos"}),e.jsx("input",{type:"number",min:"1",className:"form-input",value:j,onChange:a=>ce(Math.max(1,Number(a.target.value)))})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Precio Unitario Cotizado ($)"}),e.jsx("input",{type:"number",className:"form-input",value:h,onChange:a=>W(a.target.value===""?"":Number(a.target.value))})]})]}),e.jsxs("button",{type:"submit",className:"btn-add",style:{background:"linear-gradient(135deg, #db2777, #ec4899)",marginTop:"8px"},children:["🎁 Agregar Combo al Presupuesto ($",n.toLocaleString("es-AR"),")"]})]})})()]}):e.jsxs("form",{onSubmit:Ne,children:[e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Descripción / Concepto del Trabajo Especial"}),e.jsx("input",{type:"text",className:"form-input",placeholder:"Ej: Cartel Letras Corpóreas en Polifan con Luz LED",value:M,onChange:t=>V(t.target.value),required:!0})]}),e.jsxs("div",{className:"form-grid-3",children:[e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Unidad de Medida"}),e.jsxs("select",{className:"form-select",value:H,onChange:t=>xe(t.target.value),children:[e.jsx("option",{value:"u",children:"Unidades (u)"}),e.jsx("option",{value:"m2",children:"Metros Cuadrados (m²)"}),e.jsx("option",{value:"ml",children:"Metros Lineales (ml)"}),e.jsx("option",{value:"global",children:"Trabajo Global"}),e.jsx("option",{value:"lote",children:"Lote Completo"})]})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Cantidad"}),e.jsx("input",{type:"number",min:"1",step:"0.1",className:"form-input",value:E,onChange:t=>be(Number(t.target.value))})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Precio Unitario ($)"}),e.jsx("input",{type:"number",className:"form-input",value:I,onChange:t=>fe(Number(t.target.value))})]})]}),e.jsx("button",{type:"submit",className:"btn-add",children:"📦 Agregar Ítem Especial / Tercerizado"})]})]}),e.jsxs("div",{className:"card-panel",children:[e.jsxs("h2",{children:["📋 Renglones del Presupuesto (",d.length,")"]}),d.length===0?e.jsx("p",{style:{color:"#94a3b8",fontStyle:"italic",textAlign:"center",padding:"20px 0"},children:"No hay ítems agregados a la cotización todavía. Use el formulario superior para añadir productos."}):e.jsxs("table",{className:"items-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"#"}),e.jsx("th",{children:"Tipo"}),e.jsx("th",{children:"Concepto"}),e.jsx("th",{children:"Cant. / Unidad"}),e.jsx("th",{children:"P. Unitario"}),e.jsx("th",{children:"Subtotal"}),e.jsx("th",{children:"Acciones"})]})}),e.jsx("tbody",{children:d.map((t,o)=>e.jsxs("tr",{children:[e.jsx("td",{children:o+1}),e.jsx("td",{children:t.concepto.startsWith("[PROMO]")?e.jsx("span",{style:{background:"#ec4899",color:"#fff",fontSize:"11px",fontWeight:700,padding:"2px 6px",borderRadius:"4px"},children:"PROMO"}):t.isCustom?e.jsx("span",{style:{background:"#f59e0b",color:"#000",fontSize:"11px",fontWeight:700,padding:"2px 6px",borderRadius:"4px"},children:"ESPECIAL"}):e.jsx("span",{style:{background:"#6366f1",color:"#fff",fontSize:"11px",fontWeight:700,padding:"2px 6px",borderRadius:"4px"},children:"CATÁLOGO"})}),e.jsx("td",{children:e.jsx("strong",{children:t.concepto})}),e.jsxs("td",{children:[t.cantidad," ",t.unidadMedida]}),e.jsxs("td",{children:["$",t.precioUnitario.toLocaleString("es-AR")]}),e.jsx("td",{children:e.jsxs("strong",{children:["$",t.subtotal.toLocaleString("es-AR")]})}),e.jsx("td",{children:e.jsx("button",{type:"button",className:"btn-danger-outline",onClick:()=>ye(t.id),children:"✕ Quitar"})})]},t.id))})]})]})]}),e.jsx("div",{children:e.jsxs("div",{className:"card-panel summary-card",children:[e.jsx("h2",{children:"💰 Resumen de Cotización"}),e.jsxs("div",{className:"summary-row",children:[e.jsx("span",{children:"Subtotal:"}),e.jsxs("span",{children:["$",O.toLocaleString("es-AR",{minimumFractionDigits:2})]})]}),e.jsxs("div",{className:"form-group",style:{marginTop:"12px"},children:[e.jsx("label",{children:"Bonificación / Descuento ($)"}),e.jsx("input",{type:"number",className:"form-input",value:w,onChange:t=>se(Number(t.target.value))})]}),e.jsxs("div",{className:"summary-total",children:[e.jsx("span",{children:"Total Neto:"}),e.jsxs("span",{children:["$",J.toLocaleString("es-AR",{minimumFractionDigits:2})]})]}),e.jsxs("div",{className:"form-group",style:{marginTop:"16px"},children:[e.jsx("label",{children:"Observaciones / Notas para Cliente"}),e.jsx("textarea",{className:"form-textarea",rows:3,placeholder:"Aclaraciones comerciales o plazos de entrega...",value:P,onChange:t=>ae(t.target.value)})]}),e.jsxs("div",{className:"summary-actions",children:[e.jsx("button",{type:"button",className:"btn-pdf",onClick:Se,children:"📄 Generar PDF Presupuesto"}),e.jsx("button",{type:"button",className:"btn-convert",onClick:we,children:"🚀 Convertir a Orden de Trabajo"})]})]})})]})]})}export{Be as default};
