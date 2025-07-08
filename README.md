# GEMBA-APP

## Descrição

O **Gemba App** é uma aplicação web full-stack desenhada para facilitar o registo e a análise de dados operacionais diários num ambiente de produção, inspirado pela filosofia "Gemba". A plataforma permite que os utilizadores, como líderes de equipa e gestores, registem ocorrências diárias, monitorizem tendências através de gráficos, e exportem relatórios detalhados para uma análise mais aprofundada.

## Principais Funcionalidades

  * **Autenticação de Utilizadores:** Sistema de registo e login para acesso seguro à plataforma.
  * **Registo Diário de Ocorrências:** Formulário intuitivo para que os utilizadores registem valores de "factos observáveis" (ex: Absenteísmo, Desvios de Segurança) para cada dia da semana.
  * **Visualização de Dados:** Um painel de controlo com gráficos (Radar Chart) que agregam os dados de todas as equipas, permitindo uma visualização clara das tendências e dos pontos que necessitam de maior atenção.
  * **Painel de Administrador:** Uma área restrita para administradores onde é possível visualizar todos os registos individuais e filtrar por utilizador ou por facto.
  * **Exportação para Excel:** Funcionalidade para exportar um relatório completo de todos os dados registados em formato `.xlsx`.
  * **Gestão de Factos:** Interface para editar os nomes e os limites (verde, laranja, vermelho) dos factos observáveis, permitindo que a aplicação se adapte às necessidades da fábrica.
  * **Notificações via Telegram:** O backend está configurado para enviar relatórios gerados automaticamente para um chat do Telegram.

## Tecnologias Utilizadas

Este é um projeto full-stack que utiliza as seguintes tecnologias:

### Backend

  * **Framework:** Flask
  * **Base de Dados:** SQLite
  * **Linguagem:** Python
  * **Principais Bibliotecas:**
      * `Flask-CORS`: Para permitir requisições do frontend.
      * `pandas` e `openpyxl`: Para a geração de relatórios em Excel.

### Frontend

  * **Framework:** React
  * **Build Tool:** Vite
  * **Linguagem:** JavaScript (com JSX)
  * **Principais Bibliotecas:**
      * `react-router-dom`: Para a gestão de rotas da aplicação.
      * `recharts`: Para a criação de gráficos interativos.
      * `react-toastify`: Para a exibição de notificações e alertas.

## Pré-requisitos

Antes de começar, garanta que tem o seguinte software instalado na sua máquina:

  * [Python 3.12+](https://www.python.org/downloads/)
  * [Node.js e npm](https://nodejs.org/) (ou Yarn)
  * Um editor de código como [Visual Studio Code](https://code.visualstudio.com/)

## Como Executar o Projeto

Siga os passos abaixo para configurar e executar a aplicação localmente.

### 1\. Backend (Servidor Flask)

Primeiro, clone o repositório para a sua máquina:

```bash
git clone https://github.com/denilsonjj/gemba-app.git
cd gemba-app
```

Crie e ative um ambiente virtual:

```bash
# Para Windows
python -m venv venv
venv\Scripts\activate

# Para macOS/Linux
python3 -m venv venv
source venv/bin/activate
```

Instale as dependências do backend:

```bash
pip install -r requirements.txt
```

O ficheiro `models.py` é responsável por criar e popular a base de dados na primeira execução. Para garantir que a base de dados `gemba_app.db` é criada, execute o seguinte comando:

```bash
python models.py
```

Finalmente, inicie o servidor Flask:

```bash
flask run --port 5001
```

O backend estará agora a correr em `http://127.0.0.1:5001`.

### 2\. Frontend (Cliente React)

Abra um novo terminal e navegue para a pasta do frontend:

```bash
cd gemba-front
```

Instale as dependências do frontend:

```bash
npm install
```

Inicie a aplicação React:

```bash
npm run dev
```

O frontend estará agora acessível em `http://localhost:5173` (ou outra porta indicada pelo Vite). A aplicação irá conectar-se automaticamente ao backend.

## Estrutura do Projeto

A estrutura de ficheiros do projeto está organizada da seguinte forma:

```
/gemba-app
|-- venv/                  # Ambiente virtual do Python
|-- app.py                 # Ficheiro principal do backend (Flask)
|-- models.py              # Definição da base de dados e tabelas
|-- requirements.txt       # Dependências do backend
|-- gemba_app.db           # Ficheiro da base de dados SQLite
|-- .gitignore
|-- README.md
|
`-- /gemba-front           # Pasta do projeto frontend
    |-- /src
    |   |-- /components     # Componentes React reutilizáveis
    |   |-- /pages          # Componentes para cada página da aplicação
    |   |-- /styles         # Ficheiros CSS
    |   |-- App.jsx         # Componente principal do frontend
    |   `-- main.jsx        # Ponto de entrada da aplicação React
    |-- package.json        # Dependências e scripts do frontend
    `-- vite.config.js      # Ficheiro de configuração do Vite
```

## Endpoints da API

O backend em Flask expõe os seguintes endpoints principais:

  * `POST /register`: Regista um novo utilizador.
  * `POST /login`: Autentica um utilizador existente.
  * `POST /registro`: Submete os registos diários de um utilizador.
  * `GET /dados`: Retorna todos os registos individuais de todos os utilizadores.
  * `GET /fatos`: Retorna a lista de todos os factos observáveis e os seus limites.
  * `GET /admin/relatorio_completo/excel`: Gera e disponibiliza para download um relatório Excel com todos os dados.
  * `DELETE /registros/<int:registro_id>`: Apaga um registo individual (requer permissão).

-----
