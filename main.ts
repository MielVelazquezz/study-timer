import {
  App,
  ItemView,
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
}

const DEFAULT_SETTINGS: YPTSettings = {
  pomodoroFocusMinutes: 25,
  pomodoroBreakMinutes: 5,
  pomodoroSound: true,
  mode: "stopwatch",
  frontmatterKey: "tempo_estudo",
  assuntos: [{ nome: "Geral", cor: PALETA_ASSUNTOS[4] }],
  lastMateria: "Geral",
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

interface DailyLog {
  [dateKey: string]: DailyEntry;
}

interface YPTData {
  settings: YPTSettings;
  dailyLog: DailyLog;
}

const DEFAULT_DATA: YPTData = {
  settings: DEFAULT_SETTINGS,
  dailyLog: {},
};


export default class YPTStudyTimerPlugin extends Plugin {
  settings: YPTSettings;
  dailyLog: DailyLog;
  private audioCtx: AudioContext | null = null;

  async onload() {
    await this.loadPluginData();

    this.registerView(VIEW_TYPE_YPT, (leaf) => new YPTView(leaf, this));

    this.addRibbonIcon("timer", "Abrir cronômetro de estudos", () => {
      this.activateView();
    });

    this.addCommand({
      id: "open-ypt-timer",
      name: "Abrir painel de cronômetro de estudos",
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
      console.error("YPT Study Timer: áudio indisponível", e);
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

  async loadPluginData() {
    const stored = (await this.loadData()) as Partial<YPTData> | null;
    this.settings = Object.assign({}, DEFAULT_SETTINGS, stored?.settings);

    this.settings.assuntos = this.migrarAssuntos(stored?.settings);
    delete this.settings.materiasDisponiveis;
    if (!this.settings.assuntos.some((a) => a.nome === this.settings.lastMateria)) {
      this.settings.lastMateria = this.settings.assuntos[0].nome;
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
    const data: YPTData = { settings: this.settings, dailyLog: this.dailyLog };
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

  /** Copia o total do dia (log interno) para o frontmatter, só se a nota já existir. */
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
      new Notice("Não foi possível salvar na Nota Diária (veja o console).");
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

  getViewType() { return VIEW_TYPE_YPT; }
  getDisplayText() { return "Estudo"; }
  getIcon() { return "timer"; }

  async onOpen() {
    this.pomodoroRemaining = this.plugin.settings.pomodoroFocusMinutes * 60;
    this.render();
  }

  async onClose() {
    await this.flushSession();
    if (this.intervalId) window.clearInterval(this.intervalId);
  }

  /* ------------------------- Render principal ------------------------- */

  private render() {
    const root = this.containerEl.children[1] as HTMLElement;
    root.empty();
    root.addClass("ypt-root");

    const header = root.createDiv({ cls: "ypt-header" });
    header.createEl("span", { text: "Estudo", cls: "ypt-title" });

    const modeToggle = header.createDiv({ cls: "ypt-mode-toggle" });
    const stopwatchBtn = modeToggle.createEl("button", {
      text: "Cronômetro",
      cls: this.plugin.settings.mode === "stopwatch" ? "ypt-mode-active" : "",
    });
    const pomodoroBtn = modeToggle.createEl("button", {
      text: "Pomodoro",
      cls: this.plugin.settings.mode === "pomodoro" ? "ypt-mode-active" : "",
    });
    stopwatchBtn.onclick = () => this.switchMode("stopwatch");
    pomodoroBtn.onclick = () => this.switchMode("pomodoro");

    const assuntosWrap = root.createDiv({ cls: "ypt-assuntos-wrap" });
    assuntosWrap.createEl("label", { text: "Estudando agora", cls: "ypt-materia-label" });
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
      this.buildPomodoroConfigInput(cfg, "Foco", this.plugin.settings.pomodoroFocusMinutes, async (v) => {
        this.plugin.settings.pomodoroFocusMinutes = v;
        await this.plugin.persist();
        if (!this.running && this.pomodoroPhase === "focus") {
          this.pomodoroRemaining = v * 60;
          this.updateDisplay();
        }
      });
      this.buildPomodoroConfigInput(cfg, "Descanso", this.plugin.settings.pomodoroBreakMinutes, async (v) => {
        this.plugin.settings.pomodoroBreakMinutes = v;
        await this.plugin.persist();
        if (!this.running && this.pomodoroPhase === "break") {
          this.pomodoroRemaining = v * 60;
          this.updateDisplay();
        }
      });
    }

    const statsRow = root.createDiv({ cls: "ypt-stats-row" });
    this.statTodayEl = this.buildStatCard(statsRow, "Hoje");
    this.statWeekEl = this.buildStatCard(statsRow, "Semana");
    this.statMonthEl = this.buildStatCard(statsRow, "Mês");

    root.createEl("div", { text: "Hoje por assunto", cls: "ypt-section-label" });
    this.breakdownEl = root.createDiv({ cls: "ypt-materia-breakdown" });

    root.createEl("div", { text: "Últimos dias", cls: "ypt-section-label" });
    this.heatmapEl = root.createDiv({ cls: "ypt-heatmap" });

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
      corInput.setAttr("aria-label", `Cor de ${assunto.nome}`);
      corInput.onclick = (e) => e.stopPropagation();
      corInput.oninput = () => row.style.setProperty("--ypt-assunto-cor", corInput.value);
      corInput.onchange = async () => {
        await this.plugin.setCorAssunto(assunto.nome, corInput.value);
        this.updateCurrentSubject();
        this.renderBreakdown();
      };

      row.createSpan({ text: assunto.nome, cls: "ypt-assunto-nome" });

      const remover = row.createEl("button", { text: "×", cls: "ypt-assunto-del" });
      remover.setAttr("aria-label", `Remover ${assunto.nome}`);
      remover.onclick = (e) => {
        e.stopPropagation();
        this.removerAssunto(assunto.nome);
      };

      row.onclick = () => this.selecionarAssunto(assunto.nome);
    }

    const addRow = this.assuntosEl.createDiv({ cls: "ypt-assunto-add" });
    const corNovo = addRow.createEl("input", { type: "color", cls: "ypt-assunto-color" });
    corNovo.value = this.plugin.proximaCor();
    corNovo.setAttr("aria-label", "Cor do novo assunto");
    const nomeNovo = addRow.createEl("input", {
      type: "text",
      cls: "ypt-assunto-input",
      placeholder: "Novo assunto",
    });
    const addBtn = addRow.createEl("button", { text: "Adicionar", cls: "ypt-assunto-add-btn" });

    const adicionar = async () => {
      const nome = normalizarNome(nomeNovo.value);
      const resultado = await this.plugin.addAssunto(nome, corNovo.value);
      if (resultado === "duplicado") {
        new Notice("Já existe um assunto com esse nome.");
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
      new Notice("Mantenha pelo menos um assunto.");
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
      this.phaseEl.setText(this.pomodoroPhase === "focus" ? "🎯 Foco" : "☕ Descanso");
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
      this.breakdownEl.createDiv({ cls: "ypt-materia-empty", text: "Nada registrado ainda hoje." });
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
    containerEl.empty();
    containerEl.createEl("h2", { text: "Study Timer" });

    new Setting(containerEl)
      .setName("Assuntos")
      .setDesc("Crie, remova e escolha a cor de cada assunto direto no painel do cronômetro.");

    new Setting(containerEl)
      .setName("Duração do foco (Pomodoro)")
      .setDesc("Minutos de foco por ciclo.")
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
      .setName("Duração do descanso (Pomodoro)")
      .setDesc("Minutos de descanso por ciclo.")
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
      .setName("Som de alerta (Pomodoro)")
      .setDesc("Toca um beep quando o tempo de foco ou de descanso acaba.")
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.pomodoroSound).onChange(async (value) => {
          this.plugin.settings.pomodoroSound = value;
          await this.plugin.persist();
        })
      )
      .addButton((btn) =>
        btn.setButtonText("Testar").onClick(() => this.plugin.playBeep(true))
      );

    new Setting(containerEl)
      .setName("Propriedade no frontmatter")
      .setDesc(
        "Nome da propriedade com o tempo estudado (em minutos). É gravada só se a Nota Diária de hoje já existir; o plugin nunca cria a nota."
      )
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
