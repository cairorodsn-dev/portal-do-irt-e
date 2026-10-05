import ConsultaForm from './ConsultaForm';

export const metadata = {
  title: 'Consulta pública — Portal do IRT-E',
};

export default function ConsultaPage() {
  return (
    <>
      <section className="hero">
        <h1>Consulta pública de série</h1>
        <p className="lead">
          Informe o código serial IRT-E citado na sua cláusula e receba o valor do fator F (teto
          de repasse integral) e do índice IRT-E para cada período de 2026 a 2033. Gratuita, sem
          cadastro — inclusive para a contraparte verificar um relatório recebido.
        </p>
      </section>
      <ConsultaForm />
    </>
  );
}
