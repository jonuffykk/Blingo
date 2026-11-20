import { audioTimings } from './audio-timings'

export type QuestionKind = 'translate' | 'listen' | 'recall'

export interface Question {
  kind: QuestionKind
  english: string
  portuguese: string
  prompt: string
  answer: string
  options: string[]
  note: string
  audio?: { start: number; duration: number }
  accepted?: string[]
}

export interface Lesson {
  id: string
  title: string
  description: string
  guide: { english: string; portuguese: string }[]
  questions: Question[]
}

export interface Unit {
  id: string
  title: string
  description: string
  lessons: Lesson[]
}

function question(
  kind: QuestionKind,
  english: string,
  portuguese: string,
  distractors: [string, string],
  note: string,
  accepted?: string[],
): Question {
  const listening = kind === 'listen'
  const answer = listening ? portuguese : english
  const options = [...distractors]
  const order = Array.from(english).reduce((hash, letter) => Math.imul(hash ^ letter.charCodeAt(0), 59), 0x811c9dc5)
  const position = (order >>> 0) % 3
  options.splice(position, 0, answer)
  const clip = audioTimings[english]

  return {
    kind,
    english,
    portuguese,
    prompt: listening ? english : portuguese,
    answer,
    options,
    note,
    audio: clip ? { start: clip[0], duration: clip[1] } : undefined,
    accepted,
  }
}

function lesson(id: string, title: string, description: string, questions: Question[]): Lesson {
  const guide = questions.map(({ english, portuguese }) => ({ english, portuguese }))
  return { id: 'en-' + id, title, description, guide, questions }
}

export const course: { id: string; title: string; units: Unit[] } = {
  id: 'english',
  title: 'Inglês',
  units: [
    {
      id: 'first-meetings',
      title: 'Primeiros contatos',
      description: 'Cumprimente, se apresente e peça ajuda em inglês.',
      lessons: [
        lesson('greetings', 'Diga oi', 'Cumprimente alguém e se despeça.', [
          question('translate', 'Hi!', 'Oi!', ['Bye!', 'Thanks!'], 'Hi é o “oi” do dia a dia. Hello também serve.'),
          question('listen', 'Good morning!', 'Bom dia!', ['Boa tarde!', 'Boa noite!'], 'Good morning é o cumprimento usado de manhã.'),
          question('translate', 'How are you?', 'Como você está?', ['Where are you?', 'Who are you?'], 'How pergunta “como”. Where pergunta “onde”.'),
          question('listen', "I'm fine, thanks.", 'Estou bem, valeu.', ['Estou com fome.', 'Até amanhã.'], 'I’m é a forma curta de I am. Thanks equivale a “obrigado” ou “valeu”.'),
          question('translate', 'Good night!', 'Boa noite! (ao se despedir)', ['Good evening!', 'Good morning!'], 'Ao chegar à noite, diga good evening. Para se despedir ou dormir, use good night.'),
          question('recall', 'See you tomorrow!', 'Até amanhã!', ['See you soon!', 'Good night!'], 'See you é uma despedida. Tomorrow especifica que vocês se veem amanhã.', ["I'll see you tomorrow!", 'I will see you tomorrow!', 'See you tomorrow then!']),
        ]),
        lesson('introductions', 'Faça uma apresentação', 'Diga seu nome e de onde você é.', [
          question('translate', 'My name is Ana.', 'Meu nome é Ana.', ['Her name is Ana.', 'This is Ana.'], 'My indica algo meu. Her indica algo dela.'),
          question('listen', "What's your name?", 'Qual é o seu nome?', ['De onde você é?', 'Qual é o nome dela?'], 'Você pode dizer what is ou encurtar para what’s. Your marca que o nome é da pessoa com quem você fala.'),
          question('translate', "I'm from Brazil.", 'Eu sou do Brasil.', ["I'm in Brazil.", "I'm going to Brazil."], 'From indica origem. In informa onde você está.'),
          question('listen', 'Where are you from?', 'De onde você é?', ['Onde você está?', 'Qual é o seu nome?'], 'O from vem no fim dessa pergunta em inglês. Compare com o “de” no começo da frase em português.'),
          question('translate', 'This is my friend.', 'Esta é minha amiga.', ['This is her friend.', 'She is your friend.'], 'Friend serve para “amigo” e “amiga”. This is é uma forma natural de apresentar alguém.'),
          question('recall', 'Nice to meet you.', 'Prazer em conhecer você.', ['Nice to see you.', 'See you tomorrow!'], 'Use nice to meet you quando conhecer a pessoa. Se já a conhece, nice to see you soa natural.', ["It's nice to meet you.", 'It is nice to meet you.', 'Pleased to meet you.', 'Glad to meet you.', 'It’s a pleasure to meet you.']),
        ]),
        lesson('politeness', 'Seja gentil', 'Agradeça, aceite ou recuse uma oferta.', [
          question('translate', 'Yes, please.', 'Sim, por favor.', ['Yes, thanks.', 'No, please.'], 'Yes, please é uma resposta natural quando alguém oferece algo que você quer.'),
          question('listen', 'Thank you very much.', 'Muito obrigado.', ['Com licença.', 'De nada.'], 'Very much dá ênfase a thank you. A expressão funciona para qualquer pessoa, sem mudar o gênero.'),
          question('translate', 'No, thank you.', 'Não, obrigado.', ['Yes, please.', "No, I'm sorry."], 'Acrescentar thank you deixa a recusa mais gentil.'),
          question('listen', "You're welcome.", 'De nada.', ['Boa noite.', 'Obrigado.'], 'Depois de thank you, you’re welcome significa “de nada”.'),
          question('translate', "I'm sorry.", 'Me desculpe.', ["I'm fine.", "You're welcome."], 'Use I’m sorry para pedir desculpas. Excuse me costuma vir antes de interromper ou passar.'),
          question('recall', 'Excuse me.', 'Com licença. (para chamar alguém)', ['Good night.', 'Please.'], 'Excuse me é útil para chamar a atenção de um desconhecido antes de fazer uma pergunta.', ['Pardon me.']),
        ]),
        lesson('keep-talking', 'Peça ajuda', 'Mantenha a conversa quando não entender.', [
          question('translate', "I don't understand.", 'Eu não entendo.', ["I don't know.", "I can't hear you."], 'Don’t é a forma curta de do not. Coloque don’t antes de understand.'),
          question('listen', 'Could you say that again?', 'Você poderia dizer isso de novo?', ['Você poderia escrever isso?', 'Você fala inglês?'], 'Could you abre um pedido educado. Again quer dizer “de novo”.'),
          question('translate', 'Please speak more slowly.', 'Por favor, fale mais devagar.', ['Please speak louder.', 'Please wait a moment.'], 'More slowly significa “mais devagar”. Louder significa “mais alto”.'),
          question('listen', 'How do you say this in English?', 'Como se diz isso em inglês?', ['O que isso quer dizer?', 'Você fala inglês?'], 'How do you say… é uma pergunta prática quando você conhece a ideia, mas não a palavra.'),
          question('translate', 'I speak a little English.', 'Eu falo um pouco de inglês.', ['I study a lot of English.', "I don't speak English."], 'A little indica uma quantidade pequena. Use a little English para falar do quanto você sabe.'),
          question('recall', 'Could you help me?', 'Você poderia me ajudar?', ['Could I help you?', 'Could you hear me?'], 'Depois de could you, use help sem to. Me indica quem recebe a ajuda.', ['Can you help me?', 'Would you help me?', 'Could you give me a hand?', 'Can you give me a hand?']),
        ]),
      ],
    },
    {
      id: 'day-to-day',
      title: 'Em casa',
      description: 'Conte sobre sua rotina, sua família e seus horários.',
      lessons: [
        lesson('daily-routine', 'Descreva sua rotina', 'Fale do que costuma fazer em um dia normal.', [
          question('translate', 'I wake up early.', 'Eu acordo cedo.', ['I get home early.', 'I go to bed early.'], 'Wake up é acordar. Go to bed é ir para a cama.'),
          question('listen', 'I go to work by bus.', 'Eu vou de ônibus para o trabalho.', ['Eu vou de trem para o trabalho.', 'Eu vou a pé para o trabalho.'], 'Use by bus, by train e by car para falar do meio de transporte. A pé é on foot.'),
          question('translate', 'I have breakfast at home.', 'Eu tomo café da manhã em casa.', ['I have lunch at home.', 'I make coffee at work.'], 'Have breakfast significa tomar café da manhã. At home significa “em casa”.'),
          question('listen', 'I study English at night.', 'Eu estudo inglês à noite.', ['Eu estudo inglês cedo.', 'Eu dou aula de inglês à noite.'], 'At night é a expressão usual para “à noite”. De manhã, use in the morning.'),
          question('translate', "I don't work on Sundays.", 'Eu não trabalho aos domingos.', ['I only work on Sundays.', "I don't work on Saturdays."], 'Use on com dias da semana. Sundays no plural indica um hábito.'),
          question('recall', 'I get home at six.', 'Eu chego em casa às seis.', ['I leave home at six.', 'I get up at six.'], 'Get home é chegar em casa. Use at para marcar uma hora.', ['I arrive home at six.', "I get home at six o'clock.", "I arrive home at six o'clock.", 'I get home at 6.', 'I arrive home at 6.']),
        ]),
        lesson('family', 'Fale da sua família', 'Apresente as pessoas da sua vida.', [
          question('translate', 'This is my sister.', 'Esta é minha irmã.', ['This is my brother.', 'This is her sister.'], 'Sister é irmã. My identifica que ela é sua irmã quando você fala.'),
          question('listen', 'She lives in São Paulo.', 'Ela mora em São Paulo.', ['Ele mora em São Paulo.', 'Ela trabalha em São Paulo.'], 'Com she, he ou it, live vira lives no presente.'),
          question('translate', 'My brother likes music.', 'Meu irmão gosta de música.', ['My sister likes music.', 'My brother plays music.'], 'My brother equivale a he. Por isso like recebe s em “my brother likes”.'),
          question('listen', 'They have two children.', 'Eles têm dois filhos.', ['Eles têm três filhos.', 'Eles têm dois irmãos.'], 'Child é o singular. O plural é children.'),
          question('translate', 'Do you have any brothers or sisters?', 'Você tem irmãos ou irmãs?', ['Do they have any children?', 'How old is your sister?'], 'Any é comum em perguntas nas quais a quantidade pode ser zero. Brothers e sisters fazem a distinção de gênero.'),
          question('recall', 'My parents live nearby.', 'Meus pais moram perto.', ['My parents live far away.', 'My children live nearby.'], 'Parents quer dizer “pais”. Parentes em geral são relatives.', ['My parents live close by.', 'My parents live close.', 'My parents live near here.']),
        ]),
        lesson('rooms', 'Encontre as coisas', 'Diga onde estão os cômodos e objetos.', [
          question('translate', 'The keys are on the table.', 'As chaves estão em cima da mesa.', ['The keys are under the table.', 'The keys are by the window.'], 'On indica que as chaves estão sobre a superfície da mesa. Under significa “embaixo”.'),
          question('listen', "There's a chair by the window.", 'Tem uma cadeira perto da janela.', ['Tem uma janela perto da porta.', 'Tem uma cadeira perto da porta.'], 'There’s significa “tem” quando você apresenta algo no singular. By the window é “perto da janela”.'),
          question('translate', 'The bathroom is upstairs.', 'O banheiro fica no andar de cima.', ['The bathroom is downstairs.', 'The bedroom is upstairs.'], 'Upstairs indica o andar de cima. Downstairs indica o de baixo.'),
          question('listen', 'There are two bedrooms.', 'Tem dois quartos.', ['Tem dois banheiros.', 'Tem três quartos.'], 'Use there are para falar do que existe no plural. Bedroom é especificamente um quarto de dormir.'),
          question('translate', 'Is the door open?', 'A porta está aberta?', ['Is the window open?', 'Is the door closed?'], 'Para transformar “the door is open” em pergunta, passe is para o começo.'),
          question('recall', 'My bag is under the chair.', 'Minha bolsa está embaixo da cadeira.', ['My bag is on the chair.', 'My chair is by the window.'], 'Under indica uma posição mais baixa que a cadeira. My bag quer dizer “minha bolsa”.', ['My bag is underneath the chair.', 'My bag is beneath the chair.', 'My purse is under the chair.']),
        ]),
        lesson('clock', 'Combine horários', 'Pergunte as horas e marque um encontro.', [
          question('translate', 'What time is it?', 'Que horas são?', ['What day is it?', 'What time do we meet?'], 'Em inglês, use o singular it para perguntar e dizer as horas.'),
          question('listen', "It's half past seven.", 'São sete e meia.', ['São seis e meia.', 'São sete e quinze.'], 'Half past seven quer dizer meia hora depois das sete. Também se diz seven thirty.'),
          question('translate', 'The class starts at nine.', 'A aula começa às nove.', ['The class ends at nine.', 'The class starts at noon.'], 'Starts é “começa”. Use at nine para um horário definido.'),
          question('listen', 'I have lunch at noon.', 'Eu almoço ao meio-dia.', ['Eu almoço à noite.', 'Eu tomo café ao meio-dia.'], 'Noon é meio-dia. Midnight é meia-noite.'),
          question('translate', 'Are you free on Friday?', 'Você está livre na sexta-feira?', ['Are you free on Saturday?', 'Are you busy on Friday?'], 'Aqui free significa “livre” ou “disponível”. Com dias da semana, use on.'),
          question('recall', 'See you at five.', 'A gente se vê às cinco.', ['See you on Friday.', 'See you at six.'], 'See you at five confirma que vocês vão se ver às cinco. At marca o horário do encontro.', ["See you at five o'clock.", "I'll see you at five.", 'I will see you at five.', 'See you at 5.', "I'll see you at 5.", 'We will see each other at five.', "We'll see each other at five."]),
        ]),
      ],
    },
    {
      id: 'around-town',
      title: 'Na cidade',
      description: 'Peça um café, encontre um endereço e use o transporte.',
      lessons: [
        lesson('coffee-shop', 'Peça um café', 'Faça um pedido e converse no balcão.', [
          question('translate', "I'd like a coffee, please.", 'Eu gostaria de um café, por favor.', ["I'd like a tea, please.", "I'd like the check, please."], 'I’d like é a forma curta de I would like e suaviza o pedido.'),
          question('listen', 'For here or to go?', 'É para tomar aqui ou para levar?', ['É com leite ou sem leite?', 'É para pagar agora ou depois?'], 'For here é para consumir no local. To go é para levar.'),
          question('translate', 'A glass of water, please.', 'Um copo de água, por favor.', ['A cup of coffee, please.', 'A bottle of water, please.'], 'A glass costuma ser um copo. A bottle é uma garrafa.'),
          question('listen', 'Can I see the menu?', 'Posso ver o cardápio?', ['Posso ver a conta?', 'Posso fazer o pedido?'], 'Menu é cardápio. Can I… é uma forma comum de pedir algo.'),
          question('translate', "That's all, thanks.", 'É só isso, obrigado.', ["That's mine, thanks.", "That's OK, thanks."], 'That’s all sinaliza que você terminou de pedir.'),
          question('recall', 'Could we have the check?', 'Poderia trazer a conta para nós?', ['Could we have the menu?', 'Could we have some water?'], 'Nos EUA, peça the check. The bill também funciona e é comum no inglês britânico.', ['Could we have the bill?', 'Can we have the check?', 'Can we have the bill?', 'Could we get the check?', 'Can we get the check?', 'Can we get the bill?', 'Could you bring us the check?', 'Could you bring us the bill?', 'Can you bring us the check?', 'Can you bring us the bill?']),
        ]),
        lesson('directions', 'Pergunte o caminho', 'Entenda instruções para chegar a um lugar.', [
          question('translate', "Where's the train station?", 'Onde fica a estação de trem?', ["Where's the bus station?", "Where's the pharmacy?"], 'Where’s é a forma curta de where is, usada para perguntar onde algo fica.'),
          question('listen', 'Turn left at the corner.', 'Vire à esquerda na esquina.', ['Vire à direita na esquina.', 'Siga reto até a esquina.'], 'Turn left é “vire à esquerda”. Corner é a esquina.'),
          question('translate', 'Go straight ahead.', 'Siga em frente.', ['Turn right.', 'Go back.'], 'Straight ahead indica o caminho reto à sua frente.'),
          question('listen', "It's next to the bank.", 'Fica ao lado do banco.', ['Fica em frente ao banco.', 'Fica atrás do banco.'], 'Next to significa ao lado. Across from significa do outro lado, de frente.'),
          question('translate', 'Is it far from here?', 'Fica longe daqui?', ['Is it near here?', 'Is it open now?'], 'Far é longe. From here dá o ponto de referência: daqui.'),
          question('recall', 'The pharmacy is across from the park.', 'A farmácia fica do outro lado da rua, em frente ao parque.', ['The pharmacy is next to the park.', 'The pharmacy is behind the park.'], 'Across from descreve algo do outro lado, de frente para o ponto de referência.', ['The pharmacy is opposite the park.', 'The pharmacy is across the street from the park.', 'The drugstore is across from the park.', 'The pharmacy is right across from the park.']),
        ]),
        lesson('shopping', 'Faça uma compra', 'Confira preços, tamanhos e formas de pagamento.', [
          question('translate', 'How much is this?', 'Quanto custa isto?', ['How much is that?', 'What size is this?'], 'How much pergunta o preço. This aponta para algo perto de você.'),
          question('listen', 'Do you take cards?', 'Vocês aceitam cartão?', ['Vocês aceitam dinheiro?', 'Vocês têm troco?'], 'Em uma loja, take cards significa “aceitar pagamento com cartão”.'),
          question('translate', "I'm just looking, thanks.", 'Estou só olhando, obrigado.', ["I'm looking for a shirt, thanks.", "I'm ready to pay, thanks."], 'Just enfatiza que você está apenas olhando. Looking for indica que procura algo específico.'),
          question('listen', 'Do you have a smaller size?', 'Tem um tamanho menor?', ['Tem um tamanho maior?', 'Tem de outra cor?'], 'Smaller compara tamanho e significa “menor”. Bigger significa “maior”.'),
          question('translate', "That's too expensive.", 'Isso está caro demais.', ["That's very cheap.", "That's a good price."], 'Too marca excesso: too expensive quer dizer mais caro do que você aceita pagar.'),
          question('recall', "I'll take it.", 'Vou levar. (decisão de compra)', ["I'll try it on.", "I'm just looking."], 'I’ll é I will. I’ll take it comunica que você acabou de decidir comprar.', ['I will take it.', "I'll buy it.", 'I will buy it.', "I'll get it."]),
        ]),
        lesson('transport', 'Pegue o transporte', 'Compre uma passagem e confirme sua rota.', [
          question('translate', 'One ticket to Boston, please.', 'Uma passagem para Boston, por favor.', ['Two tickets to Boston, please.', 'One ticket from Boston, please.'], 'Ticket pode ser passagem ou ingresso. To indica o destino.'),
          question('listen', 'Which platform is it?', 'Qual é a plataforma?', ['Qual é o portão?', 'Qual é o preço?'], 'Platform é o lugar onde você espera o trem. Which ajuda a escolher entre opções.'),
          question('translate', 'Does this bus go downtown?', 'Este ônibus vai para o centro?', ['Does this bus go to the airport?', 'Does this train go downtown?'], 'Downtown é o centro da cidade no inglês americano. Depois de does, use go.'),
          question('listen', 'The next train leaves at ten.', 'O próximo trem sai às dez.', ['O último trem chega às dez.', 'O próximo trem sai às nove.'], 'Leaves é “sai” ou “parte”. Arrives é “chega”.'),
          question('translate', 'I need to get off here.', 'Preciso descer aqui.', ['I need to get on here.', 'I need to get off later.'], 'Get off é descer do transporte. Get on é embarcar no ônibus ou trem.'),
          question('recall', 'How long does it take?', 'Quanto tempo leva?', ['How much does it cost?', 'How far is it?'], 'How long aqui se refere à duração. How much perguntaria o preço.', ['How long will it take?', 'How much time does it take?']),
        ]),
      ],
    },
    {
      id: 'plans-and-stories',
      title: 'Planos e histórias',
      description: 'Marque um encontro, fale do futuro e conte como foi seu dia.',
      lessons: [
        lesson('invitations', 'Faça um convite', 'Chame alguém, sugira um dia e combine o horário.', [
          question('translate', 'Would you like to come with us?', 'Você gostaria de vir com a gente?', ['Would you like to go alone?', 'Would you like to stay here?'], 'Would you like to… é uma forma educada de convidar. With us significa “com a gente”.'),
          question('listen', "I can't make it tonight.", 'Não posso ir hoje à noite.', ['Posso ir hoje à noite.', 'Só posso ir amanhã de manhã.'], 'Make it pode significar “conseguir comparecer”. Tonight é hoje à noite.'),
          question('translate', "Let's get some coffee.", 'Vamos tomar um café.', ["Let's make dinner.", "Let's get some water."], 'Let’s é uma forma de sugerir fazer algo juntos.'),
          question('listen', 'How about Saturday?', 'Que tal sábado?', ['Que tal domingo?', 'Você está livre hoje?'], 'How about… introduz uma sugestão. Aqui, a sugestão é Saturday.'),
          question('translate', 'That sounds great.', 'Parece ótimo.', ['That sounds strange.', 'That looks expensive.'], 'Sounds reage a uma ideia que alguém acabou de dizer, mesmo sem falar de um som literal.'),
          question('recall', 'What time should we meet?', 'A que horas devemos nos encontrar?', ['Where should we meet?', 'What time should we leave?'], 'Comece com what time para perguntar a que horas. Depois de should we, use meet.', ['What time shall we meet?', 'What time do we meet?', 'What time are we meeting?']),
        ]),
        lesson('future-plans', 'Conte seus planos', 'Use going to para falar de intenções e previsões.', [
          question('translate', "I'm going to visit my family.", 'Vou visitar minha família.', ["I'm going to call my family.", "I'm going to visit my friend."], 'Use am, is ou are antes de going to, seguido do verbo principal.'),
          question('listen', "It's going to rain.", 'Vai chover.', ['Está chovendo.', 'Vai nevar.'], 'Mesmo falando do tempo, o inglês pede um sujeito: it.'),
          question('translate', "We're going to cook dinner.", 'Vamos preparar o jantar.', ["We're going to buy dinner.", "We're going to cook lunch."], 'We’re é we are. Aqui, cook dinner significa fazer o jantar.'),
          question('listen', 'Are you going to work tomorrow?', 'Você vai trabalhar amanhã?', ['Você está trabalhando hoje?', 'Você vai trabalhar hoje?'], 'Para fazer a pergunta, mova are para a frente de you.'),
          question('translate', "They're going to arrive late.", 'Eles vão chegar tarde.', ["They're going to leave late.", "They're going to arrive early."], 'Arrive significa chegar. Late indica uma chegada tarde ou atrasada.'),
          question('recall', "I'm not going to drive.", 'Não vou dirigir. (falando de um plano)', ["I'm not going to walk.", "I'm going to drive."], 'Na negativa, not vem depois de am, is ou are. Depois de going to, use drive.', ['I am not going to drive.', "I won't drive.", 'I will not drive.', "I'm not planning to drive."]),
        ]),
        lesson('yesterday', 'Fale de ontem', 'Conte o que você fez e pergunte sobre o dia de alguém.', [
          question('translate', 'I watched a movie last night.', 'Eu vi um filme ontem à noite.', ['I watched a movie this morning.', 'I read a book last night.'], 'Watch recebe -ed no passado. Last night é “ontem à noite”.'),
          question('listen', 'She went to the beach.', 'Ela foi à praia.', ['Ela foi ao parque.', 'Ele foi à praia.'], 'Went é o passado irregular de go. To indica o destino.'),
          question('translate', 'We had lunch together.', 'Nós almoçamos juntos.', ['We had dinner together.', 'They had lunch together.'], 'Had é o passado irregular de have. Together é “juntos”.'),
          question('listen', 'Did you call me?', 'Você me ligou?', ['Você me viu?', 'Você recebeu minha ligação?'], 'Em perguntas sobre o passado, did já marca o tempo. Por isso o verbo permanece call.'),
          question('translate', "I didn't see your message.", 'Eu não vi sua mensagem.', ["I didn't send your message.", "I didn't see your email."], 'Didn’t marca a negativa no passado. Use see depois de didn’t.'),
          question('recall', 'What did you do yesterday?', 'O que você fez ontem?', ['What did you do today?', 'What did you see yesterday?'], 'O primeiro did marca o passado na pergunta. O segundo verbo, do, quer dizer “fazer”.'),
        ]),
        lesson('short-stories', 'Conte como foi', 'Narre uma viagem curta com começo, meio e fim.', [
          question('translate', 'I missed the bus.', 'Eu perdi o ônibus.', ['I took the bus.', 'I missed the train.'], 'Miss the bus é perder o ônibus no sentido de não conseguir embarcar a tempo.'),
          question('listen', 'The hotel was near the station.', 'O hotel ficava perto da estação.', ['O hotel ficava perto do aeroporto.', 'O hotel ficava longe da estação.'], 'Was é uma forma passada de be. Near significa “perto”.'),
          question('translate', 'I bought a ticket online.', 'Eu comprei uma passagem pela internet.', ['I bought a ticket at the station.', 'I booked a hotel online.'], 'Bought é o passado irregular de buy. Online indica que a compra foi pela internet.'),
          question('listen', 'It took two hours.', 'Levou duas horas.', ['Levou três horas.', 'Levou dois dias.'], 'Took é o passado de take. Com uma duração, it took significa “levou”.'),
          question('translate', 'Then we went home.', 'Depois fomos para casa.', ['Then we went downtown.', 'First we went home.'], 'Then ajuda a ordenar os acontecimentos. Go home não usa to.'),
          question('recall', 'I had a great time.', 'Eu me diverti muito.', ['I had a hard time.', 'I had plenty of time.'], 'Have a great time é se divertir muito. No passado, have vira had.', ['I had a really good time.', 'I had a good time.', 'I had so much fun.', 'I had a lot of fun.', 'I really enjoyed myself.', 'I really enjoyed it.']),
        ]),
      ],
    },
  ],
}
