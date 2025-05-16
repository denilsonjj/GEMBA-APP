# app.py
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import sqlite3
from datetime import datetime, date, timedelta # Adicionado date, timedelta
import models # Importa o models.py, que deve estar no mesmo diretório
import pandas as pd
import io

app = Flask(__name__)
CORS(app) # Permite requisições de todas as origens

# Inicializa o banco de dados e cria as tabelas se não existirem
try:
    models.create_tables()
except sqlite3.Error as e:
    print(f"Erro ao criar tabelas: {e}")

def get_db_conn():
    """Estabelece conexão com o banco de dados."""
    conn = sqlite3.connect(models.DB_PATH) # Usa DB_PATH de models.py
    conn.row_factory = sqlite3.Row 
    return conn

# --- Função para calcular semana ISO em Python ---
def get_iso_week_from_date_string(date_string):
    """Converte uma string de data/timestamp (ex: 'YYYY-MM-DD HH:MM:SS') para semana ISO 'YYYY-WNN'."""
    if not date_string:
        return None
    try:
        dt_obj = datetime.strptime(date_string.split(" ")[0], '%Y-%m-%d').date()
        iso_year, iso_week, _ = dt_obj.isocalendar()
        return f"{iso_year}-W{str(iso_week).zfill(2)}"
    except ValueError:
        print(f"Aviso: Formato de data inválido para get_iso_week_from_date_string: {date_string}")
        return None

def get_or_create_usuario(nome, cargo):
    """
    Busca um utilizador por nome e cargo. Se não existir, cria um novo.
    Retorna uma tupla: (id_do_utilizador, is_admin_boolean).
    Esta função gere a sua própria conexão com o banco de dados.
    """
    conn_usuario = None
    try:
        conn_usuario = get_db_conn()
        cursor = conn_usuario.cursor()
        is_admin_flag = 0 

        cursor.execute("SELECT id, is_admin FROM usuarios WHERE nome = ? AND cargo = ?", (nome, cargo))
        usuario_existente = cursor.fetchone()
        
        if usuario_existente:
            return usuario_existente["id"], usuario_existente["is_admin"] == 1
        else:
            cursor.execute("SELECT COUNT(*) FROM usuarios")
            user_count = cursor.fetchone()[0]
            if user_count == 0: # O primeiro utilizador criado é admin
                 is_admin_flag = 1
            
            # Exemplo alternativo: um utilizador com nome específico é admin
            # if nome.lower() == "admin_geral":
            #     is_admin_flag = 1

            cursor.execute("INSERT INTO usuarios (nome, cargo, is_admin) VALUES (?, ?, ?)", (nome, cargo, is_admin_flag))
            conn_usuario.commit()
            user_id = cursor.lastrowid
            return user_id, is_admin_flag == 1
            
    except sqlite3.Error as e:
        print(f"Erro SQLite ao buscar/criar usuário: {e}")
        if conn_usuario:
            conn_usuario.rollback() 
        return None, False
    finally:
        if conn_usuario:
            conn_usuario.close()

@app.route("/login", methods=["POST"])
def login_usuario():
    data = request.json
    if not data or not data.get("nome") or not data.get("cargo"):
        return jsonify({"erro": "Nome e cargo são obrigatórios"}), 400

    nome = data.get("nome")
    cargo = data.get("cargo")

    usuario_id, is_admin = get_or_create_usuario(nome, cargo)

    if usuario_id is None:
        return jsonify({"erro": "Erro ao processar utilizador no banco de dados"}), 500

    return jsonify({
        "mensagem": "Login bem-sucedido (simulado)",
        "usuario": {
            "id": usuario_id,
            "nome": nome,
            "cargo": cargo,
            "is_admin": is_admin
        }
    }), 200

def get_fato_details(fato_nome, conn_para_usar):
    """Busca os detalhes de um fato usando uma conexão de banco de dados fornecida."""
    cursor = conn_para_usar.cursor()
    try:
        cursor.execute("SELECT id, nome, limite_verde, limite_laranja, limite_vermelho FROM fatos WHERE nome = ?", (fato_nome,))
        fato = cursor.fetchone()
        return fato 
    except sqlite3.Error as e:
        print(f"Erro ao buscar detalhes do fato '{fato_nome}': {e}")
        return None

def calcular_cor(valor_registro, limite_verde, limite_laranja, limite_vermelho):
    """Calcula a cor com base no valor e nos limites."""
    if valor_registro is None: return "cinza"
    try:
        v = int(valor_registro)
        if limite_verde is None or limite_laranja is None: 
            print(f"Aviso: Limites não definidos para cálculo de cor. Valor: {v}, LV: {limite_verde}, LL: {limite_laranja}")
            return "sem_limites"
        if v <= limite_verde: return "verde"
        elif v <= limite_laranja: return "laranja"
        else: return "vermelho"
    except (ValueError, TypeError): 
        print(f"Aviso: Valor '{valor_registro}' inválido para cálculo de cor.")
        return "valor_invalido"

@app.route("/registro", methods=["POST"])
def registrar():
    data = request.json
    if not data: return jsonify({"erro": "Payload não fornecido"}), 400

    usuario_data = data.get("usuario")
    registros_dia = data.get("registros_dia")

    if not usuario_data or not isinstance(usuario_data, dict) or \
       not registros_dia or not isinstance(registros_dia, list):
        return jsonify({"erro": "Formato do payload inválido."}), 400

    nome_usuario = usuario_data.get("nome")
    cargo_usuario = usuario_data.get("cargo")

    if not nome_usuario or not cargo_usuario:
        return jsonify({"erro": "Nome e cargo do usuário são obrigatórios"}), 400

    temp_usuario_id, _ = get_or_create_usuario(nome_usuario, cargo_usuario)
    if not temp_usuario_id:
        return jsonify({"erro": "Não foi possível processar o utilizador"}), 500
    
    conn_transacao = None
    try:
        conn_transacao = get_db_conn()
        cursor_transacao = conn_transacao.cursor()
        data_atual_registro = datetime.now().strftime("%Y-%m-%d %H:%M:%S") 
        registros_processados_count = 0

        for item_registro in registros_dia:
            fato_nome = item_registro.get("fato_nome")
            dia_semana = item_registro.get("dia_semana")
            valor_str = item_registro.get("valor") 
            correcao = item_registro.get("correcao")

            if not fato_nome or not dia_semana or valor_str is None:
                print(f"Aviso: Registo incompleto pulado: {item_registro}")
                continue

            fato_detalhes = get_fato_details(fato_nome, conn_para_usar=conn_transacao)
            if not fato_detalhes:
                print(f"Aviso: Facto '{fato_nome}' não encontrado. Registo pulado.")
                continue 
            fato_id = fato_detalhes["id"]
            
            cor = calcular_cor(
                valor_str, 
                fato_detalhes["limite_verde"], 
                fato_detalhes["limite_laranja"],
                fato_detalhes["limite_vermelho"]
            )
            try:
                valor_int = int(valor_str) if valor_str is not None else None
            except (ValueError, TypeError):
                valor_int = None 
                print(f"Aviso: Valor '{valor_str}' para o facto '{fato_nome}' não é um inteiro válido. Será salvo como NULL.")

            cursor_transacao.execute('''
                INSERT INTO registros (usuario_id, fato_id, dia_semana, valor, cor, correcao, data_registro)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (
                temp_usuario_id, fato_id, dia_semana, valor_int, cor, correcao, data_atual_registro
            ))
            registros_processados_count += 1
        
        if registros_processados_count > 0:
            conn_transacao.commit()
            return jsonify({"status": "ok", "mensagem": f"{registros_processados_count} registos processados e salvos."}), 201
        else:
            return jsonify({"status": "parcial", "mensagem": "Nenhum registo válido para processar."}), 200
    
    except sqlite3.Error as e:
        if conn_transacao: conn_transacao.rollback()
        print(f"Erro SQLite durante o registo: {e}")
        return jsonify({"erro": "Erro ao salvar registos no banco de dados", "detalhes": str(e)}), 500
    except Exception as e:
        if conn_transacao: conn_transacao.rollback()
        print(f"Erro inesperado durante o registo: {e}")
        return jsonify({"erro": "Erro inesperado no servidor", "detalhes": str(e)}), 500
    finally:
        if conn_transacao:
            conn_transacao.close()

@app.route("/dados", methods=["GET"])
def listar_registros():
    conn = get_db_conn()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT 
                r.id as registro_id, 
                r.data_registro as data_registro, 
                u.nome as nome_usuario, 
                u.cargo as cargo_usuario,
                u.is_admin as usuario_is_admin,
                f.nome as nome_fato,
                r.dia_semana, 
                r.valor, 
                r.cor, 
                r.correcao
            FROM registros r
            JOIN usuarios u ON r.usuario_id = u.id
            JOIN fatos f ON r.fato_id = f.id
            ORDER BY r.data_registro DESC, r.id DESC 
        """)
        rows = cursor.fetchall()
        dados = [dict(row) for row in rows]
        return jsonify(dados)
    except sqlite3.Error as e:
        print(f"Erro SQLite ao listar dados: {e}")
        return jsonify({"erro": "Erro ao buscar dados do banco", "detalhes": str(e)}), 500
    finally:
        if conn:
            conn.close()

@app.route("/cargos", methods=["GET"])
def listar_cargos():
    cargos = [
        "Team Leader", "PMS", "PMM", "Técnico de Manutenção",
        "Operador", "Engenheiro de Processo", "Analista de Qualidade", "Supervisor de Produção"
    ]
    return jsonify(cargos)

@app.route("/fatos", methods=["GET"])
def listar_fatos_com_limites():
    conn = get_db_conn()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT id, nome, limite_verde, limite_laranja, limite_vermelho FROM fatos ORDER BY nome")
        rows = cursor.fetchall()
        fatos_com_detalhes = [dict(row) for row in rows]
        return jsonify(fatos_com_detalhes)
    except sqlite3.Error as e:
        print(f"Erro SQLite ao listar fatos: {e}")
        return jsonify({"erro": "Erro ao buscar fatos do banco", "detalhes": str(e)}), 500
    finally:
        if conn:
            conn.close()

@app.route("/fatos/<int:id_fato>", methods=["PUT"])
def atualizar_fato(id_fato):
    data = request.json
    if not data: return jsonify({"erro": "Payload não fornecido"}), 400

    novo_nome = data.get("nome")
    novo_limite_verde = data.get("limite_verde")
    novo_limite_laranja = data.get("limite_laranja")
    novo_limite_vermelho = data.get("limite_vermelho")

    if novo_nome is None and novo_limite_verde is None and novo_limite_laranja is None and novo_limite_vermelho is None:
        return jsonify({"erro": "Nenhum dado fornecido para atualização"}), 400
    
    try:
        if novo_limite_verde is not None: novo_limite_verde = int(novo_limite_verde)
        if novo_limite_laranja is not None: novo_limite_laranja = int(novo_limite_laranja)
        if novo_limite_vermelho is not None: novo_limite_vermelho = int(novo_limite_vermelho)
    except ValueError:
        return jsonify({"erro": "Valores de limite devem ser números inteiros"}), 400

    conn = get_db_conn()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT * FROM fatos WHERE id = ?", (id_fato,))
        if not cursor.fetchone():
            conn.close() # Fechar conexão se o facto não for encontrado
            return jsonify({"erro": f"Facto com ID {id_fato} não encontrado"}), 404

        campos_para_atualizar = []
        valores_para_atualizar = []

        if novo_nome is not None and novo_nome.strip() != "":
            campos_para_atualizar.append("nome = ?")
            valores_para_atualizar.append(novo_nome.strip())
        if novo_limite_verde is not None:
            campos_para_atualizar.append("limite_verde = ?")
            valores_para_atualizar.append(novo_limite_verde)
        if novo_limite_laranja is not None:
            campos_para_atualizar.append("limite_laranja = ?")
            valores_para_atualizar.append(novo_limite_laranja)
        if novo_limite_vermelho is not None:
            campos_para_atualizar.append("limite_vermelho = ?")
            valores_para_atualizar.append(novo_limite_vermelho)
        
        if not campos_para_atualizar:
             conn.close() # Fechar conexão se não houver campos válidos
             return jsonify({"erro": "Nenhum dado válido fornecido para atualização"}), 400

        query_update = f"UPDATE fatos SET {', '.join(campos_para_atualizar)} WHERE id = ?"
        valores_para_atualizar.append(id_fato)

        cursor.execute(query_update, tuple(valores_para_atualizar))
        conn.commit()

        if cursor.rowcount == 0:
            # conn.close() # A conexão será fechada no finally
            return jsonify({"erro": f"Nenhum facto atualizado. ID {id_fato} pode não existir ou dados são os mesmos."}), 404
        
        # conn.close() # A conexão será fechada no finally
        return jsonify({"status": "ok", "mensagem": f"Facto ID {id_fato} atualizado com sucesso"}), 200
    except sqlite3.IntegrityError as e:
        conn.rollback()
        return jsonify({"erro": "Erro de integridade ao atualizar o facto (ex: nome duplicado)", "detalhes": str(e)}), 409
    except sqlite3.Error as e:
        conn.rollback()
        print(f"Erro SQLite ao atualizar facto: {e}")
        return jsonify({"erro": "Erro no banco de dados ao atualizar o facto", "detalhes": str(e)}), 500
    finally:
        if conn:
            conn.close()

@app.route("/resumo", methods=["POST"])
def salvar_resumo():
    data = request.json
    if not data: return jsonify({"erro": "Payload não fornecido"}), 400
    
    usuario_data = data.get("usuario")
    if not usuario_data: return jsonify({"erro": "Dados do usuário não fornecidos"}), 400
    
    nome_usuario = usuario_data.get("nome")
    cargo_usuario = usuario_data.get("cargo")
    if not nome_usuario or not cargo_usuario:
        return jsonify({"erro": "Nome e cargo do usuário são obrigatórios"}), 400

    temp_usuario_id, _ = get_or_create_usuario(nome_usuario, cargo_usuario)
    if not temp_usuario_id:
        return jsonify({"erro": "Não foi possível processar o utilizador para o resumo"}), 500
    
    semana = data.get("semana")
    qtd_vermelho = data.get("qtd_vermelho")
    qtd_laranja = data.get("qtd_laranja")
    descricoes = data.get("descricoes")

    if semana is None or qtd_vermelho is None or qtd_laranja is None or descricoes is None:
        return jsonify({"erro": "Dados incompletos para o resumo."}), 400

    conn_transacao = None
    try:
        conn_transacao = get_db_conn()
        cursor_transacao = conn_transacao.cursor()
        cursor_transacao.execute("""
            INSERT INTO resumo (
                usuario_id, semana, qtd_vermelho, qtd_laranja,
                descricao_segunda, descricao_terca, descricao_quarta,
                descricao_quinta, descricao_sexta, descricao_sabado, descricao_outro
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            temp_usuario_id, semana, qtd_vermelho, qtd_laranja,
            descricoes.get("segunda"), descricoes.get("terca"), descricoes.get("quarta"),
            descricoes.get("quinta"), descricoes.get("sexta"), descricoes.get("sabado"),
            descricoes.get("outro")
        ))
        conn_transacao.commit()
        return jsonify({"status": "ok", "mensagem": "Resumo salvo com sucesso!", "id_resumo": cursor_transacao.lastrowid}), 201
    except sqlite3.Error as e:
        if conn_transacao: conn_transacao.rollback()
        print(f"Erro SQLite ao salvar resumo: {e}")
        return jsonify({"erro": "Erro ao salvar resumo no banco de dados", "detalhes": str(e)}), 500
    finally:
        if conn_transacao:
            conn_transacao.close()

@app.route("/resumos", methods=["GET"])
def listar_resumos():
    conn = get_db_conn()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT 
                res.id as resumo_id, u.nome as nome_usuario, u.cargo as cargo_usuario,
                res.semana, res.qtd_vermelho, res.qtd_laranja,
                res.descricao_segunda, res.descricao_terca, res.descricao_quarta,
                res.descricao_quinta, res.descricao_sexta, res.descricao_sabado,
                res.descricao_outro, res.usuario_id
            FROM resumo res
            JOIN usuarios u ON res.usuario_id = u.id
            ORDER BY res.semana DESC, res.id DESC
        """)
        rows = cursor.fetchall()
        resumos = [dict(row) for row in rows]
        return jsonify(resumos)
    except sqlite3.Error as e:
        print(f"Erro SQLite ao listar resumos: {e}")
        return jsonify({"erro": "Erro ao buscar resumos do banco", "detalhes": str(e)}), 500
    finally:
        if conn:
            conn.close()

@app.route("/admin/relatorio_completo/excel", methods=["GET"])
def download_relatorio_completo_excel():
    conn = None
    try:
        conn = get_db_conn()
        
        query_registros = """
            SELECT 
                r.data_registro,
                r.usuario_id, 
                u.nome as "Nome do Utilizador",
                u.cargo as "Cargo do Utilizador",
                f.nome as "Facto Observável",
                r.dia_semana as "Dia da Semana (Registo)",
                r.valor as "Valor Registado",
                r.cor as "Zona de Alerta (Registo)",
                r.correcao as "Observação/Correção (Registo)"
            FROM registros r
            JOIN usuarios u ON r.usuario_id = u.id
            JOIN fatos f ON r.fato_id = f.id;
        """
        df_registros = pd.read_sql_query(query_registros, conn)

        if df_registros.empty:
            conn.close() # Fechar conexão se não houver registos
            return jsonify({"mensagem": "Nenhum registo para exportar"}), 404

        df_registros['Semana ISO'] = df_registros['data_registro'].apply(get_iso_week_from_date_string)
        df_registros['Data do Registo'] = pd.to_datetime(df_registros['data_registro']).dt.strftime('%Y-%m-%d %H:%M:%S')

        query_resumos = """
            SELECT 
                res.semana as "Semana ISO", 
                res.usuario_id,
                res.qtd_vermelho as "Total Vermelho (Semana)",
                res.qtd_laranja as "Total Laranja (Semana)",
                res.descricao_segunda as "Descrição Segunda (Resumo)",
                res.descricao_terca as "Descrição Terça (Resumo)",
                res.descricao_quarta as "Descrição Quarta (Resumo)",
                res.descricao_quinta as "Descrição Quinta (Resumo)",
                res.descricao_sexta as "Descrição Sexta (Resumo)",
                res.descricao_sabado as "Descrição Sábado (Resumo)",
                res.descricao_outro as "Descrição Outro (Resumo)"
            FROM resumo res;
        """
        df_resumos = pd.read_sql_query(query_resumos, conn)

        if not df_resumos.empty:
            # Garantir que as colunas de junção são do mesmo tipo se houver problemas
            # df_registros['usuario_id'] = df_registros['usuario_id'].astype(int)
            # df_resumos['usuario_id'] = df_resumos['usuario_id'].astype(int)
            df_final = pd.merge(df_registros, df_resumos, on=['Semana ISO', 'usuario_id'], how='left')
        else:
            df_final = df_registros
            resumo_cols = [
                "Total Vermelho (Semana)", "Total Laranja (Semana)", "Descrição Segunda (Resumo)",
                "Descrição Terça (Resumo)", "Descrição Quarta (Resumo)", "Descrição Quinta (Resumo)",
                "Descrição Sexta (Resumo)", "Descrição Sábado (Resumo)", "Descrição Outro (Resumo)"
            ]
            for col in resumo_cols:
                if col not in df_final.columns:
                    df_final[col] = pd.NA # Usar pd.NA para valores ausentes em Pandas > 1.0


        colunas_finais_ordenadas = [
            "Data do Registo", "Semana ISO", "Nome do Utilizador", "Cargo do Utilizador",
            "Facto Observável", "Dia da Semana (Registo)", "Valor Registado", 
            "Zona de Alerta (Registo)", "Observação/Correção (Registo)",
            "Total Vermelho (Semana)", "Total Laranja (Semana)",
            "Descrição Segunda (Resumo)", "Descrição Terça (Resumo)", "Descrição Quarta (Resumo)",
            "Descrição Quinta (Resumo)", "Descrição Sexta (Resumo)", "Descrição Sábado (Resumo)",
            "Descrição Outro (Resumo)"
        ]
        colunas_existentes_para_exportar = [col for col in colunas_finais_ordenadas if col in df_final.columns]
        df_final_exportar = df_final[colunas_existentes_para_exportar]

        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df_final_exportar.to_excel(writer, index=False, sheet_name='Relatorio_Completo') # Nome da folha sem espaços
        
        output.seek(0)

        return send_file(
            output,
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            as_attachment=True,
            download_name='relatorio_completo_gemba.xlsx'
        )

    except sqlite3.Error as e:
        print(f"Erro SQLite ao gerar Relatório Completo Excel: {e}")
        return jsonify({"erro": "Erro no banco de dados ao gerar planilha", "detalhes": str(e)}), 500
    except Exception as e:
        print(f"Erro inesperado ao gerar Relatório Completo Excel: {e}")
        return jsonify({"erro": "Erro inesperado no servidor ao gerar planilha", "detalhes": str(e)}), 500
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    app.run(debug=True, port=5001)
