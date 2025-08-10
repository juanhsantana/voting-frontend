class VotingApp {
  constructor() {
    this.API_BASE_URL = 'http://localhost:3003/api';
    this.votingContainer = document.querySelector('.content-items');
    this.statsContainer = document.querySelector('.voting-stats .counter');
    this.addForm = document.getElementById('addItemForm');
    this.modal = document.getElementById('modal');
    this.openModalBtn = document.getElementById('openModal');
    this.closeModalBtn = document.querySelector('.close');

    this.init();
  }

  async init() {
    await this.loadItems();
    await this.loadStats();
    this.bindFormEvents();
    this.bindModalEvents();
  }

  async apiRequest(endpoint, method = 'GET', body = null, isFormData = false) {
    const headers = {};

    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }

    const options = { method, headers };

    if (body) {
      options.body = isFormData ? body : JSON.stringify(body);
    }

    const response = await fetch(`${this.API_BASE_URL}${endpoint}`, options);
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    return await response.json();
  }

  async loadItems() {
    try {
      const items = await this.apiRequest('/items');
      this.renderItems(items);
    } catch (error) {
      console.error('Erro ao carregar itens:', error);
    }
  }

  async loadStats() {
    try {
      const stats = await this.apiRequest('/stats');
      this.renderStats(stats);
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  }

  getImageUrl(item) {
    if (item.imagem) {
      if (item.imagem.startsWith('http')) {
        return item.imagem;
      }
      return `http://localhost:3003${item.imagem}`;
    }
    return './assets/placeholder.jpg';
  }

  renderItems(items) {
    this.votingContainer.innerHTML = '';

    if (items.length === 0) {
      this.votingContainer.innerHTML = `
        <div class="empty-state">
          <p>Nenhum filme ou série cadastrado ainda.</p>
          <p>Seja o primeiro a adicionar um!</p>
        </div>
      `;
      return;
    }

    items.forEach(item => {
      const id = item.id || item._id;
      const imageUrl = this.getImageUrl(item);

      const article = document.createElement('article');
      article.className = 'content-item';
      article.setAttribute('data-item-id', id);

      article.innerHTML = `
        <div class="content-section">
          <div class="image-container">
            <img
              src="${imageUrl}"
              alt="Capa de ${item.titulo}"
              class="content-image"
              loading="lazy"
              onerror="this.src='./assets/placeholder.jpg'"
            />
          </div>

          <div class="content-description">
            <header class="content-header">
              <h3 class="content-title">${item.titulo}</h3>
              <span class="content-category">${item.genero}</span>
            </header>

            <p class="content-synopsis">
              ${item.descricao || 'Sem descrição disponível.'}
            </p>

            <div class="voting-actions">
              <button
                class="btn-like"
                type="button"
                data-item-id="${id}"
                data-vote-type="like"
                aria-label="Votar que gostou de ${item.titulo}"
              >
                <span class="vote-icon">👍</span>
                <span class="vote-text">Gostei</span>
                <span class="vote-count">(${item.gostei})</span>
              </button>

              <button
                class="btn-notlike"
                type="button"
                data-item-id="${id}"
                data-vote-type="dislike"
                aria-label="Votar que não gostou de ${item.titulo}"
              >
                <span class="vote-icon">👎</span>
                <span class="vote-text">Não gostei</span>
                <span class="vote-count">(${item.naoGostei})</span>
              </button>
            </div>
          </div>
        </div>
      `;

      this.votingContainer.appendChild(article);
    });

    this.bindVoteButtons();
  }

  renderStats(stats) {
    if (this.statsContainer) {
      const positiveCounter = this.statsContainer.querySelector('.counter-positive .counter-number');
      const negativeCounter = this.statsContainer.querySelector('.counter-negative .counter-number');
      
      if (positiveCounter) {
        positiveCounter.textContent = stats.totalGostei || 0;
      }
      if (negativeCounter) {
        negativeCounter.textContent = stats.totalNaoGostei || 0;
      }
    }
  }

  bindVoteButtons() {
    const voteButtons = document.querySelectorAll('[data-vote-type]');
    voteButtons.forEach(button => {
      button.addEventListener('click', async (event) => {
        const itemId = event.target.closest('button').getAttribute('data-item-id');
        const voteType = event.target.closest('button').getAttribute('data-vote-type');

        await this.handleVote(itemId, voteType, event.target.closest('button'));
      });
    });
  }

  async handleVote(itemId, voteType, button) {
    try {
      button.disabled = true;
      const originalText = button.innerHTML;
      button.innerHTML = '⏳ Votando...';

      await this.apiRequest(`/items/${itemId}/vote`, 'POST', { type: voteType });
      await this.loadItems();
      await this.loadStats();
    } catch (error) {
      console.error('Erro ao registrar voto:', error);
      button.innerHTML = originalText;
    } finally {
      button.disabled = false;
    }
  }

  bindFormEvents() {
    if (this.addForm) {
      this.addForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const formData = new FormData(this.addForm);
        
        const apiFormData = new FormData();
        apiFormData.append('titulo', formData.get('name'));
        apiFormData.append('genero', formData.get('category'));
        apiFormData.append('descricao', formData.get('description') || '');
        
        const coverFile = formData.get('cover');
        if (coverFile && coverFile.size > 0) {
          apiFormData.append('imagem', coverFile);
        }

        await this.addItem(apiFormData);
      });
    }
  }

  bindModalEvents() {
    if (this.openModalBtn) {
      this.openModalBtn.addEventListener('click', () => {
        this.modal.style.display = 'block';
        this.modal.setAttribute('aria-hidden', 'false');
      });
    }

    if (this.closeModalBtn) {
      this.closeModalBtn.addEventListener('click', () => {
        this.closeModal();
      });
    }

    if (this.modal) {
      this.modal.addEventListener('click', (e) => {
        if (e.target === this.modal) {
          this.closeModal();
        }
      });
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modal.style.display === 'block') {
        this.closeModal();
      }
    });
  }

  closeModal() {
    this.modal.style.display = 'none';
    this.modal.setAttribute('aria-hidden', 'true');
    this.addForm.reset();
  }

  async addItem(formData) {
    try {
      await this.apiRequest('/items', 'POST', formData, true);
      this.closeModal();
      await this.loadItems();
      await this.loadStats();
      this.showNotification('Item adicionado com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao adicionar item:', error);
      this.showNotification('Erro ao adicionar item', 'error');
    }
  }

  showNotification(message, type = 'info') {
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(n => n.remove());

    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      border-radius: 4px;
      color: white;
      font-weight: bold;
      z-index: 10000;
      background-color: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.remove();
    }, 3000);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new VotingApp();
});

