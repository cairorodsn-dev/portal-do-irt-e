// Pilota o wizard por CDP (Chrome headless) e captura o que trava o botão "Fechar pedido".
import { spawn } from 'node:child_process';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const URL_APP = 'http://localhost:3100/wizard';
const PORTA_CDP = 9333;
const PROFILE = process.cwd().replace(/\\/g, '/') + '/_exploracao/.chrome-perfil-diagnostico';

async function httpJson(url) {
  const r = await fetch(url);
  return r.json();
}
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const chrome = spawn(CHROME, [
    '--headless=new', `--remote-debugging-port=${PORTA_CDP}`, `--user-data-dir=${PROFILE}`,
    '--no-first-run', '--no-default-browser-check', URL_APP,
  ], { stdio: 'ignore' });

  let alvo = null;
  for (let i = 0; i < 40; i++) {
    try {
      const lista = await httpJson(`http://localhost:${PORTA_CDP}/json`);
      alvo = lista.find((t) => t.type === 'page' && t.url.includes('localhost:3100'));
      if (alvo) break;
    } catch { /* ainda não subiu */ }
    await dormir(500);
  }
  if (!alvo) throw new Error('CDP não subiu');

  const ws = new WebSocket(alvo.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

  let id = 0;
  const pend = new Map();
  const eventos = [];
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pend.has(msg.id)) { pend.get(msg.id)(msg); pend.delete(msg.id); return; }
    if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
      eventos.push('console.error: ' + msg.params.args.map((a) => a.value ?? a.description ?? '').join(' '));
    } else if (msg.method === 'Runtime.exceptionThrown') {
      const d = msg.params.exceptionDetails;
      eventos.push('EXCEÇÃO: ' + (d.exception?.description ?? d.text));
    } else if (msg.method === 'Log.entryAdded' && msg.params.entry.level === 'error') {
      eventos.push('log.error: ' + msg.params.entry.text + ' ' + (msg.params.entry.url ?? ''));
    }
  };
  const send = (method, params = {}) => new Promise((res) => {
    const i = ++id; pend.set(i, res);
    ws.send(JSON.stringify({ id: i, method, params }));
  });
  const evalJs = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
    if (r.result?.exceptionDetails) throw new Error('eval: ' + JSON.stringify(r.result.exceptionDetails.exception?.description ?? r.result.exceptionDetails));
    return r.result?.result?.value;
  };
  const esperar = async (cond, timeoutMs = 15000) => {
    const t0 = Date.now();
    while (Date.now() - t0 < timeoutMs) {
      if (await evalJs(cond)) return true;
      await dormir(300);
    }
    throw new Error('timeout: ' + cond);
  };
  const clicar = (texto) => evalJs(`(() => {
    const els = [...document.querySelectorAll('button, label')];
    const el = els.find((e) => e.innerText.trim().includes(${JSON.stringify(texto)}));
    if (!el) return 'NAO ACHOU: ${texto}';
    el.click(); return 'clicou: ' + el.tagName + ' (' + el.innerText.trim().slice(0, 60) + ')';
  })()`);
  const avancar = () => evalJs(`(() => {
    const b = [...document.querySelectorAll('button')].find((x) => x.innerText.includes('Avançar') || x.innerText.includes('Concluir item'));
    if (!b) return 'SEM BOTAO AVANCAR';
    if (b.disabled) return 'AVANCAR DESABILITADO';
    b.click(); return 'ok';
  })()`);

  await send('Runtime.enable');
  await send('Log.enable');
  await send('Page.enable');
  await evalJs(`window.__fetches = [];
    const of = window.fetch.bind(window);
    window.fetch = (...a) => {
      const p = of(...a);
      p.then((r) => window.__fetches.push({ url: String(a[0]), status: r.status }))
       .catch((e) => window.__fetches.push({ url: String(a[0]), erro: String(e) }));
      return p;
    }; 'hook ok'`);

  console.log('título:', await evalJs('document.title'));
  await esperar(`document.body.innerText.includes('Por onde começamos')`);
  await dormir(2000); // hidratação do React — clique antes dela não registra
  for (let tent = 0; tent < 10; tent++) {
    console.log('pacote:', await clicar('Até 3 itens'));
    await dormir(600);
    if (await evalJs(`document.body.innerText.includes('Prestação de serviço, locação')`)) break;
  }
  await esperar(`document.body.innerText.includes('Prestação de serviço, locação')`);
  const TIPO = process.argv[2] === 'B' ? 'Bem ou produto' : 'Serviço';
  console.log('tipo:', await clicar(TIPO));
  console.log('avançar:', await avancar());
  await esperar(`document.body.innerText.includes('Pra onde o item vai')`);
  await evalJs(`(() => {
    const s = document.querySelector('#uf');
    const set = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set;
    set.call(s, 'MG');
    s.dispatchEvent(new Event('change', { bubbles: true }));
    return s.value;
  })()`);
  console.log('uf=MG; avançar:', await avancar());
  await esperar(`document.body.innerText.includes('regime do fornecedor')`);
  const MODO = process.argv[2];
  console.log('regime:', await clicar(MODO === 'H' ? 'Simples híbrido' : 'Lucro presumido'));
  console.log('avançar:', await avancar());
  if (MODO === 'H') {
    await esperar(`document.body.innerText.includes('Simples do fornecedor')`);
    console.log('pergunta anexo (data da proposta):', await evalJs(`document.querySelector('label[for=anexo]')?.innerText`));
    console.log('opções de anexo:', await evalJs(`[...document.querySelectorAll('#anexo option')].map((o) => o.innerText).join(' | ')`));
    console.log('pergunta RBT12:', await evalJs(`document.querySelector('label[for=rbt12]')?.innerText`));
    await evalJs(`(() => { const s = document.querySelector('#anexo'); const set = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set; set.call(s, '3'); s.dispatchEvent(new Event('change', { bubbles: true })); return 1; })()`);
    await evalJs(`(() => { const s = document.querySelector('#rbt12'); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(s, '450000'); s.dispatchEvent(new Event('input', { bubbles: true })); s.dispatchEvent(new Event('change', { bubbles: true })); return 1; })()`);
    await dormir(300);
    console.log('faixa calculada:', await evalJs(`document.body.innerText.match(/Faixa calculada:[^\\n]*/)?.[0]`));
    console.log('avançar:', await avancar());
  }
  await esperar(`document.body.innerText.includes('Carga legada')`);
  console.log('legada ok; avançar:', await avancar());
  await esperar(`document.body.innerText.includes('setorial')`);
  console.log('opções ρ:', await evalJs(`[...document.querySelectorAll('#rho option')].map((o) => o.innerText).join(' | ')`));
  await evalJs(`(() => { const s = document.querySelector('#rho'); const set = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set; set.call(s, '3'); s.dispatchEvent(new Event('change', { bubbles: true })); return 1; })()`);
  await dormir(300);
  console.log('seleção ρ persiste no índice 3:', await evalJs(`document.querySelector('#rho').selectedIndex`));
  console.log('opção marcada:', await evalJs(`document.querySelector('#rho').selectedOptions[0].innerText`));
  console.log('rho ok; avançar:', await avancar());
  console.log('passo creditamento visível:', await evalJs(`document.body.innerText.includes('Creditamento no ano-base')`));
  console.log('avançar:', await avancar());
  if (await evalJs(`document.body.innerText.includes('Impostos extras')`)) {
    console.log('sufixos ok; avançar:', await avancar());
  }
  await esperar(`document.body.innerText.includes('elasticidade')`);
  console.log('régua presente:', await evalJs(`!!document.querySelector('#epsilonRegua')`));
  console.log('marca central:', await evalJs(`document.querySelector('.regua-marcas .centro')?.innerText ?? 'SEM MARCA'`));
  console.log('balão de ajuda:', await evalJs(`document.querySelector('.info-balao')?.innerText.slice(0, 60) ?? 'SEM BALÃO'`));
  const mexerRegua = (v) => evalJs(`(() => { const s = document.querySelector('#epsilonRegua'); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(s, '${v}'); s.dispatchEvent(new Event('input', { bubbles: true })); s.dispatchEvent(new Event('change', { bubbles: true })); return 1; })()`);
  await mexerRegua(500); await dormir(250);
  console.log('centro →', await evalJs(`document.querySelector('.hint')?.innerText ?? document.body.innerText.match(/Com ε = [^,—]*/)?.[0]`));
  await mexerRegua(0); await dormir(250);
  console.log('mínimo →', await evalJs(`document.body.innerText.match(/Com ε = [0-9,]+/)?.[0]`));
  await mexerRegua(1000); await dormir(250);
  console.log('máximo →', await evalJs(`document.body.innerText.match(/Com ε = [0-9,]+/)?.[0]`));
  await mexerRegua(500); await dormir(250);
  console.log('elasticidade é o último; concluir:', await avancar());

  for (let i = 0; i < 20; i++) {
    const st = JSON.parse(await evalJs(`JSON.stringify({
      calculando: document.body.innerText.includes('Calculando os índices'),
      localizado: document.body.innerText.includes('IRT-E localizado'),
      serialVazou: /IRT-E [A-Z]{2}\\d{3}/.test(document.body.innerText),
      erroBox: document.querySelector('.erros')?.innerText ?? null,
      fechar: (() => { const b = [...document.querySelectorAll('button')].find((x) => x.innerText.includes('Fechar pedido')); return b ? { disabled: b.disabled } : null; })(),
      fetches: window.__fetches,
    })`));
    console.log(`[resumo ${i * 2}s]`, JSON.stringify(st));
    if (st.fechar && !st.fechar.disabled) {
      console.log('testando pílula Resumo: adicionar item →', await clicar('Adicionar outro item'));
      await esperar(`document.body.innerText.includes('o fornecedor entrega')`);
      console.log('pílula Resumo presente:', await evalJs(`!!document.querySelector('.passos .passo-link')`));
      console.log('clicando na pílula:', await evalJs(`document.querySelector('.passos .passo-link').click(); 'ok'`));
      await dormir(500);
      console.log('voltou ao resumo:', await evalJs(`document.body.innerText.includes('Resumo do que montamos')`));
      console.log('item preservado:', await evalJs(`document.body.innerText.includes('Item 1') && !document.body.innerText.includes('Item 2')`));
      await evalJs(`(() => { const s = document.querySelector('.nome-item'); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(s, 'Vigilância patrimonial'); s.dispatchEvent(new Event('input', { bubbles: true })); return 1; })()`);
      await dormir(300);
      console.log('renomeado no resumo:', await evalJs(`document.querySelector('.nome-item')?.value`));
      console.log('selo separado:', await evalJs(`document.querySelector('.selo-localizado')?.innerText ?? 'SEM SELO'`));
      console.log('clicando Fechar pedido…');
      console.log(await clicar('Fechar pedido'));
      await dormir(800);
      console.log('modal:', await evalJs(`document.querySelector('.modal-backdrop')?.innerText ?? 'SEM MODAL'`));
      console.log('pagar:', await clicar('Não quero pagar'));
      await dormir(800);
      console.log('resultado heading ok:', await evalJs(`document.body.innerText.includes('Obrigado, aqui estão seus códigos')`));
      console.log('texto memória ok:', await evalJs(`document.body.innerText.includes('A técnica completa aplicada item por item')`));
      console.log('serial no resultado:', await evalJs(`/IRT-E [A-Z]{2}\\d{3}/.test(document.body.innerText)`));
      console.log('nome customizado no resultado:', await evalJs(`document.body.innerText.includes('Vigilância patrimonial —')`));
      console.log('parênteses ICMS/PIS removido:', await evalJs(`document.body.innerText.includes('crédito do ano-base c =') && !document.body.innerText.includes('(ICMS')`));
      break;
    }
    await dormir(2000);
  }

  console.log('--- console/exceções da página ---');
  for (const e of eventos) console.log(e);
  chrome.kill();
  process.exit(0);
}
main().catch((e) => { console.error('FALHA:', e.message); process.exit(1); });
