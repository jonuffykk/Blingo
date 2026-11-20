import './style.css'
import { activeProfile, cards, dayKey, earn, heartPrice, isComplete, lessons, maxHearts, newProfile, nextLesson, refill, restore, save, schedule, storageAvailable, storageKey, study, syncStorage, type Card } from './study'
import { asset, crew, crewContent, escape, header, icon, learnPage, lessonHost, practicePage, progressPage, rewardsContent, settingsContent, type Mascot, type Page } from './views'

type Run = {
  mode: 'lesson' | 'review'
  title: string
  pending: Card[]
  total: number
  done: number
  right: number
  tries: number
  xp: number
  feedback: 'correct' | 'wrong' | null
  answer: string
  typing: boolean
  tokens: number[]
  lastHost: Mascot
}

type InstallPrompt = Event & { prompt(): Promise<void>; userChoice: Promise<{ outcome: string }> }

const app = document.querySelector<HTMLDivElement>('#app')!
const desktop = location.hostname === 'blingo.localhost'
let page: Page = 'learn'
let run: Run | null = null
let installPrompt: InstallPrompt | undefined
let audioContext: AudioContext | undefined
let clipBuffer: Promise<AudioBuffer> | undefined
let playing: AudioBufferSourceNode | undefined
let stopMedia: (() => void) | undefined
let audioRequest = 0
const audioPath = './audio/english.mp3'

function focusHeading() {
  app.querySelector<HTMLElement>('main h1')?.focus({ preventScroll: true })
}

function navigate(target: Page) {
  if (location.hash !== '#' + target) {
    location.hash = target
  } else {
    page = target
    render()
    window.scrollTo(0, 0)
    focusHeading()
  }
}

function route() {
  const target = location.hash.slice(1)
  page = target === 'practice' || target === 'progress' ? target : 'learn'
  run = null
  stopPronunciation()
  render()
}

function render() {
  refill()
  const body = run ? quiz() : page === 'learn' ? learnPage() : page === 'practice' ? practicePage() : progressPage()
  app.innerHTML = `${run ? '' : header(page)}<main id="main" tabindex="-1" class="${run ? 'quiz-shell' : 'main'}">${!storageAvailable ? '<p class="notice" role="status">O navegador está bloqueando o armazenamento. Exporte seu progresso antes de fechar o Blingo.</p>' : ''}${body}</main>
    <dialog id="panel" aria-labelledby="panel-title"></dialog><div class="toast" role="status"></div>`
}

function startLesson(id: string) {
  refill()
  const lesson = lessons.find(item => item.id === id)
  if (!lesson || (nextLesson()?.id !== id && !isComplete(lesson))) return
  const complete = isComplete(lesson)
  if (!activeProfile().hearts && !complete) {
    showRewards()
    return
  }
  const done = complete ? [] : activeProfile().completed[id] ?? []
  start(complete ? 'review' : 'lesson', lesson.title, cards.filter(card => card.lesson === id && !done.includes(card.index)), done.length)
}

function startReview(mode: 'daily' | 'mistakes' | 'listening') {
  const profile = activeProfile()
  const learned = cards.filter(card => profile.completed[card.lesson]?.includes(card.index))
  const today = dayKey()
  const listening = cards.filter(card => card.question.kind === 'listen' && (learned.includes(card) || lessons.slice(0, 4).some(lesson => lesson.id === card.lesson)))
  const queue = mode === 'mistakes' ? cards.filter(card => profile.mistakes.includes(card.key)) :
    mode === 'listening' ? listening : learned.length >= 6 ? learned : cards.filter(card => learned.includes(card) || card.lesson === lessons[0].id)
  const picked = queue.map(card => ({ card, random: Math.random(), due: profile.review[card.key]?.due ?? (learned.includes(card) ? today : '9999') }))
    .sort((a, b) => Number(b.due <= today) - Number(a.due <= today) || a.due.localeCompare(b.due) || a.random - b.random)
  if (picked.length) start('review', { daily: 'Revisão do dia', mistakes: 'Rever erros', listening: 'Treino de ouvido' }[mode], picked.slice(0, 6).map(item => item.card))
}

function start(mode: Run['mode'], title: string, pending: Card[], done = 0) {
  run = { mode, title, pending, total: pending.length + done, done, right: 0, tries: 0, xp: 0, feedback: null, answer: '', typing: false, tokens: [], lastHost: 'pip' }
  render()
  window.scrollTo(0, 0)
  focusHeading()
}

function sceneHost() {
  const card = run?.pending[0]
  return card ? lessonHost(card.lesson, card.question.kind === 'listen') : run?.lastHost ?? 'pip'
}

function lessonScene(speaking = false) {
  const host = sceneHost()
  if (speaking) return host + '-speak'
  if (!run?.pending.length) return host + '-win'
  if (run.feedback === 'correct') return host + '-cheer'
  if (run.feedback === 'wrong') return host + '-retry'
  return host
}

function setScene(id: string) {
  const image = app.querySelector<HTMLImageElement>('.quiz-scene img')
  const path = './mascots/' + id + '.svg'
  if (image && image.getAttribute('src') !== path) image.src = path
}

function englishTokens(value: string) {
  return value.replace(/[’]/g, "'").match(/[\p{L}\p{N}]+(?:['-][\p{L}\p{N}]+)*/gu) ?? []
}

function wordBank(card: Card) {
  const q = card.question
  const expected = englishTokens(q.answer)
  const correct = new Set(expected.map(word => word.toLowerCase()))
  const extra = new Set(q.options.filter(option => option !== q.answer).flatMap(englishTokens).map(word => word.toLowerCase()))
  const decoys = [...extra].filter(word => !correct.has(word)).slice(0, Math.min(3, expected.length))
  const letters = [...expected, ...decoys]
  for (let i = letters.length - 1; i > 0; i--) {
    const index = (card.key.charCodeAt(i % card.key.length) * (i + 7)) % (i + 1)
    const word = letters[index]
    letters[index] = letters[i]
    letters[i] = word
  }
  return letters
}

function wordChoices(session: Run) {
  const words = wordBank(session.pending[0])
  const picked = session.tokens
  const chips = (indices: number[], active: boolean) => indices.map(index =>
    `<button type="button" class="word ${active ? 'chosen' : ''}" data-action="token" data-id="${index}" lang="en" aria-pressed="${active}" ${session.feedback ? 'disabled' : ''}>${escape(words[index])}</button>`).join('')
  return `<div class="built-phrase" role="group" aria-label="Sua frase">${picked.length ? chips(picked, true) : '<span>Toque nas palavras para montar a frase</span>'}</div>
    <div class="word-bank" role="group" aria-label="Palavras disponíveis">${chips(words.map((_, index) => index).filter(index => !picked.includes(index)), false)}</div>`
}

function audioButton(label = 'Ouvir', slow = false, key = '') {
  return `<button type="button" class="audio ${slow ? 'slow' : ''}" data-action="audio" ${slow ? 'data-slow="true"' : ''} ${key ? `data-id="${key}"` : ''}>${icon('audio')} ${label}</button>`
}

function quiz() {
  const session = run!
  const current = session.pending[0]
  const profile = activeProfile()
  const label = session.mode === 'lesson' ? 'Lição' : 'Prática'
  const accuracy = session.tries ? Math.round(session.right / session.tries * 100) : 0
  const top = `<div class="quiz-top"><button type="button" class="square" data-action="exit" aria-label="Sair da atividade">${icon('close')}</button>
    <div class="quiz-track"><div><span>${label} · ${escape(session.title)}</span><span>${session.done}/${session.total}</span></div>
    <progress aria-label="Progresso da atividade" max="${session.total}" value="${session.done}"></progress></div>
    <span class="quiz-hearts" aria-label="${profile.hearts} corações">${icon('heart')} ${profile.hearts}</span></div>`
  if (!current) return `${top}<section class="end-card">
    ${asset(lessonScene())}
    <h1 tabindex="-1">${session.mode === 'lesson' ? 'Lição concluída!' : 'Prática concluída!'}</h1>
    <p>${accuracy}% de acertos · +${session.xp} XP</p>
    <button class="button primary" type="button" data-action="finish">${page === 'learn' ? 'Voltar à trilha' : 'Voltar à prática'} ${icon('arrow')}</button>
  </section>`
  if (!profile.hearts && session.mode === 'lesson' && !session.feedback) return `${top}<section class="end-card">
    ${asset(sceneHost() + '-retry')}
    <h1 tabindex="-1">Pausa para recarregar</h1><p>Suas respostas foram salvas. Recupere corações para continuar.</p>
    <button type="button" class="button primary" data-action="rewards">Recuperar corações ${icon('heart')}</button>
  </section>`

  const q = current.question
  const state = session.feedback
  const recall = q.kind === 'recall'
  const listen = q.kind === 'listen'
  const lesson = lessons.find(item => item.id === current.lesson)
  const prompt = listen
    ? `<div class="audio-prompt"><div class="audio-controls">${audioButton()}${audioButton('Devagar', true)}</div><details class="transcript"><summary>Ver o texto em inglês</summary><span lang="en">${escape(q.english)}</span></details></div>`
    : `<p class="prompt">${escape(q.prompt)}</p>`
  return `${top}<section class="quiz-card" aria-labelledby="quiz-heading">
    <div class="quiz-scene">${asset(lessonScene())}</div>
    <div class="quiz-body">
      <div class="quiz-heading-row"><h1 id="quiz-heading" tabindex="-1">${listen ? 'O que você ouviu?' : recall && !session.typing ? 'Monte a frase em inglês' : recall ? 'Escreva em inglês' : 'Escolha a tradução'}</h1>
      ${lesson?.guide?.length ? `<button type="button" class="square lesson-guide ${state ? 'guide-empty' : ''}" aria-label="Frases da lição" data-action="guide" ${state ? 'disabled' : ''}>${icon('learn')}</button>` : ''}</div>
      ${prompt}
      <form data-form="answer" autocomplete="off">
        ${recall
          ? `${session.typing ? `<label class="recall-label" for="recall">Sua tradução</label><input id="recall" class="recall" name="answer" lang="en" maxlength="180" value="${escape(session.answer)}" ${state ? 'disabled' : ''} required>` : `<div data-word-area>${wordChoices(session)}</div>`}
          <button type="button" class="text-button exercise-switch" data-action="choices" ${state ? 'disabled' : ''}>${session.typing ? 'Usar o banco de palavras' : 'Digitar em vez de montar'}</button>`
          : `<div class="options" role="group" aria-label="Opções de resposta">${q.options.map((option, index) => `<button class="answer ${state && option === q.answer ? 'correct' : ''} ${state === 'wrong' && option === session.answer ? 'wrong' : ''}" type="button" data-action="option" data-id="${index}" aria-pressed="${option === session.answer}" ${state ? 'disabled' : ''}>
            <kbd aria-hidden="true">${index + 1}</kbd><span ${listen ? '' : 'lang="en"'}>${escape(option)}</span></button>`).join('')}</div>`}
        <div class="quiz-actions">
          ${state
            ? `<div class="feedback ${state}" role="status"><div><strong>${state === 'correct' ? 'Você acertou!' : 'Vamos tentar de novo'}</strong>
              ${state === 'wrong' ? `<p>Resposta: <b ${listen ? '' : 'lang="en"'}>${escape(q.answer)}</b></p>` : ''}
              <p>${escape(q.note)}</p></div>${listen ? '' : audioButton()}</div>
              <button class="button primary" type="button" data-action="next">${session.pending.length === 1 && state === 'correct' ? 'Concluir' : 'Continuar'} ${icon('arrow')}</button>`
            : `<button class="button primary" type="submit" data-check ${session.answer.trim() ? '' : 'disabled'}>Verificar ${icon('check')}</button>`}
        </div>
      </form>
      <p class="audio-status" role="status"></p>
    </div>
  </section>`
}

function selectToken(index: number) {
  if (!run || run.feedback || run.typing) return
  const bank = wordBank(run.pending[0])
  if (bank[index] === undefined) return
  run.tokens = run.tokens.includes(index) ? run.tokens.filter(token => token !== index) : [...run.tokens, index]
  run.answer = run.tokens.map(token => bank[token]).join(' ')
  app.querySelector<HTMLElement>('[data-word-area]')!.innerHTML = wordChoices(run)
  app.querySelector<HTMLButtonElement>('[data-check]')!.disabled = !run.answer
  app.querySelector<HTMLButtonElement>(`[data-action="token"][data-id="${index}"]`)?.focus({ preventScroll: true })
}

function showGuide() {
  const card = run?.pending[0]
  const lesson = lessons.find(item => item.id === card?.lesson)
  if (!lesson?.guide?.length) return
  const lessonCards = cards.filter(item => item.lesson === lesson.id)
  dialog('Frases da lição', `<ul class="phrase-guide">${lesson.guide.map(pair => {
    const model = lessonCards.find(item => item.question.english === pair.english) ?? cards.find(item => item.question.english === pair.english)
    return `<li><div><strong lang="en">${escape(pair.english)}</strong><span>${escape(pair.portuguese)}</span></div>${model ? audioButton('Ouvir', false, model.key) : ''}</li>`
  }).join('')}</ul><p class="audio-status" role="status"></p>`)
}

function normalize(text: string) {
  return text.normalize('NFC').toLocaleLowerCase('en').replace(/[’']/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
}

function submitAnswer() {
  if (!run || run.feedback || !run.answer.trim()) return
  const card = run.pending[0]
  const profile = activeProfile()
  if (!card || (run.mode === 'lesson' && profile.hearts === 0)) return
  const q = card.question
  const accepted = [q.answer, ...(q.accepted ?? [])]
  const correct = accepted.some(answer => normalize(answer) === normalize(run!.answer))
  stopPronunciation()
  run.tries++
  schedule(card, correct, profile)
  if (correct) {
    let xp = 5
    if (run.mode === 'lesson') {
      const done = profile.completed[card.lesson] ?? []
      xp = done.includes(card.index) ? 0 : 10
      if (xp) profile.completed[card.lesson] = [...done, card.index]
    } else if (profile.hearts < maxHearts) {
      profile.hearts++
      if (profile.hearts === maxHearts) profile.heartAt = Date.now()
    }
    profile.mistakes = profile.mistakes.filter(key => key !== card.key)
    if (xp) earn(xp, profile)
    run.right++
    run.xp += xp
    run.done++
  } else {
    if (!profile.mistakes.includes(card.key)) profile.mistakes.push(card.key)
    if (run.mode === 'lesson') {
      if (profile.hearts === maxHearts) profile.heartAt = Date.now()
      profile.hearts--
    }
  }
  save()
  run.feedback = correct ? 'correct' : 'wrong'
  tone(correct)
  render()
  app.querySelector<HTMLButtonElement>('[data-action="next"]')?.focus({ preventScroll: true })
}

function continueRun() {
  if (!run?.feedback) return
  stopPronunciation()
  run.lastHost = sceneHost()
  const card = run.pending.shift()
  if (run.feedback === 'wrong' && card) run.pending.push(card)
  run.feedback = null
  run.answer = ''
  run.typing = false
  run.tokens = []
  render()
  window.scrollTo(0, 0)
  focusHeading()
}

function choose(button: HTMLButtonElement) {
  if (!run || run.feedback) return
  run.answer = run.pending[0].question.options[Number(button.dataset.id)] ?? ''
  app.querySelectorAll<HTMLButtonElement>('.answer').forEach(option => option.setAttribute('aria-pressed', String(option === button)))
  app.querySelector<HTMLButtonElement>('[data-check]')!.disabled = !run.answer
  button.focus({ preventScroll: true })
}

function leave() {
  run = null
  stopPronunciation()
  navigate(page)
}

function getContext() {
  if (typeof AudioContext === 'undefined') return
  audioContext ??= new AudioContext()
  return audioContext
}

function stopPronunciation() {
  audioRequest++
  stopMedia?.()
  if (playing) {
    playing.stop()
    playing = undefined
  }
  if ('speechSynthesis' in window) speechSynthesis.cancel()
}

async function playMedia(clip: { start: number; duration: number }, speed: number, request: number) {
  const media = new Audio(audioPath)
  const end = clip.start + clip.duration
  let frame = 0
  const stop = () => {
    cancelAnimationFrame(frame)
    media.pause()
    media.removeAttribute('src')
    if (stopMedia === stop) stopMedia = undefined
    if (request === audioRequest) setScene(lessonScene())
  }
  const watch = () => {
    if (media.currentTime >= end) stop()
    else frame = requestAnimationFrame(watch)
  }
  stopMedia = stop
  media.currentTime = clip.start
  media.playbackRate = speed
  media.addEventListener('timeupdate', () => { if (media.currentTime >= end) stop() })
  media.addEventListener('ended', stop, { once: true })
  try {
    await media.play()
    if (stopMedia === stop) {
      setScene(lessonScene(true))
      watch()
    }
  } catch (error) {
    stop()
    throw error
  }
}

function tone(correct: boolean) {
  if (!study.sound) return
  const context = getContext()
  if (!context) return
  void context.resume().catch(() => {})
  const note = context.createOscillator()
  const envelope = context.createGain()
  const now = context.currentTime
  note.type = 'sine'
  note.frequency.setValueAtTime(correct ? 587 : 349, now)
  note.frequency.setValueAtTime(correct ? 880 : 330, now + .09)
  envelope.gain.setValueAtTime(.055, now)
  envelope.gain.exponentialRampToValueAtTime(.001, now + .19)
  note.connect(envelope).connect(context.destination)
  note.start(now)
  note.stop(now + .2)
}

async function pronounce(button: HTMLButtonElement) {
  const q = button.dataset.id ? cards.find(card => card.key === button.dataset.id)?.question : run?.pending[0]?.question
  if (!q) return
  stopPronunciation()
  const request = audioRequest
  const speed = button.dataset.slow ? .78 : 1
  const message = button.closest('dialog, .quiz-body')?.querySelector<HTMLElement>('.audio-status')
  if (message) message.textContent = ''
  button.setAttribute('aria-busy', 'true')
  try {
    if (speed < 1 && q.audio) {
      try {
        await playMedia(q.audio, speed, request)
        return
      } catch {}
    }
    if (request !== audioRequest) return
    const context = getContext()
    if (!context || !q.audio) throw Error('Audio unavailable')
    const ready = context.resume()
    clipBuffer ??= fetch(audioPath).then(response => {
      if (!response.ok) throw Error('Audio unavailable')
      return response.arrayBuffer()
    }).then(bytes => context.decodeAudioData(bytes)).catch(error => {
      clipBuffer = undefined
      throw error
    })
    const [, buffer] = await Promise.all([ready, clipBuffer])
    if (request !== audioRequest) return
    const source = context.createBufferSource()
    source.buffer = buffer
    source.playbackRate.value = speed
    source.connect(context.destination)
    playing = source
    source.onended = () => {
      source.disconnect()
      if (playing === source) playing = undefined
      if (request === audioRequest) setScene(lessonScene())
    }
    setScene(lessonScene(true))
    source.start(0, q.audio.start, q.audio.duration)
  } catch {
    if (request !== audioRequest) return
    if (q.audio) {
      try {
        await playMedia(q.audio, speed, request)
        return
      } catch {}
    }
    if (request !== audioRequest) return
    const voice = 'speechSynthesis' in window && speechSynthesis.getVoices().find(item => item.localService && item.lang.startsWith('en'))
    if (voice) {
      const phrase = new SpeechSynthesisUtterance(q.english)
      phrase.voice = voice
      phrase.lang = voice.lang
      phrase.rate = speed
      phrase.onstart = () => { if (request === audioRequest) setScene(lessonScene(true)) }
      phrase.onend = () => { if (request === audioRequest) setScene(lessonScene()) }
      speechSynthesis.speak(phrase)
    } else if (message) {
      setScene(lessonScene())
      message.textContent = q.kind === 'listen' ? 'O áudio não abriu. Você pode ler a frase acima.' : 'O áudio não abriu. Tente novamente.'
    }
  } finally {
    button.removeAttribute('aria-busy')
  }
}

function dialog(title: string, body: string, focus?: string) {
  const panel = app.querySelector<HTMLDialogElement>('#panel')!
  panel.innerHTML = `<div class="dialog-head"><h2 id="panel-title">${title}</h2><button type="button" class="square" data-action="close" aria-label="Fechar janela">${icon('close')}</button></div><div class="dialog-body">${body}</div>`
  if (!panel.open) {
    panel.showModal()
    panel.addEventListener('close', () => {
      stopPronunciation()
      if (run) setScene(lessonScene())
    }, { once: true })
  }
  if (focus) panel.querySelector<HTMLElement>(focus)?.focus()
}

function showRewards() {
  refill()
  dialog('Corações', rewardsContent())
}

function showSettings(focus?: string) {
  dialog('Configurações', settingsContent(Boolean(installPrompt), desktop), focus)
}

function announce(text: string) {
  const status = app.querySelector<HTMLElement>('#panel[open] .dialog-status') ?? app.querySelector<HTMLElement>('.toast')
  if (status) {
    status.textContent = ''
    requestAnimationFrame(() => { status.textContent = text })
    if (status.classList.contains('toast')) setTimeout(() => { if (status.textContent === text) status.textContent = '' }, 4500)
  }
}

function createBackup() {
  const url = URL.createObjectURL(new Blob([JSON.stringify(study, null, 2)], { type: 'application/json' }))
  const link = document.createElement('a')
  link.href = url
  link.download = 'blingo-ingles.json'
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 30_000)
}

app.addEventListener('click', event => {
  const target = event.target as HTMLElement
  const button = target.closest<HTMLButtonElement>('button[data-action]')
  if (!button || button.disabled) return
  switch (button.dataset.action) {
    case 'lesson': startLesson(button.dataset.id ?? ''); break
    case 'review': startReview('daily'); break
    case 'mistakes': startReview('mistakes'); break
    case 'listening': startReview('listening'); break
    case 'option': choose(button); break
    case 'token': selectToken(Number(button.dataset.id)); break
    case 'audio': void pronounce(button); break
    case 'guide': showGuide(); break
    case 'next': continueRun(); break
    case 'finish': leave(); break
    case 'exit': run?.pending.length ? dialog('Sair da atividade?', '<p class="dialog-intro">O XP e as respostas certas da trilha já foram salvos.</p><div class="button-row"><button type="button" class="button primary" data-action="close">Continuar aqui</button><button type="button" class="button secondary" data-action="finish">Sair da atividade</button></div>') : leave(); break
    case 'choices': if (run) {
      run.typing = !run.typing
      run.answer = ''
      run.tokens = []
      render()
      app.querySelector<HTMLElement>(run.typing ? '#recall' : '.word-bank .word')?.focus()
    } break
    case 'settings': showSettings(); break
    case 'rewards': showRewards(); break
    case 'crew': dialog('Personagens', crewContent()); break
    case 'preview-mascot': {
      const friend = crew.find(item => item.id === button.dataset.id)
      const image = button.closest('li')?.querySelector('img')
      if (friend && image) {
        const preview = image.cloneNode() as HTMLImageElement
        preview.src = './mascots/' + friend.id + '-cheer.svg'
        image.replaceWith(preview)
      }
      break
    }
    case 'practice': run = null; stopPronunciation(); navigate('practice'); break
    case 'close': app.querySelector<HTMLDialogElement>('#panel')?.close(); break
    case 'export': createBackup(); break
    case 'import': app.querySelector<HTMLInputElement>('#import-file')?.click(); break
    case 'install': if (installPrompt) void installPrompt.prompt().then(() => installPrompt?.userChoice).then(() => { installPrompt = undefined; showSettings() }).catch(() => announce('Tente instalar pelo menu do navegador.')); break
    case 'buy': {
      const profile = activeProfile()
      if (profile.wallet < heartPrice || profile.hearts >= maxHearts) break
      profile.wallet -= heartPrice
      profile.hearts = maxHearts
      profile.heartAt = Date.now()
      save()
      render()
      announce('Corações repostos.')
      if (run) focusHeading()
      break
    }
  }
})

app.addEventListener('submit', event => {
  event.preventDefault()
  const form = event.target as HTMLFormElement
  if (form.dataset.form === 'answer') {
    submitAnswer()
    return
  }
  const name = String(new FormData(form).get('name') ?? '').trim().slice(0, 32)
  if (!name) { announce('Digite um nome para o perfil.'); return }
  if (form.dataset.form === 'rename') {
    activeProfile().name = name
  } else if (form.dataset.form === 'create' && study.profiles.length < 16) {
    const profile = newProfile(name)
    study.profiles.push(profile)
    study.active = profile.id
  } else {
    return
  }
  save()
  render()
  showSettings('#profile-name')
  announce('Perfil salvo.')
})

app.addEventListener('input', event => {
  const input = event.target as HTMLInputElement
  if (input.id === 'recall' && run && !run.feedback) {
    run.answer = input.value
    app.querySelector<HTMLButtonElement>('[data-check]')!.disabled = !run.answer.trim()
  }
})

app.addEventListener('change', async event => {
  const input = event.target as HTMLInputElement
  if (input.id === 'sound') {
    study.sound = input.checked
    save()
  }
  if (input.id === 'profile-select' && study.profiles.some(profile => profile.id === input.value)) {
    study.active = input.value
    save()
    render()
    showSettings('#profile-select')
  }
  if (input.id === 'import-file' && input.files?.[0]) {
    try {
      const file = input.files[0]
      if (file.size > 1_000_000) throw Error('File too large')
      restore(await file.text())
      render()
      showSettings('[data-action="import"]')
      announce('Progresso importado.')
    } catch {
      input.value = ''
      announce('Não deu para importar esse arquivo. Selecione um backup da trilha de inglês.')
    }
  }
})

document.addEventListener('keydown', event => {
  if (!run || event.altKey || event.ctrlKey || event.metaKey || event.isComposing || app.querySelector('dialog[open]')) return
  const tag = (event.target as HTMLElement).tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
  if (/^[1-3]$/.test(event.key) && !run.feedback) {
    const button = app.querySelector<HTMLButtonElement>(`.answer[data-id="${Number(event.key) - 1}"]`)
    if (button) { event.preventDefault(); choose(button) }
  }
})

document.querySelector('.skip')?.addEventListener('click', event => {
  event.preventDefault()
  app.querySelector('main')?.focus()
})

window.setInterval(() => {
  if (document.hidden || app.querySelector('dialog[open]')) return
  const before = activeProfile().hearts
  refill()
  const profile = activeProfile()
  if (before !== profile.hearts && (!run || (!before && run.mode === 'lesson' && !run.feedback))) {
    const focused = document.activeElement as HTMLElement | null
    const action = focused?.dataset.action
    const id = focused?.dataset.id
    render()
    if (run) focusHeading()
    else if (action) [...app.querySelectorAll<HTMLElement>('[data-action]')].find(button =>
      button.dataset.action === action && button.dataset.id === id)?.focus({ preventScroll: true })
  }
}, 30_000)

window.addEventListener('hashchange', () => {
  route()
  window.scrollTo(0, 0)
  focusHeading()
})
window.addEventListener('storage', event => {
  if (event.key !== storageKey && event.key !== null) return
  syncStorage()
  if (run) {
    run = null
    stopPronunciation()
    render()
    announce('Progresso atualizado em outra janela.')
  } else {
    render()
  }
})
window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault()
  installPrompt = event as InstallPrompt
})
if (import.meta.env.PROD && !desktop && 'serviceWorker' in navigator) {
  void navigator.serviceWorker.register('./sw.js').catch(() => {})
}
save()
route()

