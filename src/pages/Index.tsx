// Página inicial de fallback (só aparece se nenhuma rota corresponder)

const Index = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">Bem-vindo</h1>
        <p className="text-xl text-muted-foreground">Comece a construir seu projeto aqui!</p>
      </div>
    </div>
  );
};

export default Index;
