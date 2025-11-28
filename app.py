from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import json
import os
import requests
from datetime import datetime
import uuid
from dotenv import load_dotenv
import threading

# Carregar variáveis de ambiente
load_dotenv('.env')

app = Flask(__name__)
CORS(app)

# Configurações
DATA_FILE = 'whatsapp_data.json'
API_KEY = os.getenv('GEMINI_API_KEY')
GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"

class WhatsAppManager:
    def __init__(self, data_file):
        self.data_file = data_file
    
    def load_data(self):
        """Carrega os dados do arquivo JSON com valores padrão"""
        default_data = {
            "conversations": {},
            "currentConvId": "conv-default",
            "simulateBot": False,
            "geminiEnabled": False
        }
        
        if os.path.exists(self.data_file):
            try:
                with open(self.data_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    # Garantir que todas as chaves existam
                    for key, value in default_data.items():
                        if key not in data:
                            data[key] = value
                    return data
            except (json.JSONDecodeError, KeyError):
                # Se o arquivo estiver corrompido, recriar
                return default_data.copy()
        return default_data.copy()
    
    def save_data(self, data):
        """Salva os dados no arquivo JSON"""
        try:
            with open(self.data_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            return True
        except Exception as e:
            print(f"Erro ao salvar dados: {e}")
            return False
    
    def init_default_data(self):
        """Inicializa dados padrão se não existirem"""
        data = self.load_data()
        
        # Garantir que a conversa padrão existe
        if "conv-default" not in data["conversations"]:
            data["conversations"]["conv-default"] = {
                "id": "conv-default",
                "name": "Conversa com Gemini AI",
                "messages": [
                    {
                        "id": str(uuid.uuid4()),
                        "who": "their",
                        "text": "Olá! Sou o Gemini AI. Como posso ajudá-lo hoje?",
                        "ts": datetime.now().isoformat(),
                        "status": "delivered"
                    }
                ]
            }
        
        # Garantir valores padrão
        data["currentConvId"] = data.get("currentConvId", "conv-default")
        data["simulateBot"] = data.get("simulateBot", False)
        data["geminiEnabled"] = data.get("geminiEnabled", True)
        
        self.save_data(data)
        return data

class GeminiAIManager:
    def __init__(self, api_key, base_url):
        self.api_key = api_key
        self.base_url = base_url
    
    def generate_response(self, prompt, conversation_context=None):
        """Gera resposta usando a API Gemini"""
        if not self.api_key:
            return {"error": "API key não configurada"}
        
        try:
            # Preparar contexto da conversa
            context_parts = []
            if conversation_context:
                for msg in conversation_context[-6:]:
                    role = "user" if msg["who"] == "mine" else "model"
                    context_parts.append(f"{role}: {msg['text']}")
            
            full_prompt = "\n".join(context_parts + [f"user: {prompt}"]) if context_parts else prompt
            
            headers = {
                'Content-Type': 'application/json',
                'x-goog-api-key': self.api_key
            }
            
            payload = {
                "contents": [{
                    "parts": [{
                        "text": full_prompt
                    }]
                }],
                "generationConfig": {
                    "temperature": 0.7,
                    "topK": 40,
                    "topP": 0.95,
                    "maxOutputTokens": 1024,
                }
            }
            
            response = requests.post(self.base_url, json=payload, headers=headers, timeout=30)
            response.raise_for_status()
            result = response.json()
            
            if 'candidates' in result and len(result['candidates']) > 0:
                text = result['candidates'][0]['content']['parts'][0]['text']
                return {
                    "response": text,
                    "status": "success"
                }
            else:
                return {"error": "Nenhuma resposta do Gemini"}
                
        except requests.exceptions.RequestException as e:
            return {"error": f"Erro de conexão: {str(e)}"}
        except Exception as e:
            return {"error": f"Erro na API Gemini: {str(e)}"}

# Inicializar gerenciadores
whatsapp_mgr = WhatsAppManager(DATA_FILE)
gemini_mgr = GeminiAIManager(API_KEY, GEMINI_URL)

def generate_gemini_reply(conversation_id, user_message, context_messages):
    """Função para gerar resposta do Gemini em background"""
    with app.app_context():
        try:
            gemini_response = gemini_mgr.generate_response(user_message, context_messages)
            
            if gemini_response.get("status") == "success":
                reply_message = {
                    "id": str(uuid.uuid4()),
                    "who": "their",
                    "text": gemini_response["response"],
                    "ts": datetime.now().isoformat(),
                    "status": "delivered"
                }
                
                # Atualizar dados e salvar
                data = whatsapp_mgr.load_data()
                if conversation_id in data["conversations"]:
                    data["conversations"][conversation_id]["messages"].append(reply_message)
                    whatsapp_mgr.save_data(data)
        except Exception as e:
            print(f"Erro ao gerar resposta Gemini: {e}")

# Rotas da API
@app.route('/api/conversations', methods=['GET'])
def get_conversations():
    """Retorna todas as conversas"""
    try:
        data = whatsapp_mgr.load_data()
        return jsonify(data["conversations"])
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/conversations/<conversation_id>', methods=['GET'])
def get_conversation(conversation_id):
    """Retorna uma conversa específica"""
    try:
        data = whatsapp_mgr.load_data()
        conversation = data["conversations"].get(conversation_id)
        if conversation:
            return jsonify(conversation)
        return jsonify({"error": "Conversa não encontrada"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/conversations', methods=['POST'])
def create_conversation():
    """Cria uma nova conversa"""
    try:
        data = whatsapp_mgr.load_data()
        new_conv = request.json
        
        if not new_conv or not new_conv.get("name"):
            return jsonify({"error": "Nome da conversa é obrigatório"}), 400
        
        conv_id = f"conv-{uuid.uuid4()}"
        conversation = {
            "id": conv_id,
            "name": new_conv["name"],
            "messages": []
        }
        
        data["conversations"][conv_id] = conversation
        if whatsapp_mgr.save_data(data):
            return jsonify(conversation), 201
        else:
            return jsonify({"error": "Erro ao salvar conversa"}), 500
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/conversations/<conversation_id>/messages', methods=['POST'])
def add_message(conversation_id):
    """Adiciona uma mensagem a uma conversa"""
    try:
        data = whatsapp_mgr.load_data()
        
        if conversation_id not in data["conversations"]:
            return jsonify({"error": "Conversa não encontrada"}), 404
        
        message_data = request.json
        if not message_data:
            return jsonify({"error": "Dados da mensagem são obrigatórios"}), 400
        
        required_fields = ["who", "text"]
        for field in required_fields:
            if field not in message_data:
                return jsonify({"error": f"Campo '{field}' é obrigatório"}), 400
        
        message = {
            "id": str(uuid.uuid4()),
            "who": message_data["who"],
            "text": message_data["text"],
            "ts": datetime.now().isoformat(),
            "status": message_data.get("status", "sent")
        }
        
        data["conversations"][conversation_id]["messages"].append(message)
        
        # Salvar primeiro a mensagem do usuário
        if whatsapp_mgr.save_data(data):
            # Resposta automática do Gemini se estiver ativado
            if (message_data["who"] == "mine" and 
                data.get("geminiEnabled", False)):
                
                # Obter contexto para o Gemini
                conversation = data["conversations"][conversation_id]
                context_messages = conversation["messages"][-5:]
                
                # Gerar resposta em background com delay
                timer = threading.Timer(2.0, generate_gemini_reply, 
                                      [conversation_id, message_data["text"], context_messages])
                timer.start()
            
            return jsonify(message), 201
        else:
            return jsonify({"error": "Erro ao salvar mensagem"}), 500
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/conversations/<conversation_id>/messages', methods=['GET'])
def get_messages(conversation_id):
    """Retorna todas as mensagens de uma conversa"""
    try:
        data = whatsapp_mgr.load_data()
        
        if conversation_id not in data["conversations"]:
            return jsonify({"error": "Conversa não encontrada"}), 404
        
        return jsonify(data["conversations"][conversation_id]["messages"])
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/conversations/<conversation_id>', methods=['DELETE'])
def delete_conversation(conversation_id):
    """Remove uma conversa"""
    try:
        data = whatsapp_mgr.load_data()
        
        if conversation_id not in data["conversations"]:
            return jsonify({"error": "Conversa não encontrada"}), 404
        
        if conversation_id == "conv-default":
            return jsonify({"error": "Não é possível deletar a conversa padrão"}), 400
        
        del data["conversations"][conversation_id]
        
        if data["currentConvId"] == conversation_id:
            data["currentConvId"] = "conv-default"
        
        if whatsapp_mgr.save_data(data):
            return jsonify({"message": "Conversa deletada com sucesso"})
        else:
            return jsonify({"error": "Erro ao salvar alterações"}), 500
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/conversations/<conversation_id>/messages', methods=['DELETE'])
def clear_messages(conversation_id):
    """Limpa todas as mensagens de uma conversa"""
    try:
        data = whatsapp_mgr.load_data()
        
        if conversation_id not in data["conversations"]:
            return jsonify({"error": "Conversa não encontrada"}), 404
        
        data["conversations"][conversation_id]["messages"] = []
        
        if whatsapp_mgr.save_data(data):
            return jsonify({"message": "Mensagens limpas com sucesso"})
        else:
            return jsonify({"error": "Erro ao salvar alterações"}), 500
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/state', methods=['GET'])
def get_state():
    """Retorna o estado completo da aplicação"""
    try:
        data = whatsapp_mgr.load_data()
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/bot', methods=['POST'])
def toggle_bot():
    """Ativa/desativa o bot simulado (legado)"""
    try:
        data = whatsapp_mgr.load_data()
        data["simulateBot"] = not data.get("simulateBot", False)
        
        if whatsapp_mgr.save_data(data):
            return jsonify({"simulateBot": data["simulateBot"]})
        else:
            return jsonify({"error": "Erro ao salvar configuração"}), 500
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/gemini/toggle', methods=['POST'])
def toggle_gemini():
    """Ativa/desativa o Gemini AI"""
    try:
        data = whatsapp_mgr.load_data()
        current_state = data.get("geminiEnabled", False)
        data["geminiEnabled"] = not current_state
        
        if whatsapp_mgr.save_data(data):
            return jsonify({
                "geminiEnabled": data["geminiEnabled"],
                "message": f"Gemini AI {'ativado' if data['geminiEnabled'] else 'desativado'}"
            })
        else:
            return jsonify({"error": "Erro ao salvar configuração"}), 500
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/gemini/generate', methods=['POST'])
def generate_with_gemini():
    """Gera resposta usando Gemini API"""
    try:
        data = request.get_json()
        if not data or 'prompt' not in data:
            return jsonify({'error': 'Prompt é obrigatório'}), 400
        
        conversation_context = data.get('context', [])
        gemini_response = gemini_mgr.generate_response(data['prompt'], conversation_context)
        
        if gemini_response.get('status') == 'success':
            return jsonify(gemini_response)
        else:
            return jsonify({'error': gemini_response.get('error', 'Erro desconhecido')}), 500
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/gemini/status', methods=['GET'])
def get_gemini_status():
    """Retorna o status do Gemini AI"""
    try:
        data = whatsapp_mgr.load_data()
        return jsonify({
            "geminiEnabled": data.get("geminiEnabled", False),
            "apiConfigured": bool(API_KEY)
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Servir o frontend
@app.route('/')
def serve_frontend():
    return render_template('index.html')

# Servir arquivos estáticos
@app.route('/static/<path:path>')
def serve_static(path):
    return app.send_static_file(path)

@app.errorhandler(404)
def not_found(error):
    return jsonify({"error": "Endpoint não encontrado"}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({"error": "Erro interno do servidor"}), 500

if __name__ == '__main__':
    whatsapp_mgr.init_default_data()
    print("🤖 WhatsApp Web com Gemini AI inicializado!")
    print("📱 Acesse: http://localhost:5000")
    print("🔧 Gemini AI:", "Configurado" if API_KEY else "Não configurado")
    app.run(debug=True, host='0.0.0.0', port=5000)