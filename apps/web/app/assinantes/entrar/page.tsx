import AcessoClient from './AcessoClient';

export const metadata = {
  title: 'Entrar — Área de assinantes — Portal do IRT-E',
};

export default function EntrarPage() {
  return (
    <>
      <section className="hero">
        <h1>Acesso à área de assinantes</h1>
        <p className="lead">
          Entre com o e-mail da sua conta ou crie uma conta para gerir a sua carteira de
          contratos com simulações de reajuste IRT-E.
        </p>
      </section>
      <AcessoClient />
    </>
  );
}
