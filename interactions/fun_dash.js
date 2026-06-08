import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Exibe a data atual no cabeçalho do dashboard
const hoje = new Date();
document.getElementById('data-hoje').textContent = hoje.toLocaleDateString('pt-BR');

const firebaseConfig = {
    apiKey: "AIzaSyDguSRkotz8ehCVjuYmwWZOrN36WcFYp9Q",
    authDomain: "skylert-4d51a.firebaseapp.com",
    projectId: "skylert-4d51a",
    storageBucket: "skylert-4d51a.firebasestorage.app",
    messagingSenderId: "572725592639",
    appId: "1:572725592639:web:dcc5805c123f411197ae8a",
    measurementId: "G-CHHLF8G01K"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Detecta ambiente para apontar para a API local ou de produção no Render
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_BASE_URL = isLocalhost ? 'http://127.0.0.1:5000' : 'https://skylert-api.onrender.com';

const userEmailSpan = document.getElementById('user-email');
const btnSair = document.getElementById('btn-sair');
let usuarioLogadoUid = null;

// Redireciona para o login se o usuário não estiver autenticado;
// caso esteja, exibe o e-mail e carrega as preferências de alerta salvas
onAuthStateChanged(auth, (user) => {
    if (user) {
        userEmailSpan.textContent = user.email;
        usuarioLogadoUid = user.uid;
        carregarConfiguracoesAlerta(user.uid);
    } else {
        window.location.href = "index.html";
    }
});

btnSair.addEventListener('click', () => {
    signOut(auth).then(() => {
        window.location.href = "index.html";
    });
});

// ─── PAINEL DE ALERTAS ───────────────────────────────────────────

const btnSalvarAlertas = document.getElementById('btn-salvar-alertas');
const msgAlertas = document.getElementById('msg-alertas');

// Salva as preferências de alerta do usuário no Firestore (coleção alertas_config)
btnSalvarAlertas.addEventListener('click', async () => {
    if (!usuarioLogadoUid) return;

    const config = {
        receberChuva: document.getElementById('alert-chuva').checked,
        receberVento: document.getElementById('alert-vento').checked,
        receberTemperatura: document.getElementById('alert-temperatura').checked,
        cidadeMonitorada: document.getElementById('alert-cidade').value,
        emailUsuario: auth.currentUser.email
    };

    try {
        await setDoc(doc(db, "alertas_config", usuarioLogadoUid), config);
        msgAlertas.style.color = "#22c55e";
        msgAlertas.textContent = "Preferências salvas com sucesso!";
    } catch (error) {
        msgAlertas.style.color = "#ef4444";
        msgAlertas.textContent = "Erro ao salvar: " + error.message;
    }
});

// Lê as preferências de alerta salvas no Firestore e preenche os campos do painel
async function carregarConfiguracoesAlerta(uid) {
    try {
        const docRef = doc(db, "alertas_config", uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const dados = docSnap.data();
            document.getElementById('alert-chuva').checked = dados.receberChuva || false;
            document.getElementById('alert-vento').checked = dados.receberVento || false;
            document.getElementById('alert-temperatura').checked = dados.receberTemperatura || false;
            document.getElementById('alert-cidade').value = dados.cidadeMonitorada || "";
        }
    } catch (error) {
        console.error("Erro ao recuperar preferências: ", error);
    }
}

// ─── BUSCA DE CLIMA (BARRA PRINCIPAL) ────────────────────────────

const inputCidade = document.getElementById('input-cidade');
const listaCidades = document.getElementById('lista-cidades');
const btnBuscar = document.getElementById('btn-buscar');

const alertCidade = document.getElementById('alert-cidade');
const listaCidadesAlertas = document.getElementById('lista-cidades-alertas');

// Autocomplete da barra de busca principal: consulta a API a partir de 2 caracteres
inputCidade.addEventListener('input', async () => {
    const termo = inputCidade.value.trim();

    if (termo.length < 2) {
        listaCidades.innerHTML = "";
        listaCidades.style.display = "none";
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/cidades?q=${encodeURIComponent(termo)}`);
        const cidades = await response.json();

        listaCidades.innerHTML = "";

        if (cidades.length === 0) {
            listaCidades.style.display = "none";
            return;
        }

        // Cria um item clicável para cada cidade retornada
        cidades.forEach(cidade => {
            const item = document.createElement('div');
            item.className = 'item-cidade';
            item.textContent = cidade.nome;

            // Ao clicar, preenche o campo e dispara a busca de clima com as coordenadas exatas
            item.addEventListener('click', () => {
                inputCidade.value = cidade.nome;
                listaCidades.innerHTML = "";
                listaCidades.style.display = "none";
                buscarClimaReal(cidade.nome, cidade.latitude, cidade.longitude);
            });

            listaCidades.appendChild(item);
        });

        listaCidades.style.display = "block";

    } catch (error) {
        console.error(error);
        listaCidades.style.display = "none";
    }
});

// Fecha o dropdown da busca principal ao clicar fora dele
document.addEventListener('click', (e) => {
    if (!listaCidades.contains(e.target) && e.target !== inputCidade) {
        listaCidades.innerHTML = "";
        listaCidades.style.display = "none";
    }
});

// ─── AUTOCOMPLETE DO PAINEL DE ALERTAS ───────────────────────────

// Mesmo comportamento do autocomplete principal, mas para o campo de cidade monitorada
alertCidade.addEventListener('input', async () => {
    const termo = alertCidade.value.trim();

    if (termo.length < 2) {
        listaCidadesAlertas.innerHTML = "";
        listaCidadesAlertas.style.display = "none";
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/cidades?q=${encodeURIComponent(termo)}`);
        const cidades = await response.json();
        listaCidadesAlertas.innerHTML = "";

        if (cidades.length === 0) {
            listaCidadesAlertas.style.display = "none";
            return;
        }

        cidades.forEach(cidade => {
            const item = document.createElement('div');
            item.className = 'item-cidade';
            item.textContent = cidade.nome;

            item.addEventListener('click', () => {
                alertCidade.value = cidade.nome;
                listaCidadesAlertas.innerHTML = "";
                listaCidadesAlertas.style.display = "none";
            });

            listaCidadesAlertas.appendChild(item);
        });

        listaCidadesAlertas.style.display = "block";

    } catch (error) {
        console.error("Erro no autocomplete de alertas:", error);
        listaCidadesAlertas.style.display = "none";
    }
});

// Fecha o dropdown do painel de alertas ao clicar fora dele
document.addEventListener('click', (e) => {
    if (!listaCidadesAlertas.contains(e.target) && e.target !== alertCidade) {
        listaCidadesAlertas.innerHTML = "";
        listaCidadesAlertas.style.display = "none";
    }
});

// ─── DISPARO DA BUSCA ─────────────────────────────────────────────

// Carrega São Paulo como cidade padrão ao entrar no dashboard
window.addEventListener('load', () => {
    buscarClimaReal("Sao Paulo");
});

// Permite buscar pressionando Enter na barra de pesquisa
inputCidade.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        const cidade = inputCidade.value.trim();
        if (cidade) buscarClimaReal(cidade);
    }
});

btnBuscar.addEventListener('click', () => {
    const cidade = inputCidade.value.trim();
    if (cidade) buscarClimaReal(cidade);
});

// ─── BUSCA E RENDERIZAÇÃO DO CLIMA ───────────────────────────────

/**
 * Consulta a API Flask e atualiza todos os elementos do dashboard com os
 * dados climáticos retornados: temperatura, condição, sensação térmica,
 * vento, umidade, UV, chuva, ícone e previsão dos próximos dias.
 * Aceita coordenadas opcionais para evitar uma segunda chamada de geocoding.
 */
async function buscarClimaReal(cidade, lat = null, lon = null) {
    console.log("Buscando:", cidade);
    const tempEl = document.getElementById('temp-atual');
    tempEl.classList.add('loading');

    try {
        let url = `${API_BASE_URL}/api/previsao?cidade=${encodeURIComponent(cidade)}&t=${Date.now()}`;

        if (lat && lon) {
            url += `&lat=${lat}&lon=${lon}`;
        }

        const response = await fetch(url);
        const data = await response.json();

        if (response.ok) {
            tempEl.classList.remove('loading');
            atualizarParticulasClima(data);

            document.getElementById('cidade-nome').textContent = data.cidade_nome;
            document.getElementById('temp-atual').innerHTML = `${data.temp_atual}<sup>°C</sup>`;
            document.getElementById('condicao-atual').textContent = data.condicao;
            document.getElementById('sensacao-atual').textContent = `${data.sensacao}°C`;
            document.getElementById('vento-atual').textContent = `${data.vento} km/h`;
            document.getElementById('umidade-atual').textContent = `${data.umidade}%`;
            document.getElementById('uv-atual').textContent = data.uv;
            document.getElementById('chuva-atual').textContent = `${data.chuva}%`;

            // Seleciona o ícone Tabler correspondente à condição climática atual
            const icone = document.getElementById('clima-icon');
            const cond = data.condicao.toLowerCase();
            if (cond.includes('tempestade')) icone.className = 'ti ti-storm';
            else if (cond.includes('chuva forte')) icone.className = 'ti ti-cloud-storm';
            else if (cond.includes('chuva')) icone.className = 'ti ti-cloud-rain';
            else if (cond.includes('chuvisco')) icone.className = 'ti ti-cloud-drizzle';
            else if (cond.includes('névoa') || cond.includes('neblina')) icone.className = 'ti ti-mist';
            else if (cond.includes('nublado')) icone.className = 'ti ti-cloud';
            else icone.className = 'ti ti-sun';

            // Renderiza os cards de previsão, substituindo a data do primeiro dia por "Amanhã"
            const previsaoLista = document.getElementById('previsao-lista');
            previsaoLista.innerHTML = "";

            console.log(data.previsao_dias);

            data.previsao_dias.forEach((dia, index) => {
                let labelDia = dia.data;
                if (index === 0) labelDia = "Amanhã";

                const divDia = document.createElement('div');
                divDia.className = 'previsao-dia';
                divDia.innerHTML = `
                    <span class="prev-dia">${labelDia}</span>
                    <span class="prev-temps">${dia.min}° / ${dia.max}°C</span>
                `;
                previsaoLista.appendChild(divDia);
            });

        } else {
            tempEl.classList.remove('loading');
            console.error("Erro ao consultar a API: " + data.erro);
        }
    } catch (error) {
        tempEl.classList.remove('loading');
        console.error("Não foi possível conectar ao servidor Python: ", error);
    }
}

// ─── PARTÍCULAS E BACKGROUNDS CLIMÁTICOS ─────────────────────────

/**
 * Atualiza o fundo animado do dashboard conforme a condição climática atual.
 * Remove todas as classes de clima do body e do container de partículas,
 * depois aplica a classe e os elementos visuais correspondentes ao código WMO recebido.
 */
function atualizarParticulasClima(data) {
    const container = document.getElementById('weather-particles');
    container.innerHTML = "";

    document.body.classList.remove(
        'weather-clear-day',
        'weather-clear-night',
        'weather-cloudy',
        'weather-rain',
        'weather-storm',
        'weather-fog'
    );

    const codigo = data.codigo_clima;
    const isDay = data.is_day === 1;

    // Chuva: chuvisco, chuva leve/moderada/forte e pancadas (códigos WMO 51–80)
    if ([51, 53, 55, 61, 63, 65, 80].includes(codigo)) {
        document.body.classList.add('weather-rain');

        for (let i = 0; i < 140; i++) {
            const rain = document.createElement('div');
            rain.className = 'rain-drop';
            rain.style.left = Math.random() * 100 + 'vw';
            rain.style.animationDuration = (0.45 + Math.random() * 0.45) + 's';
            rain.style.opacity = 0.15 + Math.random() * 0.5;
            rain.style.height = 40 + Math.random() * 90 + 'px';
            container.appendChild(rain);
        }

        return;
    }

    // Tempestade (código WMO 95): chuva mais intensa + relâmpagos periódicos
    if (codigo === 95) {
        document.body.classList.add('weather-storm');

        for (let i = 0; i < 160; i++) {
            const rain = document.createElement('div');
            rain.className = 'rain-drop';
            rain.style.left = Math.random() * 100 + 'vw';
            rain.style.animationDuration = (0.35 + Math.random() * 0.35) + 's';
            rain.style.opacity = 0.2 + Math.random() * 0.6;
            rain.style.height = 60 + Math.random() * 120 + 'px';
            container.appendChild(rain);
        }

        criarRelampagos();
        return;
    }

    // Névoa e neblina (códigos WMO 45 e 48): partículas grandes e lentas
    if ([45, 48].includes(codigo)) {
        document.body.classList.add('weather-fog');

        for (let i = 0; i < 12; i++) {
            const fog = document.createElement('div');
            fog.className = 'fog-particle';
            fog.style.top = Math.random() * 100 + 'vh';
            fog.style.animationDuration = (15 + Math.random() * 20) + 's';
            fog.style.opacity = 0.03 + Math.random() * 0.07;
            container.appendChild(fog);
        }

        return;
    }

    // Parcialmente ou totalmente nublado (códigos WMO 2 e 3)
    if ([2, 3].includes(codigo)) {
        document.body.classList.add('weather-cloudy');

        for (let i = 0; i < 8; i++) {
            const cloud = document.createElement('div');
            cloud.className = 'cloud-layer';
            cloud.style.top = (5 + Math.random() * 50) + 'vh';
            cloud.style.animationDuration = (40 + Math.random() * 40) + 's';
            cloud.style.opacity = 0.04 + Math.random() * 0.08;
            cloud.style.transform = `scale(${0.7 + Math.random()})`;
            container.appendChild(cloud);
        }

        return;
    }

    // Céu limpo durante o dia (códigos WMO 0 e 1): brilho solar no canto superior
    if ([0, 1].includes(codigo) && isDay) {
        document.body.classList.add('weather-clear-day');

        const glow = document.createElement('div');
        glow.className = 'sun-glow';
        container.appendChild(glow);
        return;
    }

    // Céu limpo à noite (códigos WMO 0 e 1): estrelas com animação de piscar
    if ([0, 1].includes(codigo) && !isDay) {
        document.body.classList.add('weather-clear-night');

        for (let i = 0; i < 80; i++) {
            const star = document.createElement('div');
            star.className = 'star';
            star.style.left = Math.random() * 100 + 'vw';
            star.style.top = Math.random() * 100 + 'vh';
            star.style.animationDelay = Math.random() * 4 + 's';
            container.appendChild(star);
        }
    }
}

/**
 * Cria um loop que adiciona a classe 'lightning' ao body em intervalos aleatórios
 * entre 5 e 12 segundos, simulando o flash de um relâmpago via CSS.
 * A classe é removida após 120ms para completar o efeito de flash rápido.
 */
function criarRelampagos() {
    setInterval(() => {
        if (!document.body.classList.contains('weather-storm')) return;

        document.body.classList.add('lightning');

        setTimeout(() => {
            document.body.classList.remove('lightning');
        }, 120);

    }, 5000 + Math.random() * 7000);
}