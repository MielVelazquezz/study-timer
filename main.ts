import {
  App,
  ItemView,
  Modal,
  Notice,
  Plugin,
  PluginSettingTab,
  Setting,
  TFile,
  WorkspaceLeaf,
  moment,
  normalizePath,
} from "obsidian";

const VIEW_TYPE_YPT = "ypt-timer-view";

type TimerMode = "stopwatch" | "pomodoro";
type PomodoroPhase = "focus" | "break";

type Locale = "pt" | "en" | "es";

interface Strings {
  appTitle: string;
  modeStopwatch: string;
  modePomodoro: string;
  studyingNow: string;
  phaseFocus: string;
  phaseBreak: string;
  pomoFocusLabel: string;
  pomoBreakLabel: string;
  statToday: string;
  statWeek: string;
  statMonth: string;
  breakdownTitle: string;
  breakdownEmpty: string;
  heatmapTitle: string;
  newSubjectPlaceholder: string;
  addSubjectBtn: string;
  colorOfSubject: (nome: string) => string;
  removeSubject: (nome: string) => string;
  colorOfNewSubject: string;
  noticeDuplicateSubject: string;
  noticeKeepOneSubject: string;
  noticeFrontmatterError: string;
  ribbonTooltip: string;
  commandName: string;
  viewDisplayText: string;
  settingsTitle: string;
  settingsSubjectsName: string;
  settingsSubjectsDesc: string;
  settingsFocusName: string;
  settingsFocusDesc: string;
  settingsBreakName: string;
  settingsBreakDesc: string;
  settingsSoundName: string;
  settingsSoundDesc: string;
  settingsSoundTestBtn: string;
  settingsFmKeyName: string;
  settingsFmKeyDesc: string;
  settingsLanguageName: string;
  settingsLanguageDesc: string;
  settingsLanguagePt: string;
  settingsLanguageEn: string;
  settingsLanguageEs: string;
  openCalendarBtn: string;
  calendarPrevAria: string;
  calendarNextAria: string;
  calendarTodayBtn: string;
  weekdays: string[];
  monthNames: string[];
  studiedSectionTitle: string;
  studiedEmpty: string;
  agendaSectionTitle: string;
  agendaEmpty: string;
  agendaPlaceholder: string;
  agendaAddBtn: string;
  agendaRemoveAria: string;
  agendaDoneAria: string;
}

const STRINGS: Record<Locale, Strings> = {
  pt: {
    appTitle: "Estudo",
    modeStopwatch: "Cronômetro",
    modePomodoro: "Pomodoro",
    studyingNow: "Estudando agora",
    phaseFocus: "🎯 Foco",
    phaseBreak: "☕ Descanso",
    pomoFocusLabel: "Foco",
    pomoBreakLabel: "Descanso",
    statToday: "Hoje",
    statWeek: "Semana",
    statMonth: "Mês",
    breakdownTitle: "Hoje por assunto",
    breakdownEmpty: "Nada registrado ainda hoje.",
    heatmapTitle: "Últimos dias",
    newSubjectPlaceholder: "Novo assunto",
    addSubjectBtn: "Adicionar",
    colorOfSubject: (nome) => `Cor de ${nome}`,
    removeSubject: (nome) => `Remover ${nome}`,
    colorOfNewSubject: "Cor do novo assunto",
    noticeDuplicateSubject: "Já existe um assunto com esse nome.",
    noticeKeepOneSubject: "Mantenha pelo menos um assunto.",
    noticeFrontmatterError: "Não foi possível salvar na Nota Diária (veja o console).",
    ribbonTooltip: "Abrir cronômetro de estudos",
    commandName: "Abrir painel de cronômetro de estudos",
    viewDisplayText: "Estudo",
    settingsTitle: "Study Timer",
    settingsSubjectsName: "Assuntos",
    settingsSubjectsDesc: "Crie, remova e escolha a cor de cada assunto direto no painel do cronômetro.",
    settingsFocusName: "Duração do foco (Pomodoro)",
    settingsFocusDesc: "Minutos de foco por ciclo.",
    settingsBreakName: "Duração do descanso (Pomodoro)",
    settingsBreakDesc: "Minutos de descanso por ciclo.",
    settingsSoundName: "Som de alerta (Pomodoro)",
    settingsSoundDesc: "Toca um beep quando o tempo de foco ou de descanso acaba.",
    settingsSoundTestBtn: "Testar",
    settingsFmKeyName: "Propriedade no frontmatter",
    settingsFmKeyDesc: "Nome da propriedade com o tempo estudado (em minutos). É gravada só se a Nota Diária de hoje já existir; o plugin nunca cria a nota.",
    settingsLanguageName: "Idioma",
    settingsLanguageDesc: "Idioma da interface do plugin.",
    settingsLanguagePt: "Português",
    settingsLanguageEn: "English",
    settingsLanguageEs: "Español",
    openCalendarBtn: "Ver calendário",
    calendarPrevAria: "Mês anterior",
    calendarNextAria: "Próximo mês",
    calendarTodayBtn: "Hoje",
    weekdays: ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"],
    monthNames: [
      "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
    ],
    studiedSectionTitle: "Estudado",
    studiedEmpty: "Nada estudado nesse dia.",
    agendaSectionTitle: "Agenda",
    agendaEmpty: "Nenhum item na agenda.",
    agendaPlaceholder: "Novo item da agenda",
    agendaAddBtn: "Adicionar",
    agendaRemoveAria: "Remover item da agenda",
    agendaDoneAria: "Marcar como feito",
  },
  en: {
    appTitle: "Study",
    modeStopwatch: "Stopwatch",
    modePomodoro: "Pomodoro",
    studyingNow: "Studying now",
    phaseFocus: "Focus",
    phaseBreak: "Break",
    pomoFocusLabel: "Focus",
    pomoBreakLabel: "Break",
    statToday: "Today",
    statWeek: "Week",
    statMonth: "Month",
    breakdownTitle: "Today by subject",
    breakdownEmpty: "Nothing recorded yet today.",
    heatmapTitle: "Last days",
    newSubjectPlaceholder: "New subject",
    addSubjectBtn: "Add",
    colorOfSubject: (nome) => `Color of ${nome}`,
    removeSubject: (nome) => `Remove ${nome}`,
    colorOfNewSubject: "Color of the new subject",
    noticeDuplicateSubject: "A subject with that name already exists.",
    noticeKeepOneSubject: "Keep at least one subject.",
    noticeFrontmatterError: "Could not save to the Daily Note (see console).",
    ribbonTooltip: "Open study timer",
    commandName: "Open study timer panel",
    viewDisplayText: "Study",
    settingsTitle: "Study Timer",
    settingsSubjectsName: "Subjects",
    settingsSubjectsDesc: "Create, remove and pick a color for each subject directly in the timer panel.",
    settingsFocusName: "Focus duration (Pomodoro)",
    settingsFocusDesc: "Focus minutes per cycle.",
    settingsBreakName: "Break duration (Pomodoro)",
    settingsBreakDesc: "Break minutes per cycle.",
    settingsSoundName: "Alert sound (Pomodoro)",
    settingsSoundDesc: "Plays a beep when the focus or break time ends.",
    settingsSoundTestBtn: "Test",
    settingsFmKeyName: "Frontmatter property",
    settingsFmKeyDesc: "Name of the property with the studied time (in minutes). It's only written if today's Daily Note already exists; the plugin never creates the note.",
    settingsLanguageName: "Language",
    settingsLanguageDesc: "Plugin interface language.",
    settingsLanguagePt: "Português",
    settingsLanguageEn: "English",
    settingsLanguageEs: "Español",
    openCalendarBtn: "View calendar",
    calendarPrevAria: "Previous month",
    calendarNextAria: "Next month",
    calendarTodayBtn: "Today",
    weekdays: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    monthNames: [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December",
    ],
    studiedSectionTitle: "Studied",
    studiedEmpty: "Nothing studied that day.",
    agendaSectionTitle: "Agenda",
    agendaEmpty: "No agenda items.",
    agendaPlaceholder: "New agenda item",
    agendaAddBtn: "Add",
    agendaRemoveAria: "Remove agenda item",
    agendaDoneAria: "Mark as done",
  },
  es: {
    appTitle: "Estudio",
    modeStopwatch: "Cronómetro",
    modePomodoro: "Pomodoro",
    studyingNow: "Estudiando ahora",
    phaseFocus: "Enfoque",
    phaseBreak: "Descanso",
    pomoFocusLabel: "Enfoque",
    pomoBreakLabel: "Descanso",
    statToday: "Hoy",
    statWeek: "Semana",
    statMonth: "Mes",
    breakdownTitle: "Hoy por tema",
    breakdownEmpty: "Aún no hay nada registrado hoy.",
    heatmapTitle: "Últimos días",
    newSubjectPlaceholder: "Nuevo tema",
    addSubjectBtn: "Agregar",
    colorOfSubject: (nome) => `Color de ${nome}`,
    removeSubject: (nome) => `Eliminar ${nome}`,
    colorOfNewSubject: "Color del nuevo tema",
    noticeDuplicateSubject: "Ya existe un tema con ese nombre.",
    noticeKeepOneSubject: "Mantén al menos un tema.",
    noticeFrontmatterError: "No se pudo guardar en la nota diaria (revisa la consola).",
    ribbonTooltip: "Abrir cronómetro de estudio",
    commandName: "Abrir panel del cronómetro de estudio",
    viewDisplayText: "Estudio",
    settingsTitle: "Study Timer",
    settingsSubjectsName: "Temas",
    settingsSubjectsDesc: "Crea, elimina y elige el color de cada tema directamente en el panel del cronómetro.",
    settingsFocusName: "Duración del enfoque (Pomodoro)",
    settingsFocusDesc: "Minutos de enfoque por ciclo.",
    settingsBreakName: "Duración del descanso (Pomodoro)",
    settingsBreakDesc: "Minutos de descanso por ciclo.",
    settingsSoundName: "Sonido de alerta (Pomodoro)",
    settingsSoundDesc: "Reproduce un pitido cuando termina el tiempo de enfoque o de descanso.",
    settingsSoundTestBtn: "Probar",
    settingsFmKeyName: "Propiedad en el frontmatter",
    settingsFmKeyDesc: "Nombre de la propiedad con el tiempo estudiado (en minutos). Solo se escribe si la nota diaria de hoy ya existe; el plugin nunca crea la nota.",
    settingsLanguageName: "Idioma",
    settingsLanguageDesc: "Idioma de la interfaz del plugin.",
    settingsLanguagePt: "Português",
    settingsLanguageEn: "English",
    settingsLanguageEs: "Español",
    openCalendarBtn: "Ver Calendario",
    calendarPrevAria: "Mes anterior",
    calendarNextAria: "Mes siguiente",
    calendarTodayBtn: "Hoy",
    weekdays: ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"],
    monthNames: [
      "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
      "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
    ],
    studiedSectionTitle: "Estudiado",
    studiedEmpty: "No se estudió nada ese día.",
    agendaSectionTitle: "Agenda",
    agendaEmpty: "No hay elementos en la agenda.",
    agendaPlaceholder: "Nuevo elemento de la agenda",
    agendaAddBtn: "Agregar",
    agendaRemoveAria: "Eliminar elemento de la agenda",
    agendaDoneAria: "Marcar como hecho",
  },
};

function isLocale(value: unknown): value is Locale {
  return value === "pt" || value === "en" || value === "es";
}

function pickInitialLocale(): Locale {
  try {
    const lang = (window.localStorage.getItem("language") || "").toLowerCase();
    if (lang.startsWith("pt")) return "pt";
    if (lang.startsWith("es")) return "es";
  } catch (e) {
  }
  return "en";
}

interface Assunto {
  nome: string;
  cor: string;
}

// cores de indicação 
const PALETA_ASSUNTOS = [
  "#e06c75",
  "#e5a45c",
  "#e5c07b",
  "#98c379",
  "#4fd1c5",
  "#61afef",
  "#a78bfa",
  "#c678dd",
  "#f472b6",
  "#94a3b8",
];

interface YPTSettings {
  pomodoroFocusMinutes: number;
  pomodoroBreakMinutes: number;
  pomodoroSound: boolean;
  mode: TimerMode;
  frontmatterKey: string;
  assuntos: Assunto[];
  lastMateria: string;
  materiasDisponiveis?: string[];
  language: Locale;
}

const DEFAULT_SETTINGS: YPTSettings = {
  pomodoroFocusMinutes: 25,
  pomodoroBreakMinutes: 5,
  pomodoroSound: true,
  mode: "stopwatch",
  frontmatterKey: "tempo_estudo",
  assuntos: [{ nome: "Geral", cor: PALETA_ASSUNTOS[4] }],
  lastMateria: "Geral",
  language: "en",
};

function normalizarNome(nome: string): string {
  return nome.trim().replace(/\s+/g, " ");
}

function corValida(cor: unknown): cor is string {
  return typeof cor === "string" && /^#[0-9a-fA-F]{6}$/.test(cor);
}

interface DailyEntry {
  total: number;
  materias: { [materia: string]: number };
}

interface AgendaItem {
  id: string;
  texto: string;
  feito: boolean;
}

interface DailyLog {
  [dateKey: string]: DailyEntry;
}

interface YPTData {
  settings: YPTSettings;
  dailyLog: DailyLog;
  agenda: { [dateKey: string]: AgendaItem[] };
}

const DEFAULT_DATA: YPTData = {
  settings: DEFAULT_SETTINGS,
  dailyLog: {},
  agenda: {},
};


export default class YPTStudyTimerPlugin extends Plugin {
  settings: YPTSettings;
  dailyLog: DailyLog;
  agenda: { [dateKey: string]: AgendaItem[] } = {};
  private audioCtx: AudioContext | null = null;

  get locale(): Locale {
    return isLocale(this.settings.language) ? this.settings.language : "en";
  }

  get str(): Strings {
    return STRINGS[this.locale];
  }

  async onload() {
    await this.loadPluginData();

    this.registerView(VIEW_TYPE_YPT, (leaf) => new YPTView(leaf, this));

    this.addRibbonIcon("timer", this.str.ribbonTooltip, () => {
      this.activateView();
    });

    this.addCommand({
      id: "open-ypt-timer",
      name: this.str.commandName,
      callback: () => this.activateView(),
    });

    this.addSettingTab(new YPTSettingTab(this.app, this));
  }

  onunload() {
    this.audioCtx?.close().catch(() => {});
    this.audioCtx = null;
  }

 
  prepareAudio() {
    try {
      if (!this.audioCtx) {
        const Ctx = window.AudioContext || (window as any).webkitAudioContext;
        if (!Ctx) return;
        this.audioCtx = new Ctx();
      }
      if (this.audioCtx.state === "suspended") this.audioCtx.resume();
    } catch (e) {
      console.error("Study Timer: áudio indisponível", e);
    }
  }

  playBeep(force = false) {
    if (!force && !this.settings.pomodoroSound) return;
    this.prepareAudio();
    const ctx = this.audioCtx;
    if (!ctx) return;

    const inicio = ctx.currentTime + 0.05;
    for (let i = 0; i < 3; i++) {
      const t = inicio + i * 0.3;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 880;

      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.25, t + 0.01);
      gain.gain.setValueAtTime(0.25, t + 0.14);
      gain.gain.linearRampToValueAtTime(0, t + 0.16);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.18);
    }
  }

  async activateView() {
    const { workspace } = this.app;
    let leaf: WorkspaceLeaf | null = null;
    const existing = workspace.getLeavesOfType(VIEW_TYPE_YPT);

    if (existing.length > 0) {
      leaf = existing[0];
    } else {
      leaf = workspace.getRightLeaf(false);
      await leaf?.setViewState({ type: VIEW_TYPE_YPT, active: true });
    }

    if (leaf) workspace.revealLeaf(leaf);
  }

  refreshOpenViews() {
    for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE_YPT)) {
      const view = leaf.view;
      if (view instanceof YPTView) view.refreshLocale();
    }
  }

  async loadPluginData() {
    const stored = (await this.loadData()) as Partial<YPTData> | null;
    this.settings = Object.assign({}, DEFAULT_SETTINGS, stored?.settings);

    this.settings.assuntos = this.migrarAssuntos(stored?.settings);
    delete this.settings.materiasDisponiveis;
    if (!this.settings.assuntos.some((a) => a.nome === this.settings.lastMateria)) {
      this.settings.lastMateria = this.settings.assuntos[0].nome;
    }
    const idiomaSalvo = stored?.settings?.language as unknown;
    const idiomaMigrado = !isLocale(idiomaSalvo);
    if (idiomaMigrado) {
      this.settings.language = pickInitialLocale();
    }

    const rawLog = (stored?.dailyLog ?? {}) as Record<string, unknown>;
    const migrated: DailyLog = {};
    for (const key of Object.keys(rawLog)) {
      const value = rawLog[key];
      if (typeof value === "number") {
        migrated[key] = { total: value, materias: {} };
      } else if (value && typeof value === "object") {
        const v = value as Partial<DailyEntry>;
        migrated[key] = {
          total: typeof v.total === "number" ? v.total : 0,
          materias: v.materias ?? {},
        };
      }
    }
    this.dailyLog = migrated;

    const rawAgenda = (stored?.agenda ?? {}) as Record<string, unknown>;
    const migratedAgenda: { [key: string]: AgendaItem[] } = {};
    for (const key of Object.keys(rawAgenda)) {
      const arr = rawAgenda[key];
      if (Array.isArray(arr)) {
        migratedAgenda[key] = arr.filter(
          (i): i is AgendaItem =>
            !!i && typeof i.id === "string" && typeof i.texto === "string" && typeof i.feito === "boolean"
        );
      }
    }
    this.agenda = migratedAgenda;

    if (idiomaMigrado) await this.persist();
  }

  private migrarAssuntos(saved: Partial<YPTSettings> | undefined): Assunto[] {
    const lista: Assunto[] = [];
    const vistos = new Set<string>();
    const add = (nomeBruto: string, cor?: unknown) => {
      const nome = normalizarNome(nomeBruto);
      if (!nome || vistos.has(nome.toLowerCase())) return;
      vistos.add(nome.toLowerCase());
      lista.push({
        nome,
        cor: corValida(cor) ? cor : PALETA_ASSUNTOS[lista.length % PALETA_ASSUNTOS.length],
      });
    };

    if (Array.isArray(saved?.assuntos)) {
      for (const a of saved!.assuntos) {
        if (a && typeof a.nome === "string") add(a.nome, a.cor);
      }
    } else if (Array.isArray(saved?.materiasDisponiveis)) {
      for (const nome of saved!.materiasDisponiveis) {
        if (typeof nome === "string") add(nome);
      }
    }

    if (lista.length === 0) add("Geral", PALETA_ASSUNTOS[4]);
    return lista;
  }

  async persist() {
    const data: YPTData = { settings: this.settings, dailyLog: this.dailyLog, agenda: this.agenda };
    await this.saveData(data);
  }

  /* ---------------- Integração com a Nota Diária ---------------- */

  private getDailyNoteConfig(): { folder: string; format: string } {
    // @ts-ignore - API interna não tipada oficialmente
    const internal = this.app.internalPlugins?.getPluginById?.("daily-notes");
    const options = internal?.instance?.options;
    if (options?.format || options?.folder) {
      return {
        folder: options.folder ? String(options.folder).trim() : "",
        format: options.format ? String(options.format) : "YYYY-MM-DD",
      };
    }
    return { folder: "", format: "YYYY-MM-DD" };
  }

  private todayKey(): string {
    return moment().format("YYYY-MM-DD");
  }

  private weekKey(): string {
    return moment().format("GGGG-[W]WW");
  }

  private monthKey(): string {
    return moment().format("YYYY-MM");
  }

  getTodayNote(): TFile | null {
    const { folder, format } = this.getDailyNoteConfig();
    const fileName = moment().format(format) + ".md";
    const path = normalizePath(folder ? `${folder}/${fileName}` : fileName);
    const file = this.app.vault.getAbstractFileByPath(path);
    return file instanceof TFile ? file : null;
  }

  async addMinutesToday(minutos: number, materia: string) {
    if (minutos <= 0) return;

    const key = this.todayKey();
    const entry = this.dailyLog[key] ?? { total: 0, materias: {} };
    entry.total += minutos;
    entry.materias[materia] = (entry.materias[materia] ?? 0) + minutos;
    this.dailyLog[key] = entry;
    await this.persist();

    await this.syncTodayNote(entry);
  }

  private async syncTodayNote(entry: DailyEntry) {
    const file = this.getTodayNote();
    if (!file) return;

    try {
      const materiaFmKey = `${this.settings.frontmatterKey}_materias`;
      await this.app.fileManager.processFrontMatter(file, (fm) => {
        fm[this.settings.frontmatterKey] = entry.total;
        fm[materiaFmKey] = { ...entry.materias };
      });
    } catch (e) {
      console.error("Study Timer: falha ao gravar na Nota Diária", e);
      new Notice(this.str.noticeFrontmatterError);
    }
  }

  /* ---------------- Assuntos ---------------- */

  getCorAssunto(nome: string): string {
    return this.settings.assuntos.find((a) => a.nome === nome)?.cor ?? "var(--text-faint)";
  }

  proximaCor(): string {
    const usadas = new Set(this.settings.assuntos.map((a) => a.cor.toLowerCase()));
    const livre = PALETA_ASSUNTOS.find((c) => !usadas.has(c));
    return livre ?? PALETA_ASSUNTOS[this.settings.assuntos.length % PALETA_ASSUNTOS.length];
  }

  async addAssunto(nomeBruto: string, cor: string): Promise<"ok" | "vazio" | "duplicado"> {
    const nome = normalizarNome(nomeBruto);
    if (!nome) return "vazio";
    if (this.settings.assuntos.some((a) => a.nome.toLowerCase() === nome.toLowerCase())) {
      return "duplicado";
    }
    this.settings.assuntos.push({ nome, cor: corValida(cor) ? cor : this.proximaCor() });
    await this.persist();
    return "ok";
  }

  async removeAssunto(nome: string) {
    this.settings.assuntos = this.settings.assuntos.filter((a) => a.nome !== nome);
    await this.persist();
  }

  async setCorAssunto(nome: string, cor: string) {
    const assunto = this.settings.assuntos.find((a) => a.nome === nome);
    if (!assunto || !corValida(cor)) return;
    assunto.cor = cor;
    await this.persist();
  }

  /* ---------------- Estatísticas ---------------- */

  getTodayMateriaMinutes(nome: string): number {
    return this.dailyLog[this.todayKey()]?.materias[nome] ?? 0;
  }

  getTodayMinutes(): number {
    return this.dailyLog[this.todayKey()]?.total ?? 0;
  }

  getWeekMinutes(): number {
    const wk = this.weekKey();
    let total = 0;
    for (const key of Object.keys(this.dailyLog)) {
      if (moment(key, "YYYY-MM-DD").format("GGGG-[W]WW") === wk) {
        total += this.dailyLog[key].total;
      }
    }
    return total;
  }

  getMonthMinutes(): number {
    const mk = this.monthKey();
    let total = 0;
    for (const key of Object.keys(this.dailyLog)) {
      if (key.startsWith(mk)) total += this.dailyLog[key].total;
    }
    return total;
  }

  getTodayBreakdown(): { materia: string; minutos: number }[] {
    const entry = this.dailyLog[this.todayKey()];
    if (!entry) return [];
    return Object.entries(entry.materias)
      .map(([materia, minutos]) => ({ materia, minutos }))
      .sort((a, b) => b.minutos - a.minutos);
  }

  /* ---------------- Agenda ---------------- */

  getAgenda(dateKey: string): AgendaItem[] {
    return this.agenda[dateKey] ?? [];
  }

  async addAgendaItem(dateKey: string, textoBruto: string) {
    const texto = textoBruto.trim();
    if (!texto) return;
    const lista = this.agenda[dateKey] ?? [];
    lista.push({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      texto,
      feito: false,
    });
    this.agenda[dateKey] = lista;
    await this.persist();
  }

  async toggleAgendaItem(dateKey: string, id: string) {
    const item = this.agenda[dateKey]?.find((i) => i.id === id);
    if (!item) return;
    item.feito = !item.feito;
    await this.persist();
  }

  async removeAgendaItem(dateKey: string, id: string) {
    const lista = this.agenda[dateKey];
    if (!lista) return;
    this.agenda[dateKey] = lista.filter((i) => i.id !== id);
    await this.persist();
  }
}

class YPTView extends ItemView {
  plugin: YPTStudyTimerPlugin;

  // estado do timer
  private running = false;
  private pending: { [assunto: string]: number } = {};
  private pomodoroPhase: PomodoroPhase = "focus";
  private pomodoroRemaining = 0; // segundos restantes da fase atual
  private intervalId: number | null = null;
  private selectedMateria: string;

  private timeEl: HTMLElement;
  private phaseEl: HTMLElement;
  private playBtn: HTMLElement;
  private ringEl: HTMLElement;
  private progressFill: HTMLElement;
  private statTodayEl: HTMLElement;
  private statWeekEl: HTMLElement;
  private statMonthEl: HTMLElement;
  private heatmapEl: HTMLElement;
  private breakdownEl: HTMLElement;
  private assuntosEl: HTMLElement;
  private subjectDotEl: HTMLElement;
  private subjectNameEl: HTMLElement;
  private subjectTimeEl: HTMLElement;

  constructor(leaf: WorkspaceLeaf, plugin: YPTStudyTimerPlugin) {
    super(leaf);
    this.plugin = plugin;
    const nomes = plugin.settings.assuntos.map((a) => a.nome);
    this.selectedMateria = nomes.includes(plugin.settings.lastMateria)
      ? plugin.settings.lastMateria
      : nomes[0];
  }

  private get str(): Strings {
    return this.plugin.str;
  }

  getViewType() { return VIEW_TYPE_YPT; }
  getDisplayText() { return this.str.viewDisplayText; }
  getIcon() { return "timer"; }

  async onOpen() {
    this.pomodoroRemaining = this.plugin.settings.pomodoroFocusMinutes * 60;
    this.render();
  }

  async onClose() {
    await this.flushSession();
    if (this.intervalId) window.clearInterval(this.intervalId);
  }

  refreshLocale() {
    this.render();
  }

  /* ------------------------- Render principal ------------------------- */

  private render() {
    const root = this.containerEl.children[1] as HTMLElement;
    root.empty();
    root.addClass("ypt-root");

    const header = root.createDiv({ cls: "ypt-header" });
    header.createEl("span", { text: this.str.appTitle, cls: "ypt-title" });

    const modeToggle = header.createDiv({ cls: "ypt-mode-toggle" });
    const stopwatchBtn = modeToggle.createEl("button", {
      text: this.str.modeStopwatch,
      cls: this.plugin.settings.mode === "stopwatch" ? "ypt-mode-active" : "",
    });
    const pomodoroBtn = modeToggle.createEl("button", {
      text: this.str.modePomodoro,
      cls: this.plugin.settings.mode === "pomodoro" ? "ypt-mode-active" : "",
    });
    stopwatchBtn.onclick = () => this.switchMode("stopwatch");
    pomodoroBtn.onclick = () => this.switchMode("pomodoro");

    const assuntosWrap = root.createDiv({ cls: "ypt-assuntos-wrap" });
    assuntosWrap.createEl("label", { text: this.str.studyingNow, cls: "ypt-materia-label" });
    this.assuntosEl = assuntosWrap.createDiv({ cls: "ypt-assuntos" });
    this.renderAssuntos();

    this.phaseEl = root.createDiv({ cls: "ypt-phase-badge" });
    this.updatePhaseBadge();

    const timerCard = root.createDiv({ cls: "ypt-timer-card" });

    const ring = timerCard.createDiv({ cls: "ypt-ring" });
    this.ringEl = ring;
    this.progressFill = ring.createDiv({ cls: "ypt-ring-fill" });
    const timeWrap = ring.createDiv({ cls: "ypt-ring-center" });
    this.timeEl = timeWrap.createDiv({ cls: "ypt-time" });

    const subjectLine = timerCard.createDiv({ cls: "ypt-current-subject" });
    this.subjectDotEl = subjectLine.createSpan({ cls: "ypt-subject-dot" });
    this.subjectNameEl = subjectLine.createSpan({ cls: "ypt-current-subject-name" });
    this.subjectTimeEl = subjectLine.createSpan({ cls: "ypt-current-subject-time" });

    this.playBtn = timerCard.createDiv({ cls: "ypt-play-btn" });
    this.playBtn.setText(this.running ? "❚❚" : "▶");
    this.playBtn.onclick = () => this.toggleRunning();

    if (this.plugin.settings.mode === "pomodoro") {
      const cfg = timerCard.createDiv({ cls: "ypt-pomo-config" });
      this.buildPomodoroConfigInput(cfg, this.str.pomoFocusLabel, this.plugin.settings.pomodoroFocusMinutes, async (v) => {
        this.plugin.settings.pomodoroFocusMinutes = v;
        await this.plugin.persist();
        if (!this.running && this.pomodoroPhase === "focus") {
          this.pomodoroRemaining = v * 60;
          this.updateDisplay();
        }
      });
      this.buildPomodoroConfigInput(cfg, this.str.pomoBreakLabel, this.plugin.settings.pomodoroBreakMinutes, async (v) => {
        this.plugin.settings.pomodoroBreakMinutes = v;
        await this.plugin.persist();
        if (!this.running && this.pomodoroPhase === "break") {
          this.pomodoroRemaining = v * 60;
          this.updateDisplay();
        }
      });
    }

    const statsRow = root.createDiv({ cls: "ypt-stats-row" });
    this.statTodayEl = this.buildStatCard(statsRow, this.str.statToday);
    this.statWeekEl = this.buildStatCard(statsRow, this.str.statWeek);
    this.statMonthEl = this.buildStatCard(statsRow, this.str.statMonth);

    root.createEl("div", { text: this.str.breakdownTitle, cls: "ypt-section-label" });
    this.breakdownEl = root.createDiv({ cls: "ypt-materia-breakdown" });

    root.createEl("div", { text: this.str.heatmapTitle, cls: "ypt-section-label" });
    this.heatmapEl = root.createDiv({ cls: "ypt-heatmap" });

    const calWrap = root.createDiv({ cls: "ypt-cal-open-wrap" });
    const calBtn = calWrap.createEl("button", { text: this.str.openCalendarBtn, cls: "ypt-cal-open-btn" });
    calBtn.onclick = () => new CalendarModal(this.plugin.app, this.plugin).open();

    this.updateDisplay();
    this.renderHeatmap();
    this.renderBreakdown();
  }

  /* ------------------------- Assuntos ------------------------- */

  private renderAssuntos() {
    this.assuntosEl.empty();

    const lista = this.assuntosEl.createDiv({ cls: "ypt-assuntos-list" });
    for (const assunto of this.plugin.settings.assuntos) {
      const row = lista.createDiv({ cls: "ypt-assunto-row" });
      row.style.setProperty("--ypt-assunto-cor", assunto.cor);
      row.toggleClass("ypt-assunto-selected", assunto.nome === this.selectedMateria);

      const corInput = row.createEl("input", { type: "color", cls: "ypt-assunto-color" });
      corInput.value = assunto.cor;
      corInput.setAttr("aria-label", this.str.colorOfSubject(assunto.nome));
      corInput.onclick = (e) => e.stopPropagation();
      corInput.oninput = () => row.style.setProperty("--ypt-assunto-cor", corInput.value);
      corInput.onchange = async () => {
        await this.plugin.setCorAssunto(assunto.nome, corInput.value);
        this.updateCurrentSubject();
        this.renderBreakdown();
      };

      row.createSpan({ text: assunto.nome, cls: "ypt-assunto-nome" });

      const remover = row.createEl("button", { text: "×", cls: "ypt-assunto-del" });
      remover.setAttr("aria-label", this.str.removeSubject(assunto.nome));
      remover.onclick = (e) => {
        e.stopPropagation();
        this.removerAssunto(assunto.nome);
      };

      row.onclick = () => this.selecionarAssunto(assunto.nome);
    }

    const addRow = this.assuntosEl.createDiv({ cls: "ypt-assunto-add" });
    const corNovo = addRow.createEl("input", { type: "color", cls: "ypt-assunto-color" });
    corNovo.value = this.plugin.proximaCor();
    corNovo.setAttr("aria-label", this.str.colorOfNewSubject);
    const nomeNovo = addRow.createEl("input", {
      type: "text",
      cls: "ypt-assunto-input",
      placeholder: this.str.newSubjectPlaceholder,
    });
    const addBtn = addRow.createEl("button", { text: this.str.addSubjectBtn, cls: "ypt-assunto-add-btn" });

    const adicionar = async () => {
      const nome = normalizarNome(nomeNovo.value);
      const resultado = await this.plugin.addAssunto(nome, corNovo.value);
      if (resultado === "duplicado") {
        new Notice(this.str.noticeDuplicateSubject);
      } else if (resultado === "ok") {
        await this.selecionarAssunto(nome); // ja deixa o novo assunto selecionado
      } else {
        nomeNovo.focus();
      }
    };
    addBtn.onclick = adicionar;
    nomeNovo.onkeydown = (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        adicionar();
      }
    };
  }

  private async selecionarAssunto(nome: string) {
    if (nome === this.selectedMateria) return;

    this.selectedMateria = nome;
    this.plugin.settings.lastMateria = nome;
    this.renderAssuntos();
    this.updateDisplay();
    await this.flushSession();
    await this.plugin.persist();
  }

  private async removerAssunto(nome: string) {
    if (this.plugin.settings.assuntos.length <= 1) {
      new Notice(this.str.noticeKeepOneSubject);
      return;
    }
    await this.flushSession(); 
    delete this.pending[nome]; 
    await this.plugin.removeAssunto(nome);

    if (this.selectedMateria === nome) {
      this.selectedMateria = this.plugin.settings.assuntos[0].nome;
      this.plugin.settings.lastMateria = this.selectedMateria;
      await this.plugin.persist();
    }
    this.renderAssuntos();
    this.renderBreakdown();
    this.updateDisplay();
  }

  private buildStatCard(parent: HTMLElement, label: string): HTMLElement {
    const card = parent.createDiv({ cls: "ypt-stat-card" });
    card.createDiv({ cls: "ypt-stat-value", text: "0h 0m" });
    card.createDiv({ cls: "ypt-stat-label", text: label });
    return card.querySelector(".ypt-stat-value") as HTMLElement;
  }

  private buildPomodoroConfigInput(
    parent: HTMLElement,
    label: string,
    value: number,
    onChange: (v: number) => void
  ) {
    const wrap = parent.createDiv({ cls: "ypt-pomo-input-wrap" });
    wrap.createEl("label", { text: label });
    const input = wrap.createEl("input", { type: "number" }) as HTMLInputElement;
    input.value = String(value);
    input.min = "1";
    input.onchange = () => {
      const v = Math.max(1, parseInt(input.value) || 1);
      input.value = String(v);
      onChange(v);
    };
  }

  // ------------------------- timer ------------------------- 

  private switchMode(mode: TimerMode) {
    if (this.running) this.toggleRunning(); // pausa antes de trocar
    this.plugin.settings.mode = mode;
    this.plugin.persist();
    this.pomodoroPhase = "focus";
    this.pomodoroRemaining = this.plugin.settings.pomodoroFocusMinutes * 60;
    this.render();
  }

  private toggleRunning() {
    this.running = !this.running;
    this.playBtn.setText(this.running ? "❚❚" : "▶");

    if (this.running) {
      if (this.plugin.settings.mode === "pomodoro") this.plugin.prepareAudio();
      this.intervalId = window.setInterval(() => this.tick(), 1000);
      this.registerInterval(this.intervalId);
    } else {
      if (this.intervalId) window.clearInterval(this.intervalId);
      this.flushSession();
    }
  }

  private addPending(segundos: number) {
    this.pending[this.selectedMateria] = (this.pending[this.selectedMateria] ?? 0) + segundos;
  }

  private get pendingTotal(): number {
    let total = 0;
    for (const nome of Object.keys(this.pending)) total += this.pending[nome];
    return total;
  }

  private tick() {
    if (this.plugin.settings.mode === "stopwatch") {
      this.addPending(1);
    } else {
      // Pomodoro
      if (this.pomodoroPhase === "focus") {
        this.addPending(1);
      }
      this.pomodoroRemaining--;
      if (this.pomodoroRemaining <= 0) {
        this.onPomodoroPhaseEnd();
      }
    }
    this.updateDisplay();
  }

  private async onPomodoroPhaseEnd() {
    this.plugin.playBeep();
    await this.flushSession();

    if (this.pomodoroPhase === "focus") {
      this.pomodoroPhase = "break";
      this.pomodoroRemaining = this.plugin.settings.pomodoroBreakMinutes * 60;
    } else {
      this.pomodoroPhase = "focus";
      this.pomodoroRemaining = this.plugin.settings.pomodoroFocusMinutes * 60;
    }
    this.updatePhaseBadge();
  }

  private updatePhaseBadge() {
    if (!this.phaseEl) return;
    if (this.plugin.settings.mode === "pomodoro") {
      this.phaseEl.setText(this.pomodoroPhase === "focus" ? this.str.phaseFocus : this.str.phaseBreak);
      this.phaseEl.toggleClass("ypt-phase-break", this.pomodoroPhase === "break");
      this.phaseEl.show();
    } else {
      this.phaseEl.hide();
    }
  }

  private async flushSession() {
    let gravou = false;
    for (const nome of Object.keys(this.pending)) {
      const minutos = Math.floor(this.pending[nome] / 60);
      if (minutos <= 0) continue;
      this.pending[nome] -= minutos * 60;
      await this.plugin.addMinutesToday(minutos, nome);
      gravou = true;
    }
    if (gravou) {
      this.updateStats();
      this.renderHeatmap();
      this.renderBreakdown();
    }
  }

  private updateDisplay() {
    if (!this.timeEl) return;

    if (this.plugin.settings.mode === "stopwatch") {
      const totalSeconds = this.plugin.getTodayMinutes() * 60 + this.pendingTotal;
      this.timeEl.setText(this.formatHMS(totalSeconds));
      this.ringEl.style.setProperty("--ypt-progress", "1");
    } else {
      this.timeEl.setText(this.formatMS(this.pomodoroRemaining));
      const total = this.pomodoroPhase === "focus"
        ? this.plugin.settings.pomodoroFocusMinutes * 60
        : this.plugin.settings.pomodoroBreakMinutes * 60;
      const progress = total > 0 ? 1 - this.pomodoroRemaining / total : 0;
      this.ringEl.style.setProperty("--ypt-progress", String(progress));
    }
    this.updateCurrentSubject();
    this.updateStats();
  }

  private updateCurrentSubject() {
    if (!this.subjectNameEl) return;
    const nome = this.selectedMateria;
    const segundos = this.plugin.getTodayMateriaMinutes(nome) * 60 + (this.pending[nome] ?? 0);
    this.subjectDotEl.style.background = this.plugin.getCorAssunto(nome);
    this.subjectNameEl.setText(nome);
    this.subjectTimeEl.setText(this.formatHMS(segundos));
  }

  private updateStats() {
    if (!this.statTodayEl) return;
    this.statTodayEl.setText(this.formatHM(this.plugin.getTodayMinutes()));
    this.statWeekEl.setText(this.formatHM(this.plugin.getWeekMinutes()));
    this.statMonthEl.setText(this.formatHM(this.plugin.getMonthMinutes()));
  }

  private renderBreakdown() {
    if (!this.breakdownEl) return;
    this.breakdownEl.empty();

    const dados = this.plugin.getTodayBreakdown();
    if (dados.length === 0) {
      this.breakdownEl.createDiv({ cls: "ypt-materia-empty", text: this.str.breakdownEmpty });
      return;
    }

    for (const { materia, minutos } of dados) {
      const row = this.breakdownEl.createDiv({ cls: "ypt-materia-row" });
      const nome = row.createSpan({ cls: "ypt-materia-nome" });
      const dot = nome.createSpan({ cls: "ypt-subject-dot" });
      dot.style.background = this.plugin.getCorAssunto(materia);
      nome.createSpan({ text: materia });
      row.createSpan({ text: this.formatHM(minutos), cls: "ypt-materia-tempo" });
    }
  }

  private renderHeatmap() {
    if (!this.heatmapEl) return;
    this.heatmapEl.empty();

    const dias = 84; //12 semanas
    const hoje = moment();
    const totais = Object.values(this.plugin.dailyLog).map((e) => e.total);
    const max = Math.max(1, ...totais);

    for (let i = dias - 1; i >= 0; i--) {
      const dia = hoje.clone().subtract(i, "days");
      const key = dia.format("YYYY-MM-DD");
      const minutos = this.plugin.dailyLog[key]?.total ?? 0;
      const intensidade = minutos === 0 ? 0 : Math.min(4, Math.ceil((minutos / max) * 4));

      const cell = this.heatmapEl.createDiv({ cls: `ypt-heat-cell ypt-heat-${intensidade}` });
      cell.setAttr("title", `${dia.format("DD/MM/YYYY")} — ${this.formatHM(minutos)}`);
    }
  }

  /* ------------------------- Formatação ------------------------- */

  private formatHMS(totalSeconds: number): string {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  private formatMS(totalSeconds: number): string {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  private formatHM(totalMinutes: number): string {
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${h}h ${m}m`;
  }
}

class YPTSettingTab extends PluginSettingTab {
  plugin: YPTStudyTimerPlugin;

  constructor(app: App, plugin: YPTStudyTimerPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    const str = this.plugin.str;
    containerEl.empty();
    containerEl.createEl("h2", { text: str.settingsTitle });

    new Setting(containerEl)
      .setName(str.settingsLanguageName)
      .setDesc(str.settingsLanguageDesc)
      .addDropdown((dropdown) =>
        dropdown
          .addOption("pt", str.settingsLanguagePt)
          .addOption("en", str.settingsLanguageEn)
          .addOption("es", str.settingsLanguageEs)
          .setValue(this.plugin.settings.language)
          .onChange(async (value) => {
            this.plugin.settings.language = value as Locale;
            await this.plugin.persist();
            this.plugin.refreshOpenViews();
            this.display(); // recarrega a própria aba de configurações no novo idioma
          })
      );

    new Setting(containerEl)
      .setName(str.settingsSubjectsName)
      .setDesc(str.settingsSubjectsDesc);

    new Setting(containerEl)
      .setName(str.settingsFocusName)
      .setDesc(str.settingsFocusDesc)
      .addText((text) =>
        text
          .setValue(String(this.plugin.settings.pomodoroFocusMinutes))
          .onChange(async (value) => {
            const v = parseInt(value);
            if (!isNaN(v) && v > 0) {
              this.plugin.settings.pomodoroFocusMinutes = v;
              await this.plugin.persist();
            }
          })
      );

    new Setting(containerEl)
      .setName(str.settingsBreakName)
      .setDesc(str.settingsBreakDesc)
      .addText((text) =>
        text
          .setValue(String(this.plugin.settings.pomodoroBreakMinutes))
          .onChange(async (value) => {
            const v = parseInt(value);
            if (!isNaN(v) && v > 0) {
              this.plugin.settings.pomodoroBreakMinutes = v;
              await this.plugin.persist();
            }
          })
      );

    new Setting(containerEl)
      .setName(str.settingsSoundName)
      .setDesc(str.settingsSoundDesc)
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.pomodoroSound).onChange(async (value) => {
          this.plugin.settings.pomodoroSound = value;
          await this.plugin.persist();
        })
      )
      .addButton((btn) =>
        btn.setButtonText(str.settingsSoundTestBtn).onClick(() => this.plugin.playBeep(true))
      );

    new Setting(containerEl)
      .setName(str.settingsFmKeyName)
      .setDesc(str.settingsFmKeyDesc)
      .addText((text) =>
        text
          .setValue(this.plugin.settings.frontmatterKey)
          .onChange(async (value) => {
            if (value.trim()) {
              this.plugin.settings.frontmatterKey = value.trim();
              await this.plugin.persist();
            }
          })
      );
  }
}

/* ------------------------------------------------------------------ */
/*  Calendário (modal)                                                */
/* ------------------------------------------------------------------ */

class CalendarModal extends Modal {
  plugin: YPTStudyTimerPlugin;

  private current: any; // moment.Moment do 1º dia do mês visível
  private selected: string; // data selecionada, formato YYYY-MM-DD

  private headerLabelEl: HTMLElement;
  private gridEl: HTMLElement;
  private detailEl: HTMLElement;

  constructor(app: App, plugin: YPTStudyTimerPlugin) {
    super(app);
    this.plugin = plugin;
    this.current = moment().startOf("month");
    this.selected = moment().format("YYYY-MM-DD");
  }

  private get str(): Strings {
    return this.plugin.str;
  }

  onOpen() {
    this.modalEl.addClass("ypt-calendar-modal");
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("ypt-cal-root");

    const header = contentEl.createDiv({ cls: "ypt-cal-header" });
    const prevBtn = header.createEl("button", { text: "‹", cls: "ypt-cal-nav" });
    prevBtn.setAttr("aria-label", this.str.calendarPrevAria);
    this.headerLabelEl = header.createDiv({ cls: "ypt-cal-title" });
    const nextBtn = header.createEl("button", { text: "›", cls: "ypt-cal-nav" });
    nextBtn.setAttr("aria-label", this.str.calendarNextAria);
    const todayBtn = header.createEl("button", { text: this.str.calendarTodayBtn, cls: "ypt-cal-today-btn" });

    prevBtn.onclick = () => {
      this.current = this.current.clone().subtract(1, "month");
      this.renderGrid();
    };
    nextBtn.onclick = () => {
      this.current = this.current.clone().add(1, "month");
      this.renderGrid();
    };
    todayBtn.onclick = () => {
      this.current = moment().startOf("month");
      this.selected = moment().format("YYYY-MM-DD");
      this.renderGrid();
      this.renderDetail();
    };

    const weekdaysRow = contentEl.createDiv({ cls: "ypt-cal-weekdays" });
    for (const wd of this.str.weekdays) {
      weekdaysRow.createDiv({ cls: "ypt-cal-weekday", text: wd });
    }

    this.gridEl = contentEl.createDiv({ cls: "ypt-cal-grid" });
    this.detailEl = contentEl.createDiv({ cls: "ypt-cal-detail" });

    this.renderGrid();
    this.renderDetail();
  }

  onClose() {
    this.contentEl.empty();
  }

  private renderGrid() {
    this.headerLabelEl.setText(`${this.str.monthNames[this.current.month()]} ${this.current.year()}`);
    this.gridEl.empty();

    const start = this.current.clone().startOf("month").startOf("week");
    const end = this.current.clone().endOf("month").endOf("week");
    const todayKey = moment().format("YYYY-MM-DD");

    let cur = start.clone();
    while (cur.isSameOrBefore(end, "day")) {
      const key = cur.format("YYYY-MM-DD");
      const cell = this.gridEl.createDiv({ cls: "ypt-cal-cell" });
      cell.toggleClass("ypt-cal-outside", cur.month() !== this.current.month());
      cell.toggleClass("ypt-cal-today", key === todayKey);
      cell.toggleClass("ypt-cal-selected", key === this.selected);

      cell.createDiv({ cls: "ypt-cal-daynum", text: String(cur.date()) });

      const dotsRow = cell.createDiv({ cls: "ypt-cal-dots" });
      const entry = this.plugin.dailyLog[key];
      if (entry) {
        for (const materia of Object.keys(entry.materias).slice(0, 6)) {
          const dot = dotsRow.createDiv({ cls: "ypt-cal-dot" });
          dot.style.background = this.plugin.getCorAssunto(materia);
        }
      }

      if (this.plugin.getAgenda(key).some((i) => !i.feito)) {
        cell.createDiv({ cls: "ypt-cal-agenda-flag" });
      }

      const diaClicado = cur.clone();
      cell.onclick = () => {
        this.selected = key;
        if (diaClicado.month() !== this.current.month()) {
          this.current = diaClicado.clone().startOf("month");
        }
        this.renderGrid();
        this.renderDetail();
      };

      cur = cur.clone().add(1, "day");
    }
  }

  private renderDetail() {
    this.detailEl.empty();
    const dia = moment(this.selected, "YYYY-MM-DD");

    this.detailEl.createEl("div", {
      cls: "ypt-cal-detail-date",
      text: `${dia.date()} ${this.str.monthNames[dia.month()]} ${dia.year()}`,
    });

    this.detailEl.createEl("div", { cls: "ypt-section-label", text: this.str.studiedSectionTitle });
    const studiedWrap = this.detailEl.createDiv({ cls: "ypt-materia-breakdown" });
    const entry = this.plugin.dailyLog[this.selected];
    const materias = entry
      ? Object.entries(entry.materias).sort((a, b) => b[1] - a[1])
      : [];
    if (materias.length === 0) {
      studiedWrap.createDiv({ cls: "ypt-materia-empty", text: this.str.studiedEmpty });
    } else {
      for (const [nome, minutos] of materias) {
        const row = studiedWrap.createDiv({ cls: "ypt-materia-row" });
        const nomeEl = row.createSpan({ cls: "ypt-materia-nome" });
        const dot = nomeEl.createSpan({ cls: "ypt-subject-dot" });
        dot.style.background = this.plugin.getCorAssunto(nome);
        nomeEl.createSpan({ text: nome });
        row.createSpan({ cls: "ypt-materia-tempo", text: this.formatHM(minutos) });
      }
    }

    this.detailEl.createEl("div", { cls: "ypt-section-label", text: this.str.agendaSectionTitle });
    const agendaWrap = this.detailEl.createDiv({ cls: "ypt-agenda-list" });
    const itens = this.plugin.getAgenda(this.selected);
    if (itens.length === 0) {
      agendaWrap.createDiv({ cls: "ypt-materia-empty", text: this.str.agendaEmpty });
    } else {
      for (const item of itens) {
        const row = agendaWrap.createDiv({ cls: "ypt-agenda-row" });
        row.toggleClass("ypt-agenda-done", item.feito);

        const checkbox = row.createEl("input", { type: "checkbox" });
        checkbox.checked = item.feito;
        checkbox.setAttr("aria-label", this.str.agendaDoneAria);
        checkbox.onchange = async () => {
          await this.plugin.toggleAgendaItem(this.selected, item.id);
          this.renderDetail();
          this.renderGrid();
        };

        row.createSpan({ text: item.texto, cls: "ypt-agenda-text" });

        const del = row.createEl("button", { text: "×", cls: "ypt-assunto-del" });
        del.setAttr("aria-label", this.str.agendaRemoveAria);
        del.onclick = async () => {
          await this.plugin.removeAgendaItem(this.selected, item.id);
          this.renderDetail();
          this.renderGrid();
        };
      }
    }

    const addRow = this.detailEl.createDiv({ cls: "ypt-assunto-add" });
    const input = addRow.createEl("input", {
      type: "text",
      cls: "ypt-assunto-input",
      placeholder: this.str.agendaPlaceholder,
    });
    const addBtn = addRow.createEl("button", { text: this.str.agendaAddBtn, cls: "ypt-assunto-add-btn" });

    const adicionar = async () => {
      const texto = input.value.trim();
      if (!texto) return;
      await this.plugin.addAgendaItem(this.selected, texto);
      input.value = "";
      this.renderDetail();
      this.renderGrid();
    };
    addBtn.onclick = adicionar;
    input.onkeydown = (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        adicionar();
      }
    };
  }

  private formatHM(totalMinutes: number): string {
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${h}h ${m}m`;
  }
}
