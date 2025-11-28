🤖 WhatsApp Web com Gemini AI

Um aplicativo web moderno de mensagens integrado com a API do Google Gemini, construído com Flask e interface inspirada no WhatsApp Web.

https://img.shields.io/badge/Python-3.8+-blue.svg
https://img.shields.io/badge/Flask-2.3.3-green.svg
https://img.shields.io/badge/Gemini-AI-purple.svg

✨ Características

· 💬 Interface moderna inspirada no WhatsApp Web
· 🤖 Integração com Gemini AI para respostas inteligentes
· 📱 Design responsivo para desktop e mobile
· 🔄 Atualizações em tempo real com polling inteligente
· 💾 Armazenamento persistente em JSON
· 🎨 UI/UX intuitiva com feedback visual
· ⚡ Script automation para envio em lote
· 🔧 API RESTful completa

🚀 Demonstração

https://via.placeholder.com/800x400/075E54/FFFFFF?text=WhatsApp+Gemini+AI+Interface
Interface moderna com integração de IA

🛠️ Tecnologias Utilizadas

Backend

· Python 3.8+ - Linguagem principal
· Flask - Framework web
· Flask-CORS - Habilitar CORS
· Requests - Requisições HTTP
· python-dotenv - Gerenciamento de variáveis de ambiente

Frontend

· HTML5 - Estrutura semântica
· CSS3 - Estilos modernos com variáveis CSS
· JavaScript ES6+ - Interatividade e lógica
· Grid & Flexbox - Layout responsivo

IA e APIs

· Google Gemini API - Modelo de linguagem generativa
· REST API - Comunicação backend-frontend

📋 Pré-requisitos

· Python 3.8 ou superior
· Chave de API do Google Gemini
· Navegador web moderno

⚙️ Instalação

1. Clonar o repositório

```bash
git clone https://github.com/seu-usuario/whatsapp-gemini.git
cd whatsapp-gemini
```

2. Criar ambiente virtual (recomendado)

```bash
python -m venv venv
source venv/bin/activate  # Linux/Mac
# ou
venv\Scripts\activate     # Windows
```

3. Instalar dependências

```bash
pip install -r requirements.txt
```

4. Configurar variáveis de ambiente

```bash
cp .env.example .env
```

Edite o arquivo .env e adicione sua chave da API Gemini:

```env
GEMINI_API_KEY=sua_chave_api_gemini_aqui
FLASK_ENV=development
```

5. Obter chave da API Gemini

1. Acesse Google AI Studio
2. Crie uma nova chave de API
3. Copie e cole no arquivo .env

🎯 Como Usar

Executar a aplicação

```bash
python app.py
```

Acessar a aplicação

Abra seu navegador e visite: http://localhost:5000

Funcionalidades principais

💬 Envio de mensagens

· Digite no editor de texto
· Clique em "Enviar" ou use Ctrl+Enter
· Mensagens são salvas automaticamente

🤖 Ativar Gemini AI

· Clique no botão "Gemini AI" para ativar/desativar
· Respostas automáticas do Gemini para suas mensagens
· Indicador visual de status

🗂️ Gerenciar conversas

· Nova Conversa: Crie novas conversas
· Buscar: Filtre conversas por nome
· Limpar: Remova mensagens ou conversas inteiras

⚡ Script Automation

· Use o botão "Executar Script" para envio em lote
· Configure delays entre mensagens
· Ideal para testes e demonstrações

📁 Estrutura do Projeto

```
whatsapp-gemini/
├── app.py                 # Aplicação Flask principal
├── requirements.txt       # Dependências do Python
├── .env                  # Variáveis de ambiente
├── whatsapp_data.json    # Dados das conversas (gerado automaticamente)
├── templates/
│   └── index.html        # Template principal
└── static/
    ├── css/
    │   └── style.css     # Estilos CSS
    └── js/
        └── app.js        # Lógica JavaScript do frontend
```

🔌 API Endpoints

Conversas

· GET /api/conversations - Listar todas as conversas
· POST /api/conversations - Criar nova conversa
· GET /api/conversations/<id> - Obter conversa específica
· DELETE /api/conversations/<id> - Deletar conversa

Mensagens

· GET /api/conversations/<id>/messages - Listar mensagens
· POST /api/conversations/<id>/messages - Enviar mensagem
· DELETE /api/conversations/<id>/messages - Limpar mensagens

Gemini AI

· POST /api/gemini/toggle - Ativar/desativar Gemini
· GET /api/gemini/status - Status do Gemini
· POST /api/gemini/generate - Gerar resposta

Sistema

· GET /api/state - Estado completo da aplicação
· POST /api/bot - Bot simulado (legado)

🎨 Personalização

Cores e temas

Modifique as variáveis CSS no arquivo static/css/style.css:

```css
:root {
    --bg: #e9edef;
    --accent: #25D366;
    --mine: #DCF8C6;
    --their: #ffffff;
    --gemini: #8B5CF6;
    /* Adicione suas cores aqui */
}
```

Configurações de polling

No arquivo static/js/app.js:

```javascript
const POLLING_INTERVAL = 5000;        // 5 segundos (ativo)
const IDLE_POLLING_INTERVAL = 10000;  // 10 segundos (inativo)
```

🐛 Solução de Problemas

Erro 404 nos arquivos estáticos

```bash
# Verificar estrutura de pastas
find . -name "*.js" -o -name "*.css" | sort

# Recriar estrutura se necessário
mkdir -p static/css static/js templates
```

Gemini AI não responde

· Verifique se a chave da API está correta no .env
· Confirme a conexão com a internet
· Verifique os logs no console do navegador

Mensagens não são salvas

· Verifique permissões de escrita no diretório
· Confirme se o arquivo whatsapp_data.json existe

🤝 Contribuindo

Contribuições são bem-vindas! Siga estos passos:

1. Fork o projeto
2. Crie uma branch para sua feature (git checkout -b feature/AmazingFeature)
3. Commit suas mudanças (git commit -m 'Add some AmazingFeature')
4. Push para a branch (git push origin feature/AmazingFeature)
5. Abra um Pull Request

Áreas para contribuição

· Novos temas e personalizações
· Melhorias de performance
· Novas funcionalidades de IA
· Testes automatizados
· Documentação

📝 Licença

Este projeto está sob a licença MIT. Veja o arquivo LICENSE para detalhes.

👨‍💻 Desenvolvido por

Dione Castro Alves

· Website: https://innovaideia-github-io.vercel.app
· GitHub: @innovaideia
· LinkedIn: Dione Castro Alves

🙏 Agradecimentos

· Google por fornecer a API Gemini
· Comunidade Flask pela excelente documentação
· Equipe do WhatsApp pela inspiração no design

📞 Suporte

Encontrou um problema ou tem uma sugestão?

1. Verifique os Issues existentes
2. Crie um novo Issue com detalhes do problema
3. Para contato direto: innovaideia2023@gmail.com

---

⭐ Se este projeto foi útil, considere dar uma estrela no GitHub!

---

<div align="center">

🚀 Transformando ideias em código, uma linha de cada vez.

</div>
