# Kinetics Lab

Simulador local de uma reação irreversível de primeira ordem `A → B`. O backend Java 17 calcula a constante de Arrhenius, concentrações, velocidade e meia-vida; a interface HTML/CSS/JavaScript renderiza três gráficos Canvas sem bibliotecas ou serviços externos.

## Executar

Requer JDK 17 ou superior.

### Linux e macOS

```bash
chmod +x run.sh test.sh
./test.sh
./run.sh
```

### Windows

```bat
test.bat
run.bat
```

Abra `http://127.0.0.1:8080`. Para outra porta, defina a variável `PORT`.

## Arquitetura

- `ReactionModel`: equações químicas puras, sem dependência da interface.
- `SimulationService`: amostragem das séries e cenários de temperatura.
- `SimulationRequest/Response`: contrato tipado da API.
- `Json`: parser e serializador JSON local com escape correto.
- `Main`: servidor `jdk.httpserver`, API e arquivos estáticos.
- `public`: interface, estilos e gráficos Canvas.
- `ValidationTests`: testes matemáticos executáveis sem bibliotecas.

Endpoints: `GET /api/health` e `POST /api/simulate`.

## Fundamentação e limites

São usados `k = A₀ exp(-Ea/RT)`, `[A](t) = [A]₀ exp(-kt)`, `[B](t) = [B]₀ + [A]₀ - [A](t)`, `v(t) = k[A](t)` e `t½ = ln(2)/k`, com `R = 8,314462618 J/(mol·K)`. O modelo assume mistura ideal, volume e temperatura constantes, reação elementar irreversível e estequiometria 1:1. Não modela reações reversíveis, múltiplas etapas ou transferência de massa.

## Checklist para apresentação

- Execute `test.sh` ou `test.bat`.
- Inicie o servidor e confirme `/api/health`.
- Demonstre os valores padrão e a comparação em ±10 °C.
- Explique conservação de `A + B` e o efeito de Arrhenius.
- Use um navegador atual com Canvas habilitado.

> O ambiente de desenvolvimento usado para gerar o projeto não continha um JDK; por isso, os testes Java devem ser executados localmente antes da apresentação.
