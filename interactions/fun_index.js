import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

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

// Detecta ambiente para apontar para a API local ou de produção no Render
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_BASE_URL = isLocalhost ? 'http://127.0.0.1:5000' : 'https://skylert-api.onrender.com';

const emailInput = document.getElementById('email');
const senhaInput = document.getElementById('senha');
const btnEntrar = document.getElementById('btn-entrar');
const btnCadastrar = document.getElementById('btn-cadastrar');
const mensagemDiv = document.getElementById('mensagem');
const authContainer = document.getElementById('auth-container');

function mostrarMensagem(texto, cor = 'red') {
    mensagemDiv.textContent = texto;
    mensagemDiv.style.color = cor;
}

// ─── CADASTRO ─────────────────────────────────────────────────────

btnCadastrar.addEventListener('click', () => {
    const email = emailInput.value.trim();
    const senha = senhaInput.value;

    if (!email || !senha) {
        mostrarMensagem("Por favor, preencha todos os campos.");
        return;
    }

    createUserWithEmailAndPassword(auth, email, senha)
        .then(() => {
            mostrarMensagem("Conta criada com sucesso!", "green");
        })
        .catch((error) => {
            mostrarMensagem("Erro ao criar conta: " + obterMensagemErroAmigavel(error.code));
        });
});

// ─── LOGIN ────────────────────────────────────────────────────────

btnEntrar.addEventListener('click', () => {
    realizarLogin();
});

// Permite disparar o login com Enter nos campos de e-mail e senha
senhaInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') realizarLogin();
});

emailInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') realizarLogin();
});

// ─── MONITORAMENTO DE AUTENTICAÇÃO ────────────────────────────────

// Se já houver sessão ativa, redireciona direto ao dashboard sem precisar logar novamente.
// Se não houver, revela o formulário de login.
onAuthStateChanged(auth, (user) => {
    if (user) {
        window.location.href = "dashboard.html";
    } else {
        authContainer.classList.remove('hidden');
        mostrarMensagem("");
        emailInput.value = "";
        senhaInput.value = "";
    }
});

// Traduz os códigos de erro do Firebase para mensagens amigáveis em português
function obterMensagemErroAmigavel(codigoErro) {
    switch (codigoErro) {
        case "auth/invalid-email":
            return "E-mail com formato inválido.";
        case "auth/weak-password":
            return "A senha precisa ter no mínimo 6 caracteres.";
        case "auth/email-already-in-use":
            return "Este e-mail já está cadastrado.";
        case "auth/invalid-credential":
            return "E-mail ou senha incorretos.";
        default:
            return "Ocorreu um erro inesperado.";
    }
}

async function realizarLogin() {
    const email = emailInput.value.trim();
    const senha = senhaInput.value;

    if (!email || !senha) {
        mostrarMensagem("Por favor, preencha todos os campos.");
        return;
    }

    try {
        await signInWithEmailAndPassword(auth, email, senha);
        mostrarMensagem("Login efetuado com sucesso!", "green");
    } catch (error) {
        mostrarMensagem("Erro ao entrar: " + obterMensagemErroAmigavel(error.code));
    }
}

// ─── PREVIEW DE CLIMA NA TELA DE LOGIN ───────────────────────────

/**
 * Carrega os dados climáticos de São Paulo e preenche o card de preview
 * exibido no lado esquerdo da tela de login, antes do usuário se autenticar.
 */
async function carregarPreviewClima() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/previsao?cidade=Sao%20Paulo`);
        const data = await response.json();

        document.getElementById("weather-temp").textContent = `${data.temp_atual}°`;
        document.getElementById("weather-condition").textContent = data.condicao;
        document.getElementById("wind-preview").textContent = `${data.vento} km/h`;
        document.getElementById("humidity-preview").textContent = `${data.umidade}%`;
        document.getElementById("rain-preview").textContent = `${data.chuva}%`;

        // Seleciona o ícone correspondente à condição atual
        const icon = document.getElementById("weather-icon");
        const cond = data.condicao.toLowerCase();

        if (cond.includes("tempestade")) icon.className = "ti ti-storm";
        else if (cond.includes("pancadas")) icon.className = "ti ti-cloud-rain";
        else if (cond.includes("chuva")) icon.className = "ti ti-cloud-rain";
        else if (cond.includes("chuvisco")) icon.className = "ti ti-cloud-drizzle";
        else if (cond.includes("névoa") || cond.includes("neblina")) icon.className = "ti ti-mist";
        else if (cond.includes("nublado")) icon.className = "ti ti-cloud";
        else {
            // Diferencia sol de lua conforme período do dia
            if (data.is_day) icon.className = "ti ti-sun";
            else icon.className = "ti ti-moon";
        }

    } catch (erro) {
        console.error("Erro ao carregar clima da tela de login:", erro);
    }
}

carregarPreviewClima();