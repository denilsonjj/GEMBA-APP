# app.py
from flask import Flask, request, jsonify, send_file, g
from flask_cors import CORS
import sqlite3
from datetime import datetime
import models
import pandas as pd
import io
import logging
import requests 
import os 


logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s (%(filename)s:%(lineno)d)')

app = Flask(__name__)
CORS(app)

# --- TELEGRAM CONFIG ---
TELEGRAM_BOT_TOKEN = os.getenv("7805481519:AAEAejmXYC7bPF_Tedk--DDDXJ0JRVPYIEY") 
TELEGRAM_CHAT_ID = os.getenv("-4807193335") 

try:
    models.create_tables()
except sqlite3.Error as e:
    logging.critical(f"FALHA CRÍTICA ao inicializar tabelas: {e}", exc_info=True)

def get_db_conn_for_script():
    conn = sqlite3.connect(models.DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def get_db_conn():
    if 'db' not in g:
        g.db = sqlite3.connect(models.DB_PATH)
        g.db.row_factory = sqlite3.Row
    return g.db

@app.teardown_appcontext
def close_db_conn(exception=None):
    db = g.pop('db', None)
    if db is not None:
        db.close()

def log_exception(e, context_message="Erro não especificado"):
    logging.error(f"{context_message}: {type(e).__name__} - {str(e)}", exc_info=True)

def get_iso_week_from_date_string(date_string):
    if not date_string: return None
    try:
        dt_obj = datetime.strptime(date_string.split(" ")[0], '%Y-%m-%d').date()
        iso_year, iso_week, _ = dt_obj.isocalendar()
        return f"{iso_year}-W{str(iso_week).zfill(2)}"
    except ValueError:
        log_exception(ValueError(f"Formato de data inválido para get_iso_week: {date_string}"), "get_iso_week_from_date_string")
        return None

def get_fato_details(fato_nome, conn):
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT id, nome, limite_verde, limite_laranja, limite_vermelho FROM fatos WHERE nome = ?", (fato_nome,))
        return cursor.fetchone()
    except sqlite3.Error as e:
        log_exception(e, f"get_fato_details (fato_nome: {fato_nome})")
        return None

def calcular_cor(valor_registro, limite_verde, limite_laranja, limite_vermelho):
    if valor_registro is None: return "cinza"
    try:
        v = int(valor_registro)
        if limite_verde is None or limite_laranja is None: return "sem_limites"
        if v <= limite_verde: return "verde"
        if v <= limite_laranja: return "laranja"
        return "vermelho"
    except (ValueError, TypeError):
        return "valor_invalido"

def send_telegram_document(file_bytes, filename, caption=""):
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID or TELEGRAM_BOT_TOKEN == "7805481519:AAEAejmXYC7bPF_Tedk--DDDXJ0JRVPYIEY" or TELEGRAM_CHAT_ID == "-4807193335":
        logging.error("ERRO: Bot do Telegram ou Chat ID não configurados corretamente ou ainda com placeholders.")
        return False
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendDocument"
    files = {'document': (filename, file_bytes, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')}
    data = {'chat_id': TELEGRAM_CHAT_ID}
    if caption:
        data['caption'] = caption
    try:
        logging.info(f"Tentando enviar '{filename}' para o Telegram chat_id: {TELEGRAM_CHAT_ID}")
        response = requests.post(url, files=files, data=data, timeout=30)
        response.raise_for_status()
        logging.info(f"Documento '{filename}' enviado para o Telegram com sucesso. Resposta: {response.json()}")
        return True
    except requests.exceptions.HTTPError as http_err:
        logging.error(f"Erro HTTP ao enviar para Telegram API: {http_err}")
        logging.error(f"Detalhes da resposta da API Telegram: {http_err.response.text if http_err.response else 'Sem resposta detalhada'}")
    except requests.exceptions.RequestException as req_err:
        logging.error(f"Erro de requisição ao enviar para Telegram API: {req_err}")
    except Exception as e:
        log_exception(e, "send_telegram_document - Erro inesperado")
    return False

# --- ROTAS DE AUTENTICAÇÃO E DADOS (existentes) ---
@app.route("/register", methods=["POST"])
def register_user():
    data = request.json
    required_fields = ["nome", "cargo", "email"]
    if not data or not all(field in data and data[field] for field in required_fields):
        missing = [field for field in required_fields if not data or not data.get(field)]
        return jsonify({"erro": f"Campos obrigatórios ausentes ou vazios: {', '.join(missing)}"}), 400
    nome = data["nome"]
    cargo = data["cargo"]
    email = data["email"].lower()
    try:
        conn = get_db_conn()
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM usuarios WHERE email = ?", (email,))
        if cursor.fetchone():
            return jsonify({"erro": "Este email já está registado."}), 409
        cursor.execute("SELECT COUNT(*) FROM usuarios")
        is_admin_flag = 1 if cursor.fetchone()[0] == 0 else 0
        cursor.execute(
            "INSERT INTO usuarios (nome, cargo, email, is_admin) VALUES (?, ?, ?, ?)",
            (nome, cargo, email, is_admin_flag)
        )
        conn.commit()
        user_id = cursor.lastrowid
        return jsonify({
            "mensagem": "Utilizador registado com sucesso!",
            "usuario": {"id": user_id, "nome": nome, "email": email, "cargo": cargo, "is_admin": bool(is_admin_flag)}
        }), 201
    except sqlite3.IntegrityError:
        log_exception(sqlite3.IntegrityError("Email já existe"), "register_user - Email Unique Constraint")
        return jsonify({"erro": "Email já existe."}), 409
    except sqlite3.Error as e:
        log_exception(e, "register_user - Erro BD")
        return jsonify({"erro": "Erro no banco de dados ao registar utilizador."}), 500

@app.route("/login", methods=["POST"])
def login_usuario():
    data = request.json
    if not data or not data.get("nome") or not data.get("email"):
        return jsonify({"erro": "Nome e email são obrigatórios para login."}), 400
    nome_login = data["nome"]
    email_login = data["email"].lower()
    try:
        conn = get_db_conn()
        cursor = conn.cursor()
        cursor.execute("SELECT id, nome, cargo, email, is_admin FROM usuarios WHERE email = ?", (email_login,))
        user_data = cursor.fetchone()
        if user_data and user_data["nome"] == nome_login:
            return jsonify({
                "mensagem": "Login bem-sucedido!",
                "usuario": dict(user_data)
            }), 200
        else:
            return jsonify({"erro": "Nome ou email inválidos, ou utilizador não encontrado."}), 401
    except sqlite3.Error as e:
        log_exception(e, "login_usuario - Erro BD")
        return jsonify({"erro": "Erro no banco de dados durante o login."}), 500

@app.route("/registro", methods=["POST"])
def registrar_fato_diario():
    data = request.json
    if not data: return jsonify({"erro": "Payload não fornecido."}), 400
    usuario_id = data.get("usuario_id")
    registros_dia = data.get("registros_dia")
    if not isinstance(usuario_id, int):
         return jsonify({"erro": "usuario_id (inteiro) é obrigatório."}), 400
    if not isinstance(registros_dia, list):
        return jsonify({"erro": "Formato do payload de 'registros_dia' inválido (deve ser uma lista)."}), 400
    try:
        conn = get_db_conn()
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM usuarios WHERE id = ?", (usuario_id,))
        if not cursor.fetchone():
            return jsonify({"erro": f"Utilizador com ID {usuario_id} não encontrado."}), 404
        data_atual_registro = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        registros_para_inserir = []
        for item in registros_dia:
            fato_nome = item.get("fato_nome")
            dia_semana = item.get("dia_semana")
            valor_input = item.get("valor")
            descricao_dia = item.get("descricao_fato_dia", "")
            if not fato_nome or not dia_semana or valor_input is None:
                logging.debug(f"Registro ignorado por dados faltantes: {item}")
                continue
            fato_detalhes = get_fato_details(fato_nome, conn)
            if not fato_detalhes:
                logging.warning(f"Fato '{fato_nome}' não encontrado. Registro ignorado: {item}")
                continue
            fato_id = fato_detalhes["id"]
            try:
                valor_int = int(valor_input) if valor_input != "" else None
            except (ValueError, TypeError):
                logging.warning(f"Valor inválido '{valor_input}' para o fato '{fato_nome}'. Definido como None. Registro: {item}")
                valor_int = None
            cor = calcular_cor(valor_int, fato_detalhes["limite_verde"], fato_detalhes["limite_laranja"], fato_detalhes["limite_vermelho"])
            registros_para_inserir.append(
                (usuario_id, fato_id, dia_semana, valor_int, cor, descricao_dia, data_atual_registro)
            )
        if registros_para_inserir:
            cursor.executemany('''
                INSERT INTO registros (usuario_id, fato_id, dia_semana, valor, cor, descricao_fato_dia, data_registro)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', registros_para_inserir)
            conn.commit()
            return jsonify({"status": "ok", "mensagem": f"{len(registros_para_inserir)} registos processados com sucesso."}), 201
        else:
            return jsonify({"status": "info", "mensagem": "Nenhum registo válido para processar."}), 200
    except sqlite3.Error as e:
        if 'db' in g and g.db: g.db.rollback()
        log_exception(e, "registrar_fato_diario - Erro BD")
        return jsonify({"erro": "Erro no banco de dados ao salvar registos."}), 500

@app.route("/resumo", methods=["POST"])
def salvar_resumo():
    data = request.json
    if not data: return jsonify({"erro": "Payload não fornecido."}), 400
    usuario_id = data.get("usuario_id")
    semana = data.get("semana")
    qtd_vermelho = data.get("qtd_vermelho")
    qtd_laranja = data.get("qtd_laranja")
    observacao_geral = data.get("observacao_geral_semana", "")
    if not isinstance(usuario_id, int):
         return jsonify({"erro": "usuario_id (inteiro) é obrigatório."}), 400
    if semana is None or qtd_vermelho is None or qtd_laranja is None:
        return jsonify({"erro": "Campos 'semana', 'qtd_vermelho', 'qtd_laranja' são obrigatórios."}), 400
    try:
        conn = get_db_conn()
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM usuarios WHERE id = ?", (usuario_id,))
        if not cursor.fetchone():
            return jsonify({"erro": f"Utilizador com ID {usuario_id} não encontrado para resumo."}), 404
        cursor.execute("""
            INSERT INTO resumo (usuario_id, semana, qtd_vermelho, qtd_laranja, observacao_geral_semana)
            VALUES (?, ?, ?, ?, ?)
        """, (usuario_id, semana, qtd_vermelho, qtd_laranja, observacao_geral))
        conn.commit()
        return jsonify({"status": "ok", "mensagem": "Resumo salvo com sucesso!", "id_resumo": cursor.lastrowid}), 201
    except sqlite3.Error as e:
        if 'db' in g and g.db: g.db.rollback()
        log_exception(e, "salvar_resumo - Erro BD")
        return jsonify({"erro": "Erro no banco de dados ao salvar resumo."}), 500

@app.route("/dados", methods=["GET"])
def listar_registros_todos():
    try:
        conn = get_db_conn()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT r.id as registro_id, r.data_registro, u.nome as nome_usuario,
                   u.cargo as cargo_usuario, u.is_admin as usuario_is_admin,
                   f.nome as nome_fato, r.dia_semana, r.valor, r.cor, r.descricao_fato_dia,
                   r.usuario_id as registro_usuario_id -- Adicionado para verificação de propriedade
            FROM registros r
            JOIN usuarios u ON r.usuario_id = u.id
            JOIN fatos f ON r.fato_id = f.id
            ORDER BY r.data_registro DESC, r.id DESC
        """)
        return jsonify([dict(row) for row in cursor.fetchall()])
    except sqlite3.Error as e:
        log_exception(e, "listar_registros_todos - Erro BD")
        return jsonify({"erro": "Erro ao buscar todos os registos."}), 500

@app.route("/registros_da_semana", methods=["GET"])
def get_registros_da_semana():
    usuario_id = request.args.get("usuario_id", type=int)
    semana_iso_param = request.args.get("semana") 
    if not usuario_id or not semana_iso_param:
        return jsonify({"erro": "Parâmetros 'usuario_id' e 'semana' são obrigatórios."}), 400
    try:
        conn = get_db_conn()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT r.data_registro, f.nome as nome_fato, r.dia_semana, r.descricao_fato_dia, r.cor, r.valor
            FROM registros r
            JOIN fatos f ON r.fato_id = f.id
            WHERE r.usuario_id = ?
            ORDER BY f.nome ASC, r.data_registro ASC
        """, (usuario_id,))
        registros_do_usuario = cursor.fetchall()
        descricoes_por_fato_na_semana = {}
        for reg_row in registros_do_usuario:
            reg_dict = dict(reg_row)
            if get_iso_week_from_date_string(reg_dict["data_registro"]) == semana_iso_param:
                fato_nome_atual = reg_dict['nome_fato']
                if fato_nome_atual not in descricoes_por_fato_na_semana:
                    descricoes_por_fato_na_semana[fato_nome_atual] = []
                descricoes_por_fato_na_semana[fato_nome_atual].append({
                    "dia_semana": reg_dict['dia_semana'],
                    "descricao": reg_dict['descricao_fato_dia'],
                    "cor": reg_dict['cor'],
                    "valor": reg_dict['valor'],
                    "data_registro": reg_dict['data_registro']
                })
        if not descricoes_por_fato_na_semana:
            logging.info(f"Nenhum registro encontrado para usuario_id: {usuario_id}, semana: {semana_iso_param}")
            return jsonify({}), 200
        return jsonify(descricoes_por_fato_na_semana)
    except sqlite3.Error as e_sql:
        log_exception(e_sql, f"get_registros_da_semana SQL (usuario_id: {usuario_id}, semana: {semana_iso_param})")
        return jsonify({"erro": "Erro no banco de dados ao buscar descrições da semana."}), 500
    except Exception as e_geral:
        log_exception(e_geral, f"get_registros_da_semana Geral (usuario_id: {usuario_id}, semana: {semana_iso_param})")
        return jsonify({"erro": "Erro inesperado ao buscar descrições da semana."}), 500

@app.route("/cargos", methods=["GET"])
def listar_cargos_api():
    cargos = ["Team Leader", "PMS", "PMM", "Técnico de Manutenção", "Operador", "Engenheiro de Processo", "Analista de Qualidade", "Supervisor de Produção"]
    return jsonify(cargos)

@app.route("/fatos", methods=["GET"])
def listar_fatos_api():
    try:
        conn = get_db_conn()
        cursor = conn.cursor()
        cursor.execute("SELECT id, nome, limite_verde, limite_laranja, limite_vermelho FROM fatos ORDER BY nome")
        return jsonify([dict(row) for row in cursor.fetchall()])
    except sqlite3.Error as e:
        log_exception(e, "listar_fatos_api - Erro BD")
        return jsonify({"erro": "Erro ao buscar fatos."}), 500

@app.route("/resumos", methods=["GET"])
def listar_resumos_api():
    try:
        conn = get_db_conn()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT res.id as resumo_id, u.nome as nome_usuario, u.cargo as cargo_usuario,
                   res.semana, res.qtd_vermelho, res.qtd_laranja,
                   res.observacao_geral_semana, res.usuario_id
            FROM resumo res JOIN usuarios u ON res.usuario_id = u.id
            ORDER BY res.semana DESC, res.id DESC
        """)
        return jsonify([dict(row) for row in cursor.fetchall()])
    except sqlite3.Error as e:
        log_exception(e, "listar_resumos_api - Erro BD")
        return jsonify({"erro": "Erro ao buscar resumos."}), 500

@app.route("/meus_dados", methods=["DELETE"])
def deletar_meus_dados():
    data = request.json
    usuario_id = data.get("usuario_id")
    if not isinstance(usuario_id, int):
        return jsonify({"erro": "usuario_id (inteiro) é obrigatório no corpo da requisição."}), 400
    try:
        conn = get_db_conn()
        cursor = conn.cursor()
        conn.execute("BEGIN TRANSACTION;")
        cursor.execute("DELETE FROM registros WHERE usuario_id = ?", (usuario_id,))
        registros_deletados = cursor.rowcount
        logging.info(f"Deletados {registros_deletados} registos para o usuario_id: {usuario_id}")
        cursor.execute("DELETE FROM resumo WHERE usuario_id = ?", (usuario_id,))
        resumos_deletados = cursor.rowcount
        logging.info(f"Deletados {resumos_deletados} resumos para o usuario_id: {usuario_id}")
        conn.commit()
        return jsonify({
            "mensagem": f"Todos os seus dados (registos e resumos) foram apagados com sucesso. Registos apagados: {registros_deletados}, Resumos apagados: {resumos_deletados}."
        }), 200
    except sqlite3.Error as e:
        if 'db' in g and g.db:
            try: g.db.rollback()
            except Exception as rb_e: log_exception(rb_e, f"deletar_meus_dados - Erro no Rollback para usuario_id: {usuario_id}")
        log_exception(e, f"deletar_meus_dados - Erro BD para usuario_id: {usuario_id}")
        return jsonify({"erro": "Erro no banco de dados ao apagar seus dados."}), 500
    except Exception as e_geral:
        if 'db' in g and g.db:
            try: g.db.rollback()
            except Exception as rb_e: log_exception(rb_e, f"deletar_meus_dados - Erro no Rollback (exceção geral) para usuario_id: {usuario_id}")
        log_exception(e_geral, f"deletar_meus_dados - Erro inesperado para usuario_id: {usuario_id}")
        return jsonify({"erro": "Ocorreu um erro inesperado ao tentar apagar seus dados."}), 500

# --- NOVA ROTA PARA DELETAR UM REGISTO INDIVIDUAL ---
@app.route("/registros/<int:registro_id>", methods=["DELETE"])
def deletar_registro_individual(registro_id):
    # O frontend precisará enviar o usuario_id do usuário logado para verificação.
    # Em um sistema com autenticação robusta (ex: JWT), o usuario_id viria do token.
    data = request.json
    usuario_logado_id = data.get("usuario_id") # ID do usuário que está a fazer a requisição

    if not isinstance(usuario_logado_id, int):
        return jsonify({"erro": "usuario_id (inteiro) é obrigatório no corpo da requisição para verificação."}), 400

    try:
        conn = get_db_conn()
        cursor = conn.cursor()

        # Verificar se o registro existe e se pertence ao usuário logado (ou se o usuário é admin)
        # Primeiro, pegar os dados do usuário logado para checar se é admin
        cursor.execute("SELECT is_admin FROM usuarios WHERE id = ?", (usuario_logado_id,))
        user_logado_info = cursor.fetchone()
        if not user_logado_info:
             return jsonify({"erro": "Usuário da requisição não encontrado."}), 404
        
        is_admin_logado = user_logado_info["is_admin"] == 1

        # Agora, verificar o registro
        cursor.execute("SELECT usuario_id FROM registros WHERE id = ?", (registro_id,))
        registro = cursor.fetchone()

        if not registro:
            return jsonify({"erro": "Registo não encontrado."}), 404

        # Permite deleção se o usuário logado for o dono do registro OU se for admin
        if registro["usuario_id"] != usuario_logado_id and not is_admin_logado:
            return jsonify({"erro": "Não autorizado a apagar este registo."}), 403

        cursor.execute("DELETE FROM registros WHERE id = ?", (registro_id,))
        conn.commit()

        if cursor.rowcount > 0:
            return jsonify({"mensagem": f"Registo ID {registro_id} apagado com sucesso."}), 200
        else:
            # Isso não deveria acontecer se a verificação acima encontrou o registro
            return jsonify({"erro": "Registo não encontrado ou já apagado (rowcount 0)."}), 404

    except sqlite3.Error as e:
        if 'db' in g and g.db: g.db.rollback() # Rollback em caso de erro
        log_exception(e, f"deletar_registro_individual (registro_id: {registro_id}) - Erro BD")
        return jsonify({"erro": "Erro no banco de dados ao apagar o registo."}), 500
    except Exception as e_geral:
        if 'db' in g and g.db: g.db.rollback()
        log_exception(e_geral, f"deletar_registro_individual (registro_id: {registro_id}) - Erro Geral")
        return jsonify({"erro": "Erro inesperado ao apagar o registo."}), 500


@app.route("/admin/relatorio_completo/excel", methods=["GET"])
def download_relatorio_completo_excel_api():
    try:
        conn = get_db_conn()
        query_registros = """
            SELECT r.data_registro, r.usuario_id, u.nome as "Nome do Utilizador",
                   u.cargo as "Cargo do Utilizador", f.nome as "Facto Observável",
                   r.dia_semana as "Dia da Semana (Registo)", r.valor as "Valor Registado",
                   r.cor as "Zona de Alerta (Registo)",
                   r.descricao_fato_dia as "Descrição do Dia (Registo)"
            FROM registros r JOIN usuarios u ON r.usuario_id = u.id JOIN fatos f ON r.fato_id = f.id;
        """
        df_registros = pd.read_sql_query(query_registros, conn)
        if df_registros.empty:
            return jsonify({"mensagem": "Nenhum registo para exportar"}), 404
        df_registros['Semana ISO'] = df_registros['data_registro'].apply(get_iso_week_from_date_string)
        df_registros['Data do Registo'] = pd.to_datetime(df_registros['data_registro']).dt.strftime('%Y-%m-%d %H:%M:%S')
        query_resumos = """
            SELECT res.semana as "Semana ISO", res.usuario_id,
                   res.qtd_vermelho as "Total Vermelho (Semana)",
                   res.qtd_laranja as "Total Laranja (Semana)",
                   res.observacao_geral_semana as "Observação Geral (Semana)"
            FROM resumo res;
        """
        df_resumos = pd.read_sql_query(query_resumos, conn)
        if not df_resumos.empty:
            df_final = pd.merge(df_registros, df_resumos, on=['Semana ISO', 'usuario_id'], how='left')
        else:
            df_final = df_registros.copy()
            resumo_cols_a_adicionar = ["Total Vermelho (Semana)", "Total Laranja (Semana)", "Observação Geral (Semana)"]
            for col in resumo_cols_a_adicionar:
                if col not in df_final.columns:
                    df_final[col] = pd.NA
        colunas_finais_desejadas = [
            "Data do Registo", "Semana ISO", "Nome do Utilizador", "Cargo do Utilizador",
            "Facto Observável", "Dia da Semana (Registo)", "Valor Registado",
            "Zona de Alerta (Registo)", "Descrição do Dia (Registo)",
            "Total Vermelho (Semana)", "Total Laranja (Semana)", "Observação Geral (Semana)"
        ]
        colunas_para_exportar = [col for col in colunas_finais_desejadas if col in df_final.columns]
        df_final_exportar = df_final[colunas_para_exportar]
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df_final_exportar.to_excel(writer, index=False, sheet_name='Relatorio_Completo')
        output.seek(0) 
        file_bytes_for_telegram = output.getvalue()
        excel_filename = f"relatorio_gemba_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
        caption_text = f"Relatório Gemba (via Download) gerado em: {datetime.now().strftime('%d/%m/%Y %H:%M')}"
        if send_telegram_document(file_bytes_for_telegram, excel_filename, caption_text):
            logging.info(f"Planilha '{excel_filename}' (acionada por download) também enviada para o Telegram.")
        else:
            logging.error(f"Falha ao enviar a planilha '{excel_filename}' (acionada por download) para o Telegram.")
        output.seek(0) 
        return send_file(output, mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                         as_attachment=True, download_name='relatorio_completo_gemba.xlsx')
    except sqlite3.Error as e_sql:
        log_exception(e_sql, "download_relatorio_completo_excel_api - Erro BD")
        return jsonify({"erro": "Erro no banco de dados ao gerar planilha."}), 500
    except Exception as e:
        log_exception(e, "download_relatorio_completo_excel_api - Erro Geral")
        return jsonify({"erro": "Erro inesperado ao gerar planilha."}), 500

def generate_and_send_daily_report_telegram():
    logging.info("Iniciando geração de relatório diário para Telegram...")
    conn_script = None
    try:
        conn_script = get_db_conn_for_script()
        query_registros = """
            SELECT r.data_registro, r.usuario_id, u.nome as "Nome do Utilizador",
                   u.cargo as "Cargo do Utilizador", f.nome as "Facto Observável",
                   r.dia_semana as "Dia da Semana (Registo)", r.valor as "Valor Registado",
                   r.cor as "Zona de Alerta (Registo)",
                   r.descricao_fato_dia as "Descrição do Dia (Registo)"
            FROM registros r JOIN usuarios u ON r.usuario_id = u.id JOIN fatos f ON r.fato_id = f.id;
        """
        df_registros = pd.read_sql_query(query_registros, conn_script)
        if df_registros.empty:
            logging.info("Nenhum registo encontrado para o relatório diário do Telegram.")
            return
        df_registros['Semana ISO'] = df_registros['data_registro'].apply(get_iso_week_from_date_string)
        df_registros['Data do Registo'] = pd.to_datetime(df_registros['data_registro']).dt.strftime('%Y-%m-%d %H:%M:%S')
        query_resumos = """
            SELECT res.semana as "Semana ISO", res.usuario_id,
                   res.qtd_vermelho as "Total Vermelho (Semana)",
                   res.qtd_laranja as "Total Laranja (Semana)",
                   res.observacao_geral_semana as "Observação Geral (Semana)"
            FROM resumo res;
        """
        df_resumos = pd.read_sql_query(query_resumos, conn_script)
        if not df_resumos.empty:
            df_final = pd.merge(df_registros, df_resumos, on=['Semana ISO', 'usuario_id'], how='left')
        else:
            df_final = df_registros.copy()
            resumo_cols_a_adicionar = ["Total Vermelho (Semana)", "Total Laranja (Semana)", "Observação Geral (Semana)"]
            for col in resumo_cols_a_adicionar:
                if col not in df_final.columns:
                    df_final[col] = pd.NA
        colunas_finais_desejadas = [
            "Data do Registo", "Semana ISO", "Nome do Utilizador", "Cargo do Utilizador",
            "Facto Observável", "Dia da Semana (Registo)", "Valor Registado",
            "Zona de Alerta (Registo)", "Descrição do Dia (Registo)",
            "Total Vermelho (Semana)", "Total Laranja (Semana)", "Observação Geral (Semana)"
        ]
        colunas_para_exportar = [col for col in colunas_finais_desejadas if col in df_final.columns]
        df_final_exportar = df_final[colunas_para_exportar]
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df_final_exportar.to_excel(writer, index=False, sheet_name='Relatorio_Diario_Gemba')
        output.seek(0) 
        file_bytes_for_telegram = output.getvalue()
        excel_filename = f"relatorio_diario_gemba_{datetime.now().strftime('%Y%m%d')}.xlsx"
        caption_text = f"Relatório Diário Gemba - {datetime.now().strftime('%d/%m/%Y')}"
        if send_telegram_document(file_bytes_for_telegram, excel_filename, caption_text):
            logging.info(f"Relatório diário '{excel_filename}' enviado para o Telegram com sucesso.")
        else:
            logging.error(f"Falha ao enviar o relatório diário '{excel_filename}' para o Telegram.")
    except sqlite3.Error as e_sql:
        log_exception(e_sql, "generate_and_send_daily_report_telegram - Erro BD")
    except Exception as e:
        log_exception(e, "generate_and_send_daily_report_telegram - Erro Geral")
    finally:
        if conn_script:
            conn_script.close()
        logging.info("Finalizada tentativa de geração de relatório diário para Telegram.")

if __name__ == "__main__":
    app.run(debug=True, port=5001)
