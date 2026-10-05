'use client';

interface PagamentoDummyProps {
  titulo: string;
  descricao: string;
  confirmando?: boolean;
  onVoltar: () => void;
  onConfirmar: () => void;
}

// PONTO DE INTEGRAÇÃO (pagamento real): este modal dummy será substituído pelo
// checkout do Mercado Pago (link/QR Code). O botão "Não quero pagar" — a
// "confirmação de pagamento" — dá lugar à liberação real via webhook.
export default function PagamentoDummy({
  titulo,
  descricao,
  confirmando = false,
  onVoltar,
  onConfirmar,
}: PagamentoDummyProps) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="titulo-pagamento">
      <div className="modal">
        <h2 id="titulo-pagamento">{titulo}</h2>
        <p className="meta">{descricao}</p>
        <p className="hint">Demonstração: no lugar desta tela entra o link do Mercado Pago.</p>
        <div className="passo-rodape">
          <button className="btn secundario" onClick={onVoltar} disabled={confirmando}>
            Voltar
          </button>
          <button className="btn" onClick={onConfirmar} disabled={confirmando}>
            {confirmando ? 'Confirmando…' : 'Não quero pagar'}
          </button>
        </div>
      </div>
    </div>
  );
}
