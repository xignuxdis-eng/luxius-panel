import{d as Se,r as s,j as e}from"./vendor-core-BkkfFQ9v-1791685794610.js";import{u as we,d as $e,l as Pe,e as q,g as Le,c as Ae}from"./index-Cs1uzS8M-1791685794610.js";import{X as ze}from"./logoBase64Light-C-oYOwEg-1791685794610.js";import"./vendor-icons-B5LbwCP3-1791685794610.js";const J=ze;function De(i){const d=n=>{switch(n){case"m2":return"m²";case"ml":return"ml";case"u":return"Unid.";case"global":return"Global";case"lote":return"Lote";default:return n}},l=i.items.map((n,N)=>`
        <tr>
            <td style="padding: 10px 12px; text-align: left; color: #1e293b; font-weight: 500; border-bottom: 1px solid #e2e8f0;">${n.concepto}</td>
            <td style="padding: 10px 12px; text-align: center; color: #334155; border-bottom: 1px solid #e2e8f0;">${n.cantidad} ${d(n.unidadMedida)}</td>
            <td style="padding: 10px 12px; text-align: right; color: #334155; border-bottom: 1px solid #e2e8f0;">$${n.precioUnitario.toLocaleString("es-AR",{minimumFractionDigits:2})}</td>
            <td style="padding: 10px 12px; text-align: right; color: #1e293b; font-weight: 600; border-bottom: 1px solid #e2e8f0;">$${n.subtotal.toLocaleString("es-AR",{minimumFractionDigits:2})}</td>
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
    <img src="${J}" class="watermark" />

    <div class="header">
        <img src="${J}" alt="XignuX Logo" />
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
            ${l}
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
    `}function Te(i){const d=De(i),l=window.open("","_blank");l&&(l.document.write(d),l.document.close(),l.focus())}function Oe(){var H;const i=Se(),{user:d}=we(),l=$e(),n=Pe().filter(t=>t.activo!==!1),N=s.useMemo(()=>{const t=q().filter(r=>r.habilitado!==!1&&!["tinta","solvente","insumo"].includes((r.tipo||"").toLowerCase())),o=new Set;return t.filter(r=>{const a=r.descripcion||r.codigo;return o.has(a)?!1:(o.add(a),!0)}).sort((r,a)=>(r.descripcion||r.codigo).localeCompare(a.descripcion||a.codigo))},[]),O=s.useMemo(()=>Le().filter(t=>t.habilitado!==!1),[]),[g,Q]=s.useState(((H=l[0])==null?void 0:H.id)||""),[p,k]=s.useState(""),[y,x]=s.useState(!1),S=s.useRef(null);s.useEffect(()=>{const t=o=>{S.current&&!S.current.contains(o.target)&&x(!1)};return document.addEventListener("mousedown",t),()=>document.removeEventListener("mousedown",t)},[]);const[U,Y]=s.useState(15),[w,K]=s.useState(0),[$,Z]=s.useState(""),[P,ee]=s.useState(`P-${Math.floor(1e3+Math.random()*9e3)}`),[c,b]=s.useState([]),[u,L]=s.useState("catalog"),[f,te]=s.useState(null),[m,oe]=s.useState(""),[v,se]=s.useState("Todas"),[j,ae]=s.useState(1),[h,F]=s.useState(""),re=s.useMemo(()=>{const t=new Set;return n.forEach(o=>{o.categoria&&t.add(o.categoria)}),["Todas",...Array.from(t)]},[n]),G=s.useMemo(()=>n.filter(t=>{const o=v==="Todas"||t.categoria===v,r=!m||t.nombre.toLowerCase().includes(m.toLowerCase())||(t.descripcion||"").toLowerCase().includes(m.toLowerCase())||(t.material||"").toLowerCase().includes(m.toLowerCase());return o&&r}),[n,v,m]),[C,ie]=s.useState(()=>{const t=N[0];return t?t.descripcion||t.codigo:"Lona Front Light 13oz"}),[W,ne]=s.useState(()=>{const t=O[0];return t?t.nombre:"Estándar 720DPI"}),[A,le]=s.useState(1),[z,ce]=s.useState(1),[D,de]=s.useState(1),[T,B]=s.useState(12e3),[E,X]=s.useState(""),[_,me]=s.useState("u"),[M,pe]=s.useState(1),[R,ue]=s.useState(15e3);s.useEffect(()=>{const o=q().find(r=>(r.descripcion||r.codigo)===C);o&&o.precioM2&&B(o.precioM2)},[C]);const he=t=>{t.preventDefault();const o=(A||1)*(z||1),r=o*D*T,a={id:`item-${Date.now()}`,concepto:`${C} (${W}) - ${A}x${z}m`,unidadMedida:"m2",cantidad:Math.round(o*D*100)/100,precioUnitario:T,subtotal:r,isCustom:!1};b([...c,a])},ge=t=>{te(t.id),F(t.precio)},xe=t=>{t.preventDefault();const o=n.find(ye=>ye.id===f);if(!o){alert("Por favor seleccione una promo o combo de la lista.");return}const r=typeof h=="number"?h:o.precio,a=j>0?j:1,Ce=a*r,Ne={id:`item-combo-${Date.now()}`,concepto:`[PROMO] ${o.nombre} (${o.ancho}x${o.alto}m - ${o.material}${o.servicios&&o.servicios.length>0?" + "+o.servicios.join(", "):""})`,unidadMedida:"u",cantidad:a,precioUnitario:r,subtotal:Ce,isCustom:!1};b([...c,Ne])},be=t=>{if(t.preventDefault(),!E.trim()){alert("Por favor ingrese una descripción para el trabajo especial.");return}const o=(M||1)*(R||0),r={id:`item-${Date.now()}`,concepto:E.trim(),unidadMedida:_,cantidad:M,precioUnitario:R,subtotal:o,isCustom:!0};b([...c,r]),X("")},fe=t=>{b(c.filter(o=>o.id!==t))},I=c.reduce((t,o)=>t+o.subtotal,0),V=Math.max(0,I-w),ve=()=>{if(c.length===0){alert("Agregue al menos un ítem al presupuesto para generar el PDF.");return}const t=l.find(r=>r.id===Number(g)),o={numeroPresupuesto:P,fecha:new Date().toLocaleDateString("es-AR"),validezDias:U,clienteNombre:(t==null?void 0:t.nombre)||"Cliente General",clienteEmpresa:(t==null?void 0:t.empresa)||"",clienteTelefono:(t==null?void 0:t.telefono)||"",clienteEmail:(t==null?void 0:t.email)||"",items:c,subtotal:I,descuento:w,total:V,observaciones:$,vendedorNombre:(d==null?void 0:d.name)||"Ventas"};Te(o)},je=()=>{if(c.length===0){alert("No hay ítems para convertir a Orden de Trabajo.");return}const t=l.find(a=>a.id===Number(g)),o=(t==null?void 0:t.nombre)||"Cliente General";let r=0;c.forEach(a=>{Ae({clientId:Number(g)||1,clienteNombre:o,status:"diseno",nombreTarea:a.concepto,origen:"web",material:a.isCustom?"TRABAJO ESPECIAL":a.concepto.split(" - ")[0],calidad:"Estándar",alto:1,ancho:1,copias:a.cantidad,subtotal:a.subtotal,demasias:0,accesorios:[],laminado:!1,bordado:!1,panelizado:!1,portabanners:0,envio:"retiro",emergencia:!1,fechaCreacion:new Date().toISOString(),fechaEntrega:new Date(Date.now()+864e5*3).toISOString(),observaciones:`${$} [Cotización: ${P}]`,observaciones2:"",archivos:[],vendedorNombre:(d==null?void 0:d.name)||"Ventas",isCustom:a.isCustom,conceptoPersonalizado:a.isCustom?a.concepto:void 0,unidadMedida:a.unidadMedida,precioUnitarioManual:a.precioUnitario}),r++}),alert(`✅ ¡Éxito! Se han generado ${r} Órdenes de Trabajo en el sistema.`),i("/entrada")};return e.jsxs("div",{className:"presupuestador-page",children:[e.jsx("div",{className:"presupuestador-header",children:e.jsxs("div",{className:"presupuestador-title",children:[e.jsx("h1",{children:"🧮 Presupuestador & Cotizador de Trabajos"}),e.jsx("p",{children:"Genere cotizaciones formales para clientes incluyendo ítems de imprenta e ítems especiales / tercerizados."})]})}),e.jsxs("div",{className:"presupuestador-grid",children:[e.jsxs("div",{children:[e.jsxs("div",{className:"card-panel",children:[e.jsx("h2",{children:"👤 Datos del Cliente y Presupuesto"}),e.jsxs("div",{className:"form-grid-2",children:[e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Cliente"}),e.jsxs("div",{className:"relative",ref:S,children:[e.jsx("input",{type:"text",className:"form-input",placeholder:"Buscar cliente por nombre o empresa...",value:y?p:(()=>{const t=l.find(o=>String(o.id)===String(g));return t?`${t.nombre} (${t.empresa||"Particular"})`:""})(),onChange:t=>{k(t.target.value),y||x(!0)},onFocus:()=>{k(""),x(!0)}}),y&&e.jsxs("div",{className:"absolute z-50 w-full mt-1 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-md shadow-lg max-h-60 overflow-y-auto",style:{zIndex:9999},children:[l.filter(t=>t.nombre.toLowerCase().includes(p.toLowerCase())||(t.empresa||"").toLowerCase().includes(p.toLowerCase())).map(t=>e.jsxs("div",{className:"px-3 py-2 cursor-pointer hover:bg-[var(--primary-color)] hover:text-white border-b border-[var(--border-color)] last:border-0",onClick:()=>{Q(Number(t.id)),x(!1)},children:[e.jsx("div",{style:{fontWeight:"bold"},children:t.nombre}),e.jsx("div",{style:{fontSize:"0.8rem",opacity:.8},children:t.empresa||"Particular"})]},t.id)),l.filter(t=>t.nombre.toLowerCase().includes(p.toLowerCase())||(t.empresa||"").toLowerCase().includes(p.toLowerCase())).length===0&&e.jsx("div",{className:"px-3 py-2 text-sm opacity-50",children:"No se encontraron clientes"})]})]})]}),e.jsxs("div",{className:"form-grid-2",children:[e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"N° Presupuesto"}),e.jsx("input",{type:"text",className:"form-input",value:P,onChange:t=>ee(t.target.value)})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Validez (Días)"}),e.jsx("input",{type:"number",className:"form-input",value:U,onChange:t=>Y(Number(t.target.value))})]})]})]})]}),e.jsxs("div",{className:"card-panel",children:[e.jsx("h2",{children:"➕ Agregar Ítem al Presupuesto"}),e.jsxs("div",{className:"item-tabs",children:[e.jsx("button",{type:"button",className:`item-tab-btn ${u==="catalog"?"active":""}`,onClick:()=>L("catalog"),children:"🖨️ Impresión de Catálogo"}),e.jsxs("button",{type:"button",className:`item-tab-btn ${u==="combos"?"active":""}`,onClick:()=>L("combos"),children:["🎁 Promos y Combos (",n.length,")"]}),e.jsx("button",{type:"button",className:`item-tab-btn ${u==="custom"?"active":""}`,onClick:()=>L("custom"),children:"📦 Trabajo Especial / Tercerizado"})]}),u==="catalog"?e.jsxs("form",{onSubmit:he,children:[e.jsxs("div",{className:"form-grid-2",children:[e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Material"}),e.jsx("select",{className:"form-select",value:C,onChange:t=>ie(t.target.value),children:N.map(t=>e.jsx("option",{value:t.descripcion||t.codigo,children:t.descripcion||t.codigo},t.id))})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Calidad de Impresión"}),e.jsx("select",{className:"form-select",value:W,onChange:t=>ne(t.target.value),children:O.map(t=>e.jsx("option",{value:t.nombre,children:t.nombre},t.id))})]})]}),e.jsxs("div",{className:"form-grid-3",children:[e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Ancho (m)"}),e.jsx("input",{type:"number",step:"0.01",className:"form-input",value:A,onChange:t=>le(Number(t.target.value))})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Alto (m)"}),e.jsx("input",{type:"number",step:"0.01",className:"form-input",value:z,onChange:t=>ce(Number(t.target.value))})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Cantidad / Copias"}),e.jsx("input",{type:"number",min:"1",className:"form-input",value:D,onChange:t=>de(Number(t.target.value))})]})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Precio m² ($)"}),e.jsx("input",{type:"number",className:"form-input",value:T,onChange:t=>B(Number(t.target.value))})]}),e.jsx("button",{type:"submit",className:"btn-add",children:"➕ Agregar Ítem de Imprenta"})]}):u==="combos"?e.jsxs("div",{className:"presupuesto-combos-container",children:[e.jsx("div",{className:"presupuesto-combos-search-bar",children:e.jsx("input",{type:"text",className:"form-input",placeholder:"🔍 Buscar combo o promo por nombre o material...",value:m,onChange:t=>oe(t.target.value),style:{flex:1}})}),e.jsx("div",{className:"presupuesto-combos-categories",children:re.map(t=>e.jsx("button",{type:"button",className:`presupuesto-cat-pill ${v===t?"active":""}`,onClick:()=>se(t),children:t},t))}),G.length===0?e.jsx("p",{style:{color:"#94a3b8",fontStyle:"italic",textAlign:"center",padding:"20px"},children:"No se encontraron combos o promociones con ese criterio."}):e.jsx("div",{className:"presupuesto-combos-grid",children:G.map(t=>{const o=f===t.id;return e.jsxs("div",{className:`presupuesto-combo-card ${o?"selected":""}`,onClick:()=>ge(t),children:[e.jsxs("div",{className:"presupuesto-combo-header",children:[e.jsxs("h3",{className:"presupuesto-combo-name",children:[t.icono||"🎁"," ",t.nombre]}),t.categoria&&e.jsx("span",{className:"presupuesto-combo-badge",children:t.categoria})]}),e.jsxs("div",{className:"presupuesto-combo-details",children:[e.jsxs("div",{children:["📐 ",e.jsx("strong",{children:"Medida:"})," ",t.ancho,"m x ",t.alto,"m"]}),e.jsxs("div",{children:["🎨 ",e.jsx("strong",{children:"Material:"})," ",t.material]}),t.servicios&&t.servicios.length>0&&e.jsxs("div",{children:["⚙️ ",e.jsx("strong",{children:"Incluye:"})," ",t.servicios.join(", ")]}),t.descripcion&&e.jsx("div",{style:{fontStyle:"italic",opacity:.8},children:t.descripcion})]}),e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:"6px"},children:[e.jsxs("span",{className:"presupuesto-combo-price",children:["$",t.precio.toLocaleString("es-AR")]}),e.jsx("span",{style:{fontSize:"12px",color:o?"var(--primary-color, #6366f1)":"var(--text-secondary)",fontWeight:600},children:o?"✓ Seleccionado":"Seleccionar"})]})]},t.id)})}),f&&(()=>{const t=n.find(a=>a.id===f);if(!t)return null;const o=typeof h=="number"?h:t.precio,r=(j||1)*o;return e.jsxs("form",{onSubmit:xe,className:"presupuesto-combo-action-box",children:[e.jsxs("div",{style:{fontSize:"13px",fontWeight:700,color:"var(--text-primary)",marginBottom:"10px"},children:["Configurar Combo: ",e.jsx("span",{style:{color:"var(--accent-color, #818cf8)"},children:t.nombre})]}),e.jsxs("div",{className:"form-grid-2",children:[e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Cantidad de Packs / Combos"}),e.jsx("input",{type:"number",min:"1",className:"form-input",value:j,onChange:a=>ae(Math.max(1,Number(a.target.value)))})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Precio Unitario Cotizado ($)"}),e.jsx("input",{type:"number",className:"form-input",value:h,onChange:a=>F(a.target.value===""?"":Number(a.target.value))})]})]}),e.jsxs("button",{type:"submit",className:"btn-add",style:{background:"linear-gradient(135deg, #db2777, #ec4899)",marginTop:"8px"},children:["🎁 Agregar Combo al Presupuesto ($",r.toLocaleString("es-AR"),")"]})]})})()]}):e.jsxs("form",{onSubmit:be,children:[e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Descripción / Concepto del Trabajo Especial"}),e.jsx("input",{type:"text",className:"form-input",placeholder:"Ej: Cartel Letras Corpóreas en Polifan con Luz LED",value:E,onChange:t=>X(t.target.value),required:!0})]}),e.jsxs("div",{className:"form-grid-3",children:[e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Unidad de Medida"}),e.jsxs("select",{className:"form-select",value:_,onChange:t=>me(t.target.value),children:[e.jsx("option",{value:"u",children:"Unidades (u)"}),e.jsx("option",{value:"m2",children:"Metros Cuadrados (m²)"}),e.jsx("option",{value:"ml",children:"Metros Lineales (ml)"}),e.jsx("option",{value:"global",children:"Trabajo Global"}),e.jsx("option",{value:"lote",children:"Lote Completo"})]})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Cantidad"}),e.jsx("input",{type:"number",min:"1",step:"0.1",className:"form-input",value:M,onChange:t=>pe(Number(t.target.value))})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Precio Unitario ($)"}),e.jsx("input",{type:"number",className:"form-input",value:R,onChange:t=>ue(Number(t.target.value))})]})]}),e.jsx("button",{type:"submit",className:"btn-add",children:"📦 Agregar Ítem Especial / Tercerizado"})]})]}),e.jsxs("div",{className:"card-panel",children:[e.jsxs("h2",{children:["📋 Renglones del Presupuesto (",c.length,")"]}),c.length===0?e.jsx("p",{style:{color:"#94a3b8",fontStyle:"italic",textAlign:"center",padding:"20px 0"},children:"No hay ítems agregados a la cotización todavía. Use el formulario superior para añadir productos."}):e.jsxs("table",{className:"items-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"#"}),e.jsx("th",{children:"Tipo"}),e.jsx("th",{children:"Concepto"}),e.jsx("th",{children:"Cant. / Unidad"}),e.jsx("th",{children:"P. Unitario"}),e.jsx("th",{children:"Subtotal"}),e.jsx("th",{children:"Acciones"})]})}),e.jsx("tbody",{children:c.map((t,o)=>e.jsxs("tr",{children:[e.jsx("td",{children:o+1}),e.jsx("td",{children:t.concepto.startsWith("[PROMO]")?e.jsx("span",{style:{background:"#ec4899",color:"#fff",fontSize:"11px",fontWeight:700,padding:"2px 6px",borderRadius:"4px"},children:"PROMO"}):t.isCustom?e.jsx("span",{style:{background:"#f59e0b",color:"#000",fontSize:"11px",fontWeight:700,padding:"2px 6px",borderRadius:"4px"},children:"ESPECIAL"}):e.jsx("span",{style:{background:"#6366f1",color:"#fff",fontSize:"11px",fontWeight:700,padding:"2px 6px",borderRadius:"4px"},children:"CATÁLOGO"})}),e.jsx("td",{children:e.jsx("strong",{children:t.concepto})}),e.jsxs("td",{children:[t.cantidad," ",t.unidadMedida]}),e.jsxs("td",{children:["$",t.precioUnitario.toLocaleString("es-AR")]}),e.jsx("td",{children:e.jsxs("strong",{children:["$",t.subtotal.toLocaleString("es-AR")]})}),e.jsx("td",{children:e.jsx("button",{type:"button",className:"btn-danger-outline",onClick:()=>fe(t.id),children:"✕ Quitar"})})]},t.id))})]})]})]}),e.jsx("div",{children:e.jsxs("div",{className:"card-panel summary-card",children:[e.jsx("h2",{children:"💰 Resumen de Cotización"}),e.jsxs("div",{className:"summary-row",children:[e.jsx("span",{children:"Subtotal:"}),e.jsxs("span",{children:["$",I.toLocaleString("es-AR",{minimumFractionDigits:2})]})]}),e.jsxs("div",{className:"form-group",style:{marginTop:"12px"},children:[e.jsx("label",{children:"Bonificación / Descuento ($)"}),e.jsx("input",{type:"number",className:"form-input",value:w,onChange:t=>K(Number(t.target.value))})]}),e.jsxs("div",{className:"summary-total",children:[e.jsx("span",{children:"Total Neto:"}),e.jsxs("span",{children:["$",V.toLocaleString("es-AR",{minimumFractionDigits:2})]})]}),e.jsxs("div",{className:"form-group",style:{marginTop:"16px"},children:[e.jsx("label",{children:"Observaciones / Notas para Cliente"}),e.jsx("textarea",{className:"form-textarea",rows:3,placeholder:"Aclaraciones comerciales o plazos de entrega...",value:$,onChange:t=>Z(t.target.value)})]}),e.jsxs("div",{className:"summary-actions",children:[e.jsx("button",{type:"button",className:"btn-pdf",onClick:ve,children:"📄 Generar PDF Presupuesto"}),e.jsx("button",{type:"button",className:"btn-convert",onClick:je,children:"🚀 Convertir a Orden de Trabajo"})]})]})})]})]})}export{Oe as default};
