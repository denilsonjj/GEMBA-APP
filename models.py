# models.py
import sqlite3

DB_PATH = "gemba_app.db" # Certifique-se que este é o nome correto do seu banco

def create_tables():
    """Cria as tabelas no banco de dados se elas não existirem."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Criar tabela de usuários
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        cargo TEXT NOT NULL,
        is_admin BOOLEAN DEFAULT 0 NOT NULL, -- NOVO CAMPO AQUI
        UNIQUE(nome, cargo) 
    );
    """)

    # Criar tabela de fatos observáveis
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS fatos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL UNIQUE,
        limite_verde INTEGER,
        limite_laranja INTEGER,
        limite_vermelho INTEGER
    );
    """)

    # Criar tabela de registros
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS registros (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario_id INTEGER,
        fato_id INTEGER,
        dia_semana TEXT,
        valor INTEGER,
        cor TEXT, 
        correcao TEXT,
        data_registro TEXT, 
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
        FOREIGN KEY (fato_id) REFERENCES fatos(id)
    );
    """)

    # Criar tabela de resumos semanais
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS resumo (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario_id INTEGER,
        semana TEXT, 
        qtd_vermelho INTEGER,
        qtd_laranja INTEGER,
        descricao_segunda TEXT,
        descricao_terca TEXT,
        descricao_quarta TEXT,
        descricao_quinta TEXT,
        descricao_sexta TEXT,
        descricao_sabado TEXT,
        descricao_outro TEXT,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    );
    """)
    conn.commit()

    # Popular tabela de fatos com alguns exemplos, se estiver vazia
    cursor.execute("SELECT COUNT(*) FROM fatos")
    if cursor.fetchone()[0] == 0:
        default_fatos = [
            ("Absenteísmo", 0, 1, 2),
            ("Desvios Segurança", 0, 0, 0), 
            ("E.W.O", 1, 3, 5),
            ("Ordens de serviço", 5, 10, 15),
            ("Pendências emergenciais", 0, 1, 1),
            ("Ordens não realizadas", 0, 2, 4),
            ("Desvios clima social", 0, 0, 0),
            ("Desvios energia ", 0, 1, 2),
            ("Anomalias de máquina", 0, 1, 3),
            ("Desvios 5S", 0, 2, 5),
            ("Desvios Tablão AM", 0, 1, 3),
            ("Desvios Management Control", 0, 1, 2),
            ("Desvios Segurança recorrentes", 0, 0, 0)
        ]
        cursor.executemany("""
            INSERT INTO fatos (nome, limite_verde, limite_laranja, limite_vermelho)
            VALUES (?, ?, ?, ?)
        """, default_fatos)
        conn.commit()
        print("Tabela 'fatos' populada com dados iniciais.")

    conn.close()
    print(f"Banco de dados '{DB_PATH}' inicializado e tabelas criadas/verificadas.")

if __name__ == '__main__':
    create_tables()
    print("Execução de models.py concluída.")
