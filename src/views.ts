import { course } from './course'
import { activeProfile, dayKey, heartPrice, isComplete, lessons, maxHearts, nextHeart, nextLesson, streak, study } from './study'

const drawings = {
  learn: '<path d="M4 19.5V5a2 2 0 0 1 2-2h14v17H6a2 2 0 0 0 0 4h14M4 19.5a2 2 0 0 1 2-2h14" transform="translate(0 -1) scale(1 .92)"/><path d="M8 7h8m-8 4h5"/>',
  practice: '<path d="M20 7v5h-5M4 17v-5h5"/><path d="M5.5 8a7.5 7.5 0 0 1 12.4-1.3L20 9M4 15l2.1 2.3A7.5 7.5 0 0 0 18.5 16"/>',
  progress: '<path d="M4 20V5m0 15h16M8 16v-4m4 4V8m4 8V4"/>',
  settings: '<path d="M4 7h5m4 0h7M4 17h9m4 0h3"/><circle cx="11" cy="7" r="2"/><circle cx="15" cy="17" r="2"/>',
  arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
  chevron: '<path d="m9 6 6 6-6 6"/>',
  heart: '<path d="M20.8 8.7c0 4.8-8.8 9.5-8.8 9.5S3.2 13.5 3.2 8.7A4.2 4.2 0 0 1 12 7.4a4.2 4.2 0 0 1 8.8 1.3Z"/>',
  fire: '<path d="M12 22a6.5 6.5 0 0 0 6.5-6.5c0-3.6-2.3-6-4-7.4.2 2.9-1.4 3.4-1.4 3.4C13.8 6.6 11 4.3 9 2.4c.5 3.9-1 5.2-2.5 7.1-1.1 1.3-2 3.2-2 5.8A7.5 7.5 0 0 0 12 22Z"/><path d="M12 22c-1.7 0-3-1.6-3-3.2 0-1.5 1.1-2.4 2.5-3.8 0 1 .5 1.4.9 1.6 1.8.9 2.6 1.4 2.6 2.5 0 1.6-1.3 2.9-3 2.9Z"/>',
  bolt: '<path d="m13 2-8 12h6l-1 8 9-12h-6l1-8Z"/>',
  flag: '<path d="M5 22V4m0 1c5-5 8 4 14-1v11c-6 5-9-4-14 1"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  play: '<path d="m9 5 11 7-11 7z"/>',
  audio: '<path d="M3 9h4l5-4v14l-5-4H3zm13 0a4 4 0 0 1 0 6m2-8a7 7 0 0 1 0 10"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  edit: '<path d="m4 20 4-1L20 7l-3-3L5 16l-1 4Zm11-14 3 3"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  download: '<path d="M12 3v12m-4-4 4 4 4-4M4 16v4h16v-4"/>',
  sparkle: '<path d="M12 2a10 10 0 0 0 10 10 10 10 0 0 0-10 10A10 10 0 0 0 2 12 10 10 0 0 0 12 2Z"/>',
} as const

export function icon(name: keyof typeof drawings, klass = '') {
  return `<svg class="icon ${klass}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${drawings[name]}</svg>`
}

export function escape(value: string) {
  return value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] ?? character)
}

export const crew = [
  { id: 'pip', name: 'Pip', role: 'O guia da estação', detail: 'Pip guarda no cachecol a primeira palavra que aprendeu fora de casa.', goal: 0 },
  { id: 'dot', name: 'Dot', role: 'A ouvinte', detail: 'Dot ouve um hello do outro lado da plataforma.', goal: 1 },
  { id: 'moxie', name: 'Moxie', role: 'A amiga do café', detail: 'Moxie sabe o nome de quem passa para tomar café de manhã.', goal: 4 },
  { id: 'pebble', name: 'Pebble', role: 'O cartógrafo', detail: 'Pebble sabe qual rua fica bonita no fim da tarde.', goal: 8 },
  { id: 'echo', name: 'Echo', role: 'O contador de histórias', detail: 'Echo sempre volta de viagem com uma história nova.', goal: 12 },
] as const

export type Mascot = typeof crew[number]['id']

export const dailyGoal = 30
const milestones = [20, 50, 100, 250, 500, 1000]
const completedCount = () => lessons.filter(lesson => isComplete(lesson)).length
const meter = (label: string, value: number, total: number) =>
  `<progress aria-label="${label}" max="${total}" value="${Math.min(value, total)}"></progress>`
export const asset = (id: string, klass = '', alt = '') =>
  `<img class="${klass}" src="./mascots/${id}.svg" alt="${alt}" width="240" height="240" draggable="false">`

export type Page = 'learn' | 'practice' | 'progress'
const tabs = [['learn', 'Trilha'], ['practice', 'Praticar'], ['progress', 'Progresso']] as const
const numbers = new Intl.NumberFormat('pt-BR')
const weekday = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', timeZone: 'UTC' })
const unitFriends = ['pip', 'moxie', 'pebble', 'echo'] satisfies Mascot[]

export function lessonHost(lesson: string, listening: boolean): Mascot {
  if (listening) return 'dot'
  const unit = course.units.findIndex(item => item.lessons.some(entry => entry.id === lesson))
  return unitFriends[unit] ?? 'pip'
}

export function header(page: Page) {
  const profile = activeProfile()
  const days = streak(profile)
  return `<header class="top"><div class="top-inner">
    <a href="#learn" class="brand" aria-label="Blingo"><img src="./icon.svg" alt="" width="40" height="40"><span>blingo<span class="brand-dot">.</span></span></a>
    <nav class="nav" aria-label="Área de estudos">${tabs.map(([id, label]) =>
      `<a href="#${id}" ${page === id ? 'aria-current="page"' : ''}>${icon(id)}<span>${label}</span></a>`).join('')}</nav>
    <div class="top-meta">
      <a href="#progress" class="counter streak-counter" aria-label="${days} ${days === 1 ? 'dia' : 'dias'} de sequência" title="Sequência">${icon('fire')} <span>${days}</span></a>
      <button class="counter heart-counter" type="button" data-action="rewards" aria-label="${profile.hearts} corações" title="Corações">${icon('heart')} <span>${profile.hearts}</span></button>
      <button class="square settings" type="button" data-action="settings" aria-label="Configurações">${icon('settings')}</button>
    </div>
  </div></header>`
}

function sevenDays() {
  const profile = activeProfile()
  const dates = Array.from({ length: 7 }, (_, index) => dayKey(index - 6))
  return `<ol class="week">${dates.map(date => {
    const xp = profile.activity[date] ?? 0
    const name = weekday.format(new Date(date + 'T12:00:00Z')).replace('.', '')
    return `<li class="${date === dayKey() ? 'today' : ''} ${xp > 0 ? 'studied' : ''}" aria-label="${name}, ${xp} XP"><span>${name}</span><i aria-hidden="true">${xp ? icon('check') : '·'}</i></li>`
  }).join('')}</ol>`
}

function daily() {
  const today = activeProfile().activity[dayKey()] ?? 0
  return `<div class="goal"><div><span>Meta de hoje</span><strong>${Math.min(today, dailyGoal)}/${dailyGoal} XP</strong></div>${meter('Meta de hoje em XP', today, dailyGoal)}</div>`
}

function rail() {
  return `<aside class="rail" aria-label="Seu ritmo de estudo">
    <section class="rhythm"><h2>Sua semana</h2>${sevenDays()}${daily()}</section>
    <button type="button" class="crew-link" data-action="crew">${asset('dot')}<span>Personagens <small>${crew.filter(friend => completedCount() >= friend.goal).length} de ${crew.length} encontrados</small></span>${icon('chevron')}</button>
  </aside>`
}

export function learnPage() {
  const profile = activeProfile()
  const next = nextLesson(profile)
  const currentUnit = course.units.findIndex(unit => unit.lessons.some(lesson => lesson.id === next?.id))
  const count = completedCount()
  return `<div class="dashboard"><div class="column">
    <div class="page-title"><h1 tabindex="-1">Trilha de inglês</h1><span class="level-tag"><span aria-hidden="true"></span> A1 · Iniciante</span></div>
    ${!next ? '<p class="course-finished">Você concluiu a trilha. Volte a uma estação para revisar ou escolha um treino.</p>' : ''}
    ${course.units.map((unit, index) => {
      const done = unit.lessons.filter(lesson => isComplete(lesson, profile)).length
      const current = index === currentUnit || (!next && index === course.units.length - 1)
      const final = done === unit.lessons.length
      const theme = 'route-' + (index + 1)
      const status = final ? 'Concluído' : current ? `${done} de ${unit.lessons.length} lições` : 'Bloqueado'
      return `<details class="unit ${theme} ${current ? 'active-unit' : ''}" ${current ? 'open' : ''}>
        <summary class="unit-heading">
          <span class="unit-number">Trecho ${String(index + 1).padStart(2, '0')}</span>
          <strong>${unit.title}</strong>
          <span class="unit-description">${unit.description}</span>
          ${asset(unitFriends[index] ?? 'pip', 'unit-scene')}
          <span class="unit-total">${status}</span>${icon('chevron', 'unit-chevron')}
        </summary>
        <ol class="roadmap" aria-label="${unit.title}">
          ${unit.lessons.map((lesson, station) => {
            const complete = isComplete(lesson, profile)
            const open = lesson.id === next?.id
            const state = open ? 'current' : complete ? 'done' : 'locked'
            const answered = profile.completed[lesson.id]?.length ?? 0
            return `<li class="stop ${state}">
              <span class="stop-pin" aria-hidden="true">${open ? icon('play') : complete ? icon('check') : String(station + 1).padStart(2, '0')}</span>
              <div class="stop-copy"><h3>${lesson.title}</h3><p>${lesson.description}</p></div>
              ${open || complete
                ? `<button type="button" class="button ${open ? 'primary' : 'ghost'} stop-action" data-action="lesson" data-id="${lesson.id}" aria-label="${open ? answered ? 'Continuar' : 'Começar' : 'Rever'}: ${lesson.title}">${open ? answered ? 'Continuar' : 'Começar' : 'Rever'} ${icon(open ? 'arrow' : 'practice')}</button>`
                : `<span class="stop-lock" aria-label="Bloqueado" role="img">${icon('lock')}</span>`}
            </li>`
          }).join('')}
        </ol>
      </details>`
    }).join('')}
    <p class="trail-total">${count} de ${lessons.length} lições concluídas</p>
  </div>${rail()}</div>`
}

export function practicePage() {
  const profile = activeProfile()
  const waiting = profile.mistakes.length
  return `<div class="dashboard"><div class="column">
    <div class="page-title"><h1 tabindex="-1">Praticar inglês</h1></div>
    <section class="subhero"><div><h2>O que você quer treinar?</h2><p>Revisar frases ajuda a lembrar delas na hora de conversar. Cada acerto na prática recupera um coração.</p></div>${asset('dot')}</section>
    <div class="practice-list">
      <section class="practice-option"><span class="tile-icon">${icon('practice')}</span><div><h2>Revisão do dia</h2><p>Prioriza as frases que estão na hora de rever.</p></div><button type="button" class="button primary" data-action="review">Revisar ${icon('arrow')}</button></section>
      <section class="practice-option"><span class="tile-icon">${icon('audio')}</span><div><h2>Treino de ouvido</h2><p>Escute seis frases em inglês. Repita o áudio no seu ritmo.</p></div><button type="button" class="button secondary" data-action="listening">Escutar ${icon('arrow')}</button></section>
      <section class="practice-option"><span class="tile-icon">${icon('edit')}</span><div><h2>Rever erros</h2><p>${waiting ? `${waiting} ${waiting === 1 ? 'questão para tentar' : 'questões para tentar'} de novo.` : 'As questões que você errar aparecem aqui.'}</p></div><button type="button" class="button secondary" data-action="mistakes" ${waiting ? '' : 'disabled'}>Rever ${icon('arrow')}</button></section>
    </div>
  </div>${rail()}</div>`
}

export function progressPage() {
  const profile = activeProfile()
  const score = [...study.profiles].sort((a, b) => b.xp - a.xp || a.name.localeCompare(b.name, 'pt-BR'))
  const currentStreak = streak(profile)
  return `<div class="dashboard"><div class="column">
    <div class="page-title"><h1 tabindex="-1">Seu progresso</h1></div>
    <section class="subhero progress-hero"><div><h2>${escape(profile.name)}</h2><p>${completedCount()} de ${lessons.length} lições · ${numbers.format(profile.xp)} XP · ${currentStreak} ${currentStreak === 1 ? 'dia seguido' : 'dias seguidos'}</p></div>${asset('pebble')}</section>
    <section class="report"><div class="report-heading"><h2>Últimos sete dias</h2></div>${sevenDays()}${daily()}</section>
    <section class="report"><div class="report-heading"><h2>Marcos de XP</h2></div><ol class="milestones">${milestones.map(goal => `<li class="${profile.xp >= goal ? 'achieved' : ''}">${icon(profile.xp >= goal ? 'check' : 'flag')} ${numbers.format(goal)} XP</li>`).join('')}</ol></section>
    <section class="report"><div class="report-heading"><div><h2>Ranking local</h2><p>Resultados dos perfis neste dispositivo.</p></div><button type="button" class="text-button" data-action="settings">Gerenciar perfis</button></div>
      <ol class="rankings">${score.map((item, index) => `<li><span>${index + 1}</span><strong>${escape(item.name)}${item.id === profile.id ? '<small> Você</small>' : ''}</strong><span>${numbers.format(item.xp)} XP</span></li>`).join('')}</ol></section>
  </div>${rail()}</div>`
}

export function settingsContent(installAvailable: boolean, desktop: boolean) {
  const profile = activeProfile()
  return `<section class="setting-group"><h3>Perfis de estudo</h3><p>O progresso de cada perfil é salvo neste dispositivo.</p>
    <form class="inline-form" data-form="rename"><label for="profile-name">Seu nome</label><div><input id="profile-name" name="name" maxlength="32" value="${escape(profile.name)}" required><button class="button primary" type="submit">Salvar</button></div></form>
    <label class="switch-label">Perfil ativo<select id="profile-select">${study.profiles.map(item => `<option value="${item.id}" ${item.id === profile.id ? 'selected' : ''}>${escape(item.name)}</option>`).join('')}</select></label>
    <form class="inline-form" data-form="create"><label for="new-profile">Novo perfil</label><div><input id="new-profile" name="name" maxlength="32" required ${study.profiles.length >= 16 ? 'disabled' : ''}><button type="submit" class="button secondary" ${study.profiles.length >= 16 ? 'disabled' : ''}>Adicionar</button></div></form>
  </section>
  <section class="setting-group"><h3>Som das respostas</h3><label class="check-label"><input type="checkbox" id="sound" ${study.sound ? 'checked' : ''}>Tocar um som ao corrigir exercícios</label></section>
  <section class="setting-group"><h3>Backup de progresso</h3><p>Leve seus perfis de inglês para outro dispositivo.</p><div class="button-row">
    <button type="button" class="button secondary" data-action="export">Exportar</button>
    <button type="button" class="button secondary" data-action="import">Importar</button><input type="file" id="import-file" accept=".json,application/json" hidden>
  </div></section>
  ${desktop ? '' : `<section class="setting-group"><h3>Instalar Blingo</h3>${installAvailable ? '<button class="button secondary" type="button" data-action="install">Instalar aplicativo</button>' : '<p>Abra o menu do navegador e procure a opção para instalar ou adicionar à tela inicial.</p>'}</section>`}
  <p class="dialog-status" role="status"></p>`
}

export function crewContent() {
  const count = completedCount()
  return `<p class="dialog-intro">Você encontra novos personagens conforme avança na trilha.</p>
    <ul class="crew-list">${crew.map(friend => `<li>${asset(friend.id)}<div><h3>${friend.name} <small>${friend.role}</small></h3><p>${count >= friend.goal ? friend.detail : `Entrada liberada após ${friend.goal} ${friend.goal === 1 ? 'lição' : 'lições'}.`}</p></div>
      ${count >= friend.goal ? `<button type="button" class="square" data-action="preview-mascot" data-id="${friend.id}" aria-label="Ver a comemoração de ${friend.name}">${icon('play')}</button>` : icon('lock')}</li>`).join('')}</ul>`
}

export function rewardsContent() {
  const profile = activeProfile()
  return `<p class="dialog-intro">Você tem ${profile.hearts} de ${maxHearts} corações e ${numbers.format(profile.wallet)} XP para gastar.</p>
    <p>${profile.hearts < maxHearts ? `O próximo coração chega em ${nextHeart(profile)} min. Você também pode recuperar corações acertando na prática.` : 'Você está com todos os corações.'}</p>
    <div class="button-row"><button type="button" class="button primary" data-action="buy" ${profile.hearts === maxHearts || profile.wallet < heartPrice ? 'disabled' : ''}>Repor por ${heartPrice} XP ${icon('heart')}</button>
    <button type="button" class="button secondary" data-action="practice">Ir para a prática ${icon('arrow')}</button></div>`
}
