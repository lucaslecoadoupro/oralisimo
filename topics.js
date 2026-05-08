// =============================================
// ORALÍSIMO — BANQUE DE SUJETS
// =============================================
// Structure de chaque sujet :
// {
//   id: string,
//   type: 'situation' | 'debat',
//   title: string,
//   desc: string,
//   vocab: string[]   // mots clés pour ce thème
// }

const DEFAULT_TOPICS = {
  "5eme": [
    {
      id: "5e-s1",
      type: "situation",
      title: "¡ Un día en España !",
      desc: "Tu es en vacances à Madrid. Tu demandes ton chemin à un passant pour aller au musée del Prado.",
      vocab: ["el museo", "la calle", "girar", "todo recto", "a la derecha", "a la izquierda", "perdona", "¿dónde está?"]
    },
    {
      id: "5e-s2",
      type: "situation",
      title: "En el mercado",
      desc: "Tu fais les courses au marché. Tu achètes des fruits, demandes les prix et essaies de négocier.",
      vocab: ["¿cuánto cuesta?", "un kilo de", "más barato", "el precio", "la fruta", "la verdura", "pagar", "el cambio"]
    },
    {
      id: "5e-s3",
      type: "situation",
      title: "Reservar una habitación",
      desc: "Tu appelles un hôtel à Barcelone pour réserver une chambre pour ta famille.",
      vocab: ["reservar", "la habitación", "doble", "individual", "el precio", "el desayuno", "la fecha", "disponible"]
    },
    {
      id: "5e-d1",
      type: "debat",
      title: "¿ Internet o libros ?",
      desc: "Pour apprendre et travailler, vaut-il mieux utiliser Internet ou les livres ? Donnez vos arguments.",
      vocab: ["según yo", "creo que", "prefiero", "porque", "sin embargo", "los libros", "internet", "aprender"]
    },
    {
      id: "5e-d2",
      type: "debat",
      title: "¿ Animales en casa ?",
      desc: "Certains pensent que les animaux ne devraient pas vivre en appartement. Êtes-vous d'accord ?",
      vocab: ["la mascota", "el perro", "el gato", "vivir", "el espacio", "la responsabilidad", "cuidar", "estar de acuerdo"]
    },
    {
      id: "5e-s4",
      type: "situation",
      title: "Mi rutina diaria",
      desc: "Décris ta routine quotidienne : le matin, l'après-midi, le soir. Parle de tes habitudes.",
      vocab: ["levantarse", "desayunar", "el colegio", "comer", "hacer los deberes", "cenar", "acostarse", "siempre"]
    },
    {
      id: "5e-d3",
      type: "debat",
      title: "¿ Smartphones en el colegio ?",
      desc: "Les téléphones portables devraient-ils être autorisés en classe ? Débat ouvert.",
      vocab: ["el móvil", "prohibir", "permitir", "distraerse", "comunicarse", "útil", "peligroso", "depender"]
    }
  ],
  "3eme": [
    {
      id: "3e-d1",
      type: "debat",
      title: "¿ El cambio climático : responsabilidad individual o colectiva ?",
      desc: "Chaque individu doit-il changer son mode de vie, ou est-ce aux gouvernements et entreprises d'agir ?",
      vocab: ["el medio ambiente", "responsabilidad", "el gobierno", "las empresas", "el consumidor", "reducir", "las emisiones", "el compromiso"]
    },
    {
      id: "3e-d2",
      type: "debat",
      title: "¿ Redes sociales : ¿ libertad o peligro ?",
      desc: "Les réseaux sociaux sont-ils un outil de liberté d'expression ou une menace pour la société ?",
      vocab: ["las redes sociales", "la libertad de expresión", "la privacidad", "manipular", "influir", "la fake news", "la adicción", "el impacto"]
    },
    {
      id: "3e-s1",
      type: "situation",
      title: "Entrevista de trabajo",
      desc: "Tu passes un entretien d'embauche pour un job d'été dans une entreprise espagnole. Prépare-toi !",
      vocab: ["la entrevista", "las habilidades", "la experiencia", "trabajar en equipo", "los puntos fuertes", "disponible", "motivado", "el salario"]
    },
    {
      id: "3e-d3",
      type: "debat",
      title: "¿ Turismo masivo : enriquecimiento o destrucción ?",
      desc: "Le tourisme de masse enrichit les régions mais détruit leur identité. Comment trouver l'équilibre ?",
      vocab: ["el turismo", "la cultura local", "el impacto", "el patrimonio", "la economía", "el desarrollo sostenible", "respetar", "el turista"]
    },
    {
      id: "3e-s2",
      type: "situation",
      title: "Debate político estudiantil",
      desc: "Tu participes à un conseil des élèves. Tu défends une proposition pour améliorer la vie au collège.",
      vocab: ["proponer", "la propuesta", "los derechos", "el delegado", "mejorar", "la comunidad", "votar", "apoyar"]
    },
    {
      id: "3e-d4",
      type: "debat",
      title: "¿ La inteligencia artificial : amiga o enemiga ?",
      desc: "L'IA va-t-elle améliorer nos vies ou nous rendre dépendants ? Quels risques, quelles opportunités ?",
      vocab: ["la inteligencia artificial", "automatizar", "el empleo", "la creatividad", "el futuro", "depender", "innovar", "los datos"]
    },
    {
      id: "3e-s3",
      type: "situation",
      title: "Explicar un proyecto cultural",
      desc: "Tu présentes à la classe un projet culturel hispanique que tu as découvert (musique, art, cinéma...).",
      vocab: ["el proyecto", "la cultura", "inspirar", "el artista", "la obra", "el impacto social", "el mensaje", "representar"]
    }
  ]
};

// =============================================
// AIDE À LA COMMUNICATION (commune à tous)
// =============================================
const COMM_AIDE = [
  {
    cat: "Donner son avis",
    phrases: ["Según yo… / Para mí…", "Creo que… / Pienso que…", "En mi opinión…", "Estoy convencido/a de que…"]
  },
  {
    cat: "Nuancer / Contredire",
    phrases: ["Sin embargo… / Pero…", "Por otro lado…", "No estoy de acuerdo porque…", "Tienes razón, pero…"]
  },
  {
    cat: "Demander la parole",
    phrases: ["¿Puedo añadir algo?", "Perdona, quiero decir que…", "¿Me dejas hablar?", "Para completar lo que dijiste…"]
  },
  {
    cat: "Structurer",
    phrases: ["Primero… luego… finalmente…", "Por una parte… por otra…", "Por ejemplo…", "En conclusión…"]
  }
];
