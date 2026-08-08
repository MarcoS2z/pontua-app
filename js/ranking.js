/**
 * Lógica da Tela de Ranking & Hall da Fama
 */

document.addEventListener('DOMContentLoaded', () => {
  const currentUser = Auth.requireAuth();
  if (!currentUser) return;

  Auth.renderHeaderAndNav('ranking');
  renderCurrentRanking();

  // Tabs Toggle (Ranking Atual vs Hall da Fama)
  const tabCurrent = document.getElementById('tab-current');
  const tabHof = document.getElementById('tab-hof');

  tabCurrent?.addEventListener('click', () => {
    tabCurrent.classList.add('active');
    tabHof.classList.remove('active');
    document.getElementById('ranking-current-section').style.display = 'block';
    document.getElementById('ranking-hof-section').style.display = 'none';
  });

  tabHof?.addEventListener('click', () => {
    tabHof.classList.add('active');
    tabCurrent.classList.remove('active');
    document.getElementById('ranking-current-section').style.display = 'none';
    document.getElementById('ranking-hof-section').style.display = 'block';
    renderHallOfFame();
  });
});

// Renderiza o Ranking Atual (baseado em número de notas doadas no ciclo)
function renderCurrentRanking() {
  const users = Storage.getUsers();
  const currentUser = Storage.getCurrentUser();

  // Ordena por quantidade de notas doadas (descendente)
  const sortedUsers = [...users].sort((a, b) => (b.totalNotes || 0) - (a.totalNotes || 0));

  const top3 = sortedUsers.slice(0, 3);
  const top4to10 = sortedUsers.slice(3, 10);

  // Renderiza Posição Atual do Usuário Logado
  const myRankIndex = sortedUsers.findIndex(u => u.id === currentUser.id);
  const myRank = myRankIndex !== -1 ? myRankIndex + 1 : sortedUsers.length + 1;
  const myTotalNotes = currentUser.totalNotes || 0;

  const myPositionContainer = document.getElementById('my-ranking-position-container');
  if (myPositionContainer) {
    const isTop3 = myRank <= 3;
    const badgeIcon = myRank === 1 ? '<i class="fa-solid fa-crown text-gold"></i>' : myRank === 2 ? '<i class="fa-solid fa-medal" style="color: #c0c0c0;"></i>' : myRank === 3 ? '<i class="fa-solid fa-medal" style="color: #cd7f32;"></i>' : '<i class="fa-solid fa-location-dot text-primary"></i>';

    myPositionContainer.innerHTML = `
      <div class="card" style="padding: 16px 20px; border-color: var(--primary-light); background: linear-gradient(135deg, rgba(26, 115, 232, 0.15), var(--surface-2)); display: flex; align-items: center; justify-content: space-between; gap: 16px;">
        <div style="display: flex; align-items: center; gap: 14px;">
          <div style="font-size: 1.8rem;">${badgeIcon}</div>
          <div>
            <h4 style="font-size: 1.05rem; font-weight: 900; color: var(--text);">Sua Posição no Ranking: <span style="color: var(--gold);">#${myRank}º Lugar</span></h4>
            <p style="font-size: 0.85rem; color: var(--text-muted);">${isTop3 ? 'Parabéns! Você está no Pódio do ciclo atual! <i class="fa-solid fa-sparkles text-gold"></i>' : 'Doe mais notas fiscais para subir de posição e chegar ao pódio!'}</p>
          </div>
        </div>
        <div style="text-align: right; white-space: nowrap;">
          <span style="font-size: 1.1rem; font-weight: 900; color: var(--accent-light);"><i class="fa-solid fa-receipt text-accent" style="margin-right: 4px;"></i> ${myTotalNotes} notas</span>
        </div>
      </div>
    `;
  }

  // Renderiza Pódio (Top 3)
  const podiumContainer = document.getElementById('podium-container');
  if (podiumContainer) {
    podiumContainer.innerHTML = top3.map((user, idx) => {
      const rank = idx + 1;
      const medals = ['<i class="fa-solid fa-crown text-gold"></i>', '<i class="fa-solid fa-medal" style="color: #c0c0c0;"></i>', '<i class="fa-solid fa-medal" style="color: #cd7f32;"></i>'];
      const initials = user.name
        .split(' ')
        .filter(n => n.length > 0)
        .slice(0, 2)
        .map(n => n[0].toUpperCase())
        .join('');

      return `
        <div class="podium-card rank-${rank}">
          <div class="podium-badge">${medals[idx]}</div>
          <div class="podium-avatar">${initials}</div>
          <div class="podium-name">${user.name}</div>
          <div class="podium-notes"><i class="fa-solid fa-receipt text-accent" style="margin-right: 4px;"></i> ${user.totalNotes || 0} notas</div>
        </div>
      `;
    }).join('');
  }

  // Renderiza Lista (Top 4 a 10)
  const listContainer = document.getElementById('ranking-list-container');
  if (listContainer) {
    if (top4to10.length === 0 && top3.length > 0) {
      listContainer.innerHTML = `
        <p style="text-align: center; color: var(--text-muted); padding: 20px;">
          Nenhum outro participante no ranking ainda.
        </p>
      `;
    } else {
      listContainer.innerHTML = top4to10.map((user, idx) => {
        const rank = idx + 4;
        const isMe = user.id === currentUser.id;
        const initials = user.name
          .split(' ')
          .filter(n => n.length > 0)
          .slice(0, 2)
          .map(n => n[0].toUpperCase())
          .join('');

        return `
          <div class="ranking-item ${isMe ? 'is-me' : ''}">
            <div class="ranking-left">
              <div class="rank-number">#${rank}</div>
              <div class="user-avatar" style="width:36px; height:36px; font-size:0.9rem;">${initials}</div>
              <div>
                <strong style="color: var(--text);">${user.name} ${isMe ? ' (Você)' : ''}</strong>
              </div>
            </div>
            <div style="font-weight: 800; color: var(--accent-light);">
              🧾 ${user.totalNotes || 0} notas
            </div>
          </div>
        `;
      }).join('');
    }
  }
}

// Renderiza os snaps históricos do Hall da Fama (Ciclos encerrados)
function renderHallOfFame() {
  const container = document.getElementById('hof-list-container');
  if (!container) return;

  const hof = Storage.getHallOfFame();

  if (hof.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; color: var(--text-muted); padding: 40px;">
        <span style="font-size: 3rem; display: block; margin-bottom: 8px;">🏛️</span>
        <p>Nenhum ciclo de pontos encerrado até o momento.</p>
        <p style="font-size: 0.85rem;">O Hall da Fama será alimentado automaticamente a cada encerramento de trimestre.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = hof.map(snapshot => {
    return `
      <div class="hof-card">
        <div class="hof-header">
          <h3 style="color: var(--gold); display: flex; align-items: center; gap: 8px;">
            <span>🏆</span> ${snapshot.period}
          </h3>
          <span style="font-size: 0.85rem; color: var(--text-muted);">Encerrado em: ${snapshot.resetDate}</span>
        </div>
        <div style="display: flex; flex-direction: column; gap: 10px;">
          ${snapshot.top3.map(winner => `
            <div style="display: flex; align-items: center; justify-content: space-between; background-color: var(--surface-2); padding: 12px 16px; border-radius: var(--radius-md);">
              <span>
                <strong>#${winner.rank} ${winner.rank === 1 ? '🥇' : winner.rank === 2 ? '🥈' : '🥉'}</strong>
                ${winner.name}
              </span>
              <span style="color: var(--accent-light); font-weight: 800;">
                ${winner.totalNotes} notas doadas
              </span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }).join('');
}
